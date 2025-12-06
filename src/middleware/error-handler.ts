import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { log } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode =
    res.statusCode !== 200 ? res.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;

  log.error(
    {
      message: 'Unhandled error occurred',
      error: err.message,
      errorName: err.name,
      stack: err.stack,
      statusCode,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      requestId: req.requestId,
      ip: req.ip || req.connection.remoteAddress,
    },
    'errorHandler',
  );

  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred.',
    requestId: req.requestId,
    error:
      process.env.NODE_ENV === 'development'
        ? {
            name: err.name,
            stack: err.stack,
          }
        : undefined,
  });
};

