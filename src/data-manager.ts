import dotenv from 'dotenv';
import { BatchMetadata as BatchMetadataModel, BatchStatus } from './models/BatchMetadata.js';
import { WeatherData } from './models/WeatherData.js';
import { WeatherApiClient } from './weather-api/index.js';
import { Batch, BatchMetadata, BatchMetadataResponse } from './weather-api/types.js';
import connectDB, { disconnectDB } from './config/database.js';
import { log } from './utils/logger.js';

dotenv.config();

const WEATHER_DATA_URL = 'https://us-east1-climacell-platform-production.cloudfunctions.net/weather-data';
const weatherApiClient = new WeatherApiClient(WEATHER_DATA_URL);

const getBatches = async () => {
    log.info({ message: 'Fetching batches from weather API' }, 'getBatches');
    const batches = await weatherApiClient.getBatches();
    return batches;
};

const setBatchCompleted = async (batchId: string) => {
    log.info({ message: 'Updating batch on last page', batchId }, 'onLastPage');
    const batchMetadata = await BatchMetadataModel.findOneAndUpdate({ batchId },
        {
            status: BatchStatus.ACTIVE,
            endIngestTime: new Date(),
        }, { new: true, lean: true });
    if (!batchMetadata) {
        log.error({ message: 'Failed to update batch on last page', batchId }, 'setBatchCompleted');
        return;
    }
    log.info({ message: 'Batch updated on last page', batchId }, 'setBatchCompleted');
};

const deleteBatchWeatherData = async (batchId: string) => {
    log.info({ message: 'Deleting batch weather data', batchId }, 'deleteBatchWeatherData');
    const deletedWeatherData = await WeatherData.deleteMany({ batchId });
    
    const batchMetadata = await BatchMetadataModel.findOneAndUpdate(
        { batchId },
        { isDeleted: true },
        { new: true, lean: true });

    if (!batchMetadata) {
        log.error({ message: 'Failed to update batch metadata', batchId }, 'deleteBatchWeatherData');
        return;
    }

    if (deletedWeatherData.deletedCount === 0) {
        log.warn({ message: 'No weather data found to delete (may have been already deleted)', batchId }, 'deleteBatchWeatherData');
        return;
    }

    log.info({ message: 'Successfully deleted batch weather data', batchId, deletedCount: deletedWeatherData.deletedCount }, 'deleteBatchWeatherData');
};

const is404Error = (error: any): boolean => {
    return error?.response?.status === 404 || 
           (error instanceof Error && error.message.includes('404')) ||
           (error instanceof Error && error.message.includes('status code 404'));
};

const handle404Error = async (error: any, batchId: string, context: string) => {
    log.warn({ 
        message: 'Batch became unavailable (404)', 
        batchId,
        context,
        error: error instanceof Error ? error.message : String(error)
    }, 'handle404Error');
    await cleanupFailedBatch(batchId);
    throw error;
};

const cleanupFailedBatch = async (batchId: string) => {
    log.info({ message: 'Cleaning up failed batch (became unavailable)', batchId }, 'cleanupFailedBatch');
    
    const deletedWeatherData = await WeatherData.deleteMany({ batchId });
    const batchMetadata = await BatchMetadataModel.findOneAndUpdate(
        { batchId },
        { 
            status: BatchStatus.INACTIVE,
            isDeleted: true,
            endIngestTime: new Date()
        },
        { new: true, lean: true });

    if (!batchMetadata) {
        log.warn({ message: 'Batch metadata not found for cleanup', batchId }, 'cleanupFailedBatch');
        return;
    }

    log.info({ 
        message: 'Successfully cleaned up failed batch', 
        batchId, 
        deletedWeatherDataCount: deletedWeatherData.deletedCount,
        numberOfRows: batchMetadata.numberOfRows
    }, 'cleanupFailedBatch');
};

const onLastPage = async (batchId: string) => {
    log.info({ message: 'Updating batch on last page', batchId }, 'onLastPage');
    await setBatchCompleted(batchId);
    const activeBatchesOrderedByForecastTime = await BatchMetadataModel.find({ status: BatchStatus.ACTIVE }).sort({ forecastTime: -1 });

    if (activeBatchesOrderedByForecastTime.length > 3) {
        const [ _one, _two, _three, ...rest ] = activeBatchesOrderedByForecastTime;
        const batchesToDelete = rest.map(batch => batch.batchId);
        await Promise.all(batchesToDelete.map(batchId => deleteBatchWeatherData(batchId)));
    }
};

const updateBatchIngestedRowsCount = async (batchId: string, numberOfRows: number) => {
    const batchMetadata = await BatchMetadataModel.findOneAndUpdate({ batchId }, { $inc: { numberOfRows: numberOfRows } }, { new: true });
    if (!batchMetadata) {
        log.error({ message: 'Failed to update batch ingested rows count', batchId, numberOfRows }, 'updateBatchIngestedRowsCount');
        return;
    }
};

const insertPageData = async (pageData: BatchMetadataResponse, batchId: string, forecastTime: Date) => {
    const { data, metadata } = pageData || {};
    const isLastPage = metadata.page === metadata.total_pages - 1;
    const normalizedData = data.map((item: any) => {
        const { latitude, longitude, temperature, precipitation_rate, humidity } = item || {};
        return {
            batchId: batchId,
            latitude: latitude,
            forecastTime: forecastTime,
            longitude: longitude,
            temperature: temperature,
            precipitationRate: precipitation_rate,
            humidity: humidity,
        };
    });
    
    try {
        const result = await WeatherData.insertMany(normalizedData, { ordered: false, rawResult: true }); // Insert with ordered: false to continue inserting even if some documents fail (duplicates)
        await updateBatchIngestedRowsCount(batchId, result.insertedCount);
    } catch (error: any) {
        if (error.name === 'BulkWriteError' && error.writeErrors) {
            const insertedCount = normalizedData.length - error.writeErrors.length;
            if (insertedCount > 0) {
                await updateBatchIngestedRowsCount(batchId, insertedCount);
                if (error.writeErrors.length > normalizedData.length * 0.1) {
                    log.warn({ message: 'Many duplicates skipped', batchId, insertedCount, skipped: error.writeErrors.length, total: normalizedData.length }, 'insertPageData');
                }
            }
        } else {
            log.error({ message: 'Error inserting weather data', batchId, error: error instanceof Error ? error.message : String(error) }, 'insertPageData');
            throw error;
        }
    }
    
    if (isLastPage) {
        await onLastPage(batchId);
    }
};

const insertAllBatchPages = async (batchId: string, forecastTime: Date) => {
    log.info({ message: 'Starting to insert all batch pages', batchId, forecastTime: forecastTime.toISOString() }, 'insertAllBatchPages');
    try {
        await weatherApiClient.getAllBatchPages(
            batchId,
            (pageData) => insertPageData(pageData, batchId, forecastTime));
    } catch (error: any) {
        if (is404Error(error)) {
            await handle404Error(error, batchId, 'during batch page processing');
        }
        throw error;
    }
};

const insertBatchMetadata = async (metadata: BatchMetadata, forecast_time: string) => {
    log.info({ message: 'Inserting batch metadata', batchId: metadata?.batch_id, forecastTime: forecast_time }, 'insertBatchMetadata');
    try {
        if (!metadata || !metadata.batch_id) {
            throw new Error('Invalid metadata: batch_id is required');
        }

        const batchMetadata = await BatchMetadataModel.create({
            batchId: metadata.batch_id,
            forecastTime: new Date(forecast_time),
            numberOfRows: 0,
            startIngestTime: new Date(),
            endIngestTime: null,
            rawData: metadata,
            status: BatchStatus.RUNNING,
        });
        log.info({ message: 'Batch metadata created', batchId: batchMetadata.batchId }, 'insertBatchMetadata');
    } catch (error) {
        // if duplicate key log and ignore other wise throw error
        if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
            log.info({ message: 'Batch metadata already exists (duplicate key)', batchId: metadata?.batch_id }, 'insertBatchMetadata');
            return;
        }
        throw error;
    }
};

const getBatchData = async (batchId: string) => {
    try {
        return await weatherApiClient.getBatchData(batchId);
    } catch (error: any) {
        if (is404Error(error)) {
            const existingMetadata = await BatchMetadataModel.findOne({ batchId }).lean();
            if (existingMetadata) {
                log.info({ message: 'Found existing metadata for 404 batch, cleaning up', batchId }, 'getBatchData');
                await cleanupFailedBatch(batchId);
            } else {
                log.warn({ message: 'Batch not found (404) when getting batch data', batchId }, 'getBatchData');
            }
        } else {
            log.error({ message: 'Error getting batch data', batchId, error: error instanceof Error ? error.message : String(error) }, 'getBatchData');
        }
        return { metadata: null, data: null };
    }
};

const processSingleBatch = async (batch: Batch) => {
    log.info({ message: 'Processing single batch', batchId: batch?.batch_id, forecastTime: batch?.forecast_time }, 'processSingleBatch');
    const { batch_id, forecast_time } = batch || {};
    const batchData = await getBatchData(batch_id);
    const { metadata, data } = batchData;
    if (metadata && data) {
        await insertBatchMetadata(metadata, forecast_time);
        await insertAllBatchPages(batch_id, new Date(forecast_time));
    }
};

const processAllBatches = async (batches: Batch[]) => {
    log.info({ message: 'Processing all batches', batchCount: batches?.length }, 'processAllBatches');
    const results = await Promise.allSettled(batches.map(batch => processSingleBatch(batch)));
    
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            log.error(
                { 
                    message: 'Batch processing failed', 
                    batchId: batches[index]?.batch_id,
                    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                    stack: result.reason instanceof Error ? result.reason.stack : undefined
                }, 
                'processAllBatches'
            );
        }
    });
};

const deactivateBatches = async (batchIds: string[]) => {
    log.info({ message: 'Deactivating batches', batchIds }, 'deactivateBatches');
    const batchMetadata = await BatchMetadataModel.updateMany({ batchId: { $in: batchIds } }, { status: BatchStatus.INACTIVE });
    if (batchMetadata.modifiedCount === 0) {
        log.error({ message: 'Failed to deactivate batches', batchIds }, 'deactivateBatches');
        return;
    }
};

const checkBatchesForDeactivation = async (fetchedBatchesIds: string[]) => {
    log.info({ message: 'Checking batches for deactivation', fetchedBatchesIds }, 'checkBatchesForDeactivation');
    const inactiveBatches = await BatchMetadataModel.find({ batchId: { $nin: fetchedBatchesIds } }).lean();
    const inactiveBatchesIds = inactiveBatches.map(batch => batch.batchId);
    if (inactiveBatchesIds.length > 0) {
        await deactivateBatches(inactiveBatches.map(batch => batch.batchId));
    }
};

const processBatches = async () => {
    try {
        const batches = await getBatches();
        const batchesIds = batches.map(batch => batch.batch_id);
        await checkBatchesForDeactivation(batchesIds);
        const triggeredBatches = await BatchMetadataModel.find({ batchId: { $in: batchesIds } }).lean();
        const triggeredBatchesIds = triggeredBatches.map(batch => batch.batchId)
        const batchesToProcess = batches.filter(batch => !triggeredBatchesIds.includes(batch.batch_id));
        await processAllBatches(batchesToProcess);
        log.info({ message: 'Batch processing cycle completed' }, 'processBatches');
    } catch (error) {
        log.error({ 
            message: 'Error processing batches', 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, 'processBatches');
    }
};

const main = async () => {
    log.info({ message: 'Starting data manager main process' }, 'main');
    let isShuttingDown = false;
    let intervalId: NodeJS.Timeout | null = null;
    
    const gracefulShutdown = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        log.info({ message: `Received ${signal}, shutting down gracefully...` }, 'gracefulShutdown');
        
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        
        log.info({ message: 'Waiting for operations to complete...' }, 'gracefulShutdown');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        await disconnectDB();
        process.exit(0);
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    try {
        const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/weather';
        log.info({ message: 'Connecting to database', mongodbUri: mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') }, 'main');
        await connectDB(mongodbUri);

        await processBatches();

        const INTERVAL__5M_MS = 5 * 60 * 1000;
        log.info({ message: `Setting up batch processing interval: every ${INTERVAL__5M_MS / 1000 / 60} minutes` }, 'main');
        intervalId = setInterval(async () => {
            await processBatches();
        }, INTERVAL__5M_MS);

        log.info({ message: 'Data manager running, processing batches every 5 minutes' }, 'main');
    } catch (error) {
        log.error({ 
            message: 'Error in main', 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, 'main');
        
        if (intervalId) {
            clearInterval(intervalId);
        }
        
        if (!isShuttingDown) {
            log.info({ message: 'Waiting for in-flight operations to complete...' }, 'main');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        await disconnectDB();
        process.exit(1);
    }
};

main();