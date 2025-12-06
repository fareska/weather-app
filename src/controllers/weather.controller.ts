import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { log } from '../utils/logger.js';
import { getLatestActiveBatchIds, findWeatherDataByLocation, getWeatherSummaryAggregation } from '../utils/query-helpers.js';
import { WeatherDataPoint, WeatherSummary } from '../types/interfaces.js';

export const getWeatherDataHandler = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    log.info(
      {
        message: 'Getting weather data',
        lat,
        lon,
        requestId: req.requestId,
      },
      'getWeatherDataHandler',
    );

    const batchIds = await getLatestActiveBatchIds();

    if (batchIds.length === 0) {
      log.warn(
        {
          message: 'No active batches found',
          requestId: req.requestId,
        },
        'getWeatherDataHandler',
      );

      return res.status(StatusCodes.OK).json([]);
    }

    const weatherDataPoints = await findWeatherDataByLocation(lat, lon, batchIds);
    if (weatherDataPoints.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No weather data points found for location',
        lat,
        lon,
        requestId: req.requestId,
      });
    }

    const response: WeatherDataPoint[] = weatherDataPoints.map(point => ({
      forecastTime: point.forecastTime.toISOString(),
      Temperature: point.temperature,
      Precipitation_rate: point.precipitationRate,
      Humidity: point.humidity,
    }));

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    log.error(
      {
        message: 'Error fetching weather data',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
        requestId: req.requestId,
      },
      'getWeatherDataHandler',
    );

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching weather data',
      requestId: req.requestId,
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : 'Internal server error',
    });
  }
};

export const getWeatherSummaryHandler = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    log.debug(
      {
        message: 'Getting weather summary',
        lat,
        lon,
        requestId: req.requestId,
      },
      'getWeatherSummaryHandler',
    );

    const batchIds = await getLatestActiveBatchIds();
    if (batchIds.length === 0) {
      log.warn(
        {
          message: 'No active batches found for summary',
          requestId: req.requestId,
        },
        'getWeatherSummaryHandler',
      );

      return res.status(StatusCodes.OK).json({
        max: { Temperature: 0, Precipitation_rate: 0, Humidity: 0 },
        min: { Temperature: 0, Precipitation_rate: 0, Humidity: 0 },
        avg: { Temperature: 0, Precipitation_rate: 0, Humidity: 0 },
      });
    }

    const result = await getWeatherSummaryAggregation(lat, lon, batchIds);

    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No weather data points found for location',
        lat,
        lon,
        requestId: req.requestId,
      });
    }
    const summary: WeatherSummary = {
      max: {
        Temperature: Math.round(result.maxTemp * 10) / 10,
        Precipitation_rate: Math.round(result.maxPrecip * 10) / 10,
        Humidity: Math.round(result.maxHumidity * 10) / 10,
      },
      min: {
        Temperature: Math.round(result.minTemp * 10) / 10,
        Precipitation_rate: Math.round(result.minPrecip * 10) / 10,
        Humidity: Math.round(result.minHumidity * 10) / 10,
      },
      avg: {
        Temperature: Math.round(result.avgTemp * 10) / 10,
        Precipitation_rate: Math.round(result.avgPrecip * 10) / 10,
        Humidity: Math.round(result.avgHumidity * 10) / 10,
      },
    };

    res.status(StatusCodes.OK).json(summary);
  } catch (error) {
    log.error(
      {
        message: 'Error fetching weather summary',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
        requestId: req.requestId,
      },
      'getWeatherSummaryHandler',
    );

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching weather summary',
      requestId: req.requestId,
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : 'Internal server error',
    });
  }
};

