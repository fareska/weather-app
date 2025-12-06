import mongoose from 'mongoose';
import { log } from '../utils/logger.js';

export const connectDB = async (uri: string): Promise<void> => {
  try {
    await mongoose.connect(uri);
    log.info({ message: 'MongoDB connected successfully' }, 'connectDB');
  } catch (error) {
    log.error(
      {
        message: 'MongoDB connection error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'connectDB',
    );
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    log.info({ message: 'MongoDB disconnected' }, 'disconnectDB');
  } catch (error) {
    log.error(
      {
        message: 'Error disconnecting from MongoDB',
        error: error instanceof Error ? error.message : String(error),
      },
      'disconnectDB',
    );
  }
};

export default connectDB;

