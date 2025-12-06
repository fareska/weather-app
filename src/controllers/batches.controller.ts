import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { log } from '../utils/logger.js';
import { getAllBatches } from '../utils/query-helpers.js';
import { BatchMetadataResponse } from '../types/interfaces.js';

export const getAllBatchesHandler = async (req: Request, res: Response) => {
  try {
    log.debug(
      {
        message: 'Getting all batches',
        requestId: req.requestId,
      },
      'getAllBatchesHandler',
    );

    const batches = await getAllBatches();

    const response: BatchMetadataResponse[] = batches.map(batch => ({
      batchId: batch.batchId,
      forecastTime: batch.forecastTime.toISOString(),
      numberOfRows: batch.numberOfRows,
      startIngestTime: batch.startIngestTime.toISOString(),
      endIngestTime: batch.endIngestTime?.toISOString(),
      status: batch.status,
    }));

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    log.error(
      {
        message: 'Error fetching batches',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: req.requestId,
      },
      'getAllBatchesHandler',
    );

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching batches',
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

