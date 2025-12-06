import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const validateWeatherQuery = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Missing required query parameters: lat and lon',
      requestId: req.requestId,
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Invalid lat/lon values. Must be valid numbers.',
      requestId: req.requestId,
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Latitude must be between -90 and 90',
      requestId: req.requestId,
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Longitude must be between -180 and 180',
      requestId: req.requestId,
    });
  }

  req.query.lat = latitude.toString();
  req.query.lon = longitude.toString();

  next();
};

