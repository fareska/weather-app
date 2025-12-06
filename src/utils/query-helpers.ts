import { WeatherData, IWeatherData } from '../models/WeatherData.js';
import { BatchMetadata, BatchStatus, IBatchMetadata } from '../models/BatchMetadata.js';

const TOLERANCE = 0.01;

export async function getAllBatches(): Promise<IBatchMetadata[]> {
  return BatchMetadata.find({})
    .sort({ forecastTime: -1 })
    .exec();
}

export async function getLatestActiveBatchIds(): Promise<string[]> {
  const activeBatches = await BatchMetadata.find({ status: BatchStatus.ACTIVE })
    .sort({ forecastTime: -1 })
    .limit(3)
    .select('batchId')
    .exec();

  return activeBatches.map(batch => batch.batchId);
}

export async function findWeatherDataByLocation(
  latitude: number,
  longitude: number,
  batchIds: string[]
): Promise<IWeatherData[]> {
  return WeatherData.find({
    batchId: { $in: batchIds },
    latitude: {
      $gte: latitude - TOLERANCE,
      $lte: latitude + TOLERANCE,
    },
    longitude: {
      $gte: longitude - TOLERANCE,
      $lte: longitude + TOLERANCE,
    },
  })
    .sort({ timestamp: 1 })
    .exec();
}

export interface WeatherAggregationResult {
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  maxPrecip: number;
  minPrecip: number;
  avgPrecip: number;
  maxHumidity: number;
  minHumidity: number;
  avgHumidity: number;
}

export async function getWeatherSummaryAggregation(
  latitude: number,
  longitude: number,
  batchIds: string[]
): Promise<WeatherAggregationResult | null> {
  const aggregationResult = await WeatherData.aggregate([
    {
      $match: {
        batchId: { $in: batchIds },
        latitude: {
          $gte: latitude - TOLERANCE,
          $lte: latitude + TOLERANCE,
        },
        longitude: {
          $gte: longitude - TOLERANCE,
          $lte: longitude + TOLERANCE,
        },
      },
    },
    {
      $group: {
        _id: null,
        maxTemp: { $max: '$temperature' },
        minTemp: { $min: '$temperature' },
        avgTemp: { $avg: '$temperature' },
        maxPrecip: { $max: '$precipitationRate' },
        minPrecip: { $min: '$precipitationRate' },
        avgPrecip: { $avg: '$precipitationRate' },
        maxHumidity: { $max: '$humidity' },
        minHumidity: { $min: '$humidity' },
        avgHumidity: { $avg: '$humidity' },
      },
    },
  ]);

  return aggregationResult.length > 0 ? aggregationResult[0] : null;
}

