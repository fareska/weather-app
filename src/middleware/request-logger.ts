import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  req.startTime = start;
  const originalUrl = req.originalUrl || req.url;

  // Log incoming request
  log.info({
    message: 'Incoming request',
    method: req.method,
    url: originalUrl,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      accept: req.get('Accept'),
    },
    requestId,
    ip: req.ip || req.connection.remoteAddress,
  }, 'requestLogger');

  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  let responseLogged = false;

  const logResponse = (responseData?: any) => {
    if (responseLogged) return;
    responseLogged = true;

    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    
    const logData: any = {
      message: 'Request completed',
      method: req.method,
      url: originalUrl,
      path: req.path,
      statusCode,
      requestId,
      duration: `${duration}ms`,
      isError,
    };

    // Add response data for errors
    if (isError || process.env.LOG_RESPONSE_BODY === 'true') {
      logData.responseData = responseData;
    }

    // Log at appropriate level
    if (statusCode >= 500) {
      log.error(logData, 'requestLogger');
    } else if (statusCode >= 400) {
      log.warn(logData, 'requestLogger');
    } else {
      log.info(logData, 'requestLogger');
    }
  };

  // Override res.json
  res.json = function(obj: unknown) {
    logResponse(obj);
    return originalJson.call(this, obj);
  };

  // Override res.send
  res.send = function(obj: unknown) {
    logResponse(obj);
    return originalSend.call(this, obj);
  };

  // Override res.end
  res.end = function(chunk?: any, encoding?: any) {
    logResponse(chunk);
    return originalEnd.call(this, chunk, encoding);
  };

  // Fallback for finish event
  res.on('finish', () => {
    logResponse();
  });

  next();
};

