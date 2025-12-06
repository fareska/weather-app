import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const notFound = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: `Route ${req.originalUrl} not found`,
    requestId: req.requestId,
  });
};

export default notFound;

