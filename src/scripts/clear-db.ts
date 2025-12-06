import dotenv from 'dotenv';
import connectDB, { disconnectDB } from '../config/database.js';
import { BatchMetadata } from '../models/BatchMetadata.js';
import { WeatherData } from '../models/WeatherData.js';
import { log } from '../utils/logger.js';

dotenv.config();

const clearAllCollections = async () => {
  try {
    log.info({ message: 'Starting database cleanup' }, 'clearAllCollections');

    // Delete all documents from WeatherData collection
    log.info({ message: 'Deleting all WeatherData documents' }, 'clearAllCollections');
    const weatherDataResult = await WeatherData.deleteMany({});
    log.info(
      { 
        message: 'WeatherData deletion completed', 
        deletedCount: weatherDataResult.deletedCount 
      }, 
      'clearAllCollections'
    );

    // Delete all documents from BatchMetadata collection
    log.info({ message: 'Deleting all BatchMetadata documents' }, 'clearAllCollections');
    const batchMetadataResult = await BatchMetadata.deleteMany({});
    log.info(
      { 
        message: 'BatchMetadata deletion completed', 
        deletedCount: batchMetadataResult.deletedCount 
      }, 
      'clearAllCollections'
    );

    log.info(
      { 
        message: 'Database cleanup completed successfully',
        totalWeatherDataDeleted: weatherDataResult.deletedCount,
        totalBatchMetadataDeleted: batchMetadataResult.deletedCount
      }, 
      'clearAllCollections'
    );
  } catch (error) {
    log.error(
      {
        message: 'Error during database cleanup',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'clearAllCollections',
    );
    throw error;
  }
};

const main = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/weather';
    log.info(
      { 
        message: 'Connecting to database', 
        mongodbUri: mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') 
      }, 
      'main'
    );
    
    await connectDB(mongodbUri);
    
    await clearAllCollections();
    
    log.info({ message: 'Script completed successfully' }, 'main');
  } catch (error) {
    log.error(
      {
        message: 'Fatal error in main',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'main',
    );
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

main();

