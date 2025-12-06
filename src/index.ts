import express, { Request, Response, type Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import 'express-async-errors';
import { StatusCodes } from 'http-status-codes';
import swaggerUi from 'swagger-ui-express';
import connectDB, { disconnectDB } from './config/database.js';
import swaggerSpec from './config/swagger.js';
import apiRoutes from './routes/index.js';
import notFound from './middleware/not-found.js';
import { log } from './utils/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/weather';

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB(mongodbUri);
    app.listen(port, () => {
      log.info(
        {
          message: `Server is running on http://localhost:${port}`,
          port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid,
        },
        'startServer',
      );
    });
  } catch (error) {
    log.error(
      {
        message: 'Failed to start server',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        port,
        environment: process.env.NODE_ENV || 'development',
      },
      'startServer',
    );
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  log.info(
    { message: 'Received SIGINT, shutting down gracefully' },
    'shutdown',
  );
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info(
    { message: 'Received SIGTERM, shutting down gracefully' },
    'shutdown',
  );
  await disconnectDB();
  process.exit(0);
});

export default app;