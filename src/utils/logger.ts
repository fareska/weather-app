import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.info;

interface LogData {
  [key: string]: unknown;
  message?: string;
  requestId?: string;
}

interface LogEntry extends LogData {
  time: string;
  level: string;
  service: string;
  env: string;
  function: string;
}

function shouldLog(level: string): boolean {
  return LOG_LEVELS[level] >= currentLogLevel;
}

function formatLogEntry(level: string, data: LogData, functionName: string): string {
  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    time: timestamp,
    level: level.toUpperCase(),
    service: 'weather-webserver',
    env: process.env.NODE_ENV ?? 'development',
    function: functionName,
    ...data,
  };

  return JSON.stringify(logEntry);
}

function writeLog(level: string, data: LogData, functionName: string): void {
  if (!shouldLog(level)) return;

  const logEntry = formatLogEntry(level, data, functionName);
  
  console.log(logEntry);
  
  if (!isProduction) {
    try {
      const logFile = path.join(logsDir, 'app.log');
      fs.appendFileSync(logFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

export const log = {
  debug: (data: LogData, functionName: string) => writeLog('debug', data, functionName),
  info: (data: LogData, functionName: string) => writeLog('info', data, functionName),
  warn: (data: LogData, functionName: string) => writeLog('warn', data, functionName),
  error: (data: LogData, functionName: string) => writeLog('error', data, functionName),
};

export default log;

