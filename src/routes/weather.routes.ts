import { Router, type IRouter } from 'express';
import * as weatherController from '../controllers/weather.controller.js';
import { validateWeatherQuery } from '../middleware/validate.js';

const router: IRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WeatherDataPoint:
 *       type: object
 *       properties:
 *         forecastTime:
 *           type: string
 *           format: date-time
 *           example: "2024-11-01T13:00:00.000Z"
 *         Temperature:
 *           type: number
 *           example: 23.3
 *         Precipitation_rate:
 *           type: number
 *           example: 32.1
 *         Humidity:
 *           type: number
 *           example: 70
 *     WeatherSummary:
 *       type: object
 *       properties:
 *         max:
 *           type: object
 *           properties:
 *             Temperature:
 *               type: number
 *               example: 33
 *             Precipitation_rate:
 *               type: number
 *               example: 20
 *             Humidity:
 *               type: number
 *               example: 94
 *         min:
 *           type: object
 *           properties:
 *             Temperature:
 *               type: number
 *               example: 13
 *             Precipitation_rate:
 *               type: number
 *               example: 3
 *             Humidity:
 *               type: number
 *               example: 12
 *         avg:
 *           type: object
 *           properties:
 *             Temperature:
 *               type: number
 *               example: 20.45
 *             Precipitation_rate:
 *               type: number
 *               example: 12.4
 *             Humidity:
 *               type: number
 *               example: 72
 *     BatchMetadata:
 *       type: object
 *       properties:
 *         batchId:
 *           type: string
 *           example: "d83bb2d7976eba5dd4cc32635630cd9b"
 *         forecastTime:
 *           type: string
 *           format: date-time
 *           example: "2024-11-01T13:05:00+00:00"
 *         numberOfRows:
 *           type: number
 *           example: 25300
 *         startIngestTime:
 *           type: string
 *           format: date-time
 *           example: "2024-11-01T13:22:00+00:00"
 *         endIngestTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-11-01T13:52:00+00:00"
 *         status:
 *           type: string
 *           enum: [RUNNING, ACTIVE, INACTIVE]
 *           example: "ACTIVE"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-11-01T13:22:00+00:00"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-11-01T13:22:00+00:00"
 */

/**
 * @swagger
 * /api/weather/data:
 *   get:
 *     summary: Get weather forecast data for a specific location
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude (-90 to 90)
 *         example: 40.7128
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude (-180 to 180)
 *         example: -74.0060
 *     responses:
 *       200:
 *         description: Successfully retrieved weather data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WeatherDataPoint'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/data', validateWeatherQuery, weatherController.getWeatherDataHandler);

/**
 * @swagger
 * /api/weather/summarize:
 *   get:
 *     summary: Get min, max, and average weather data for a specific location
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude (-90 to 90)
 *         example: 40.7128
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude (-180 to 180)
 *         example: -74.0060
 *     responses:
 *       200:
 *         description: Successfully retrieved weather summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WeatherSummary'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/summarize', validateWeatherQuery, weatherController.getWeatherSummaryHandler);

export default router;

