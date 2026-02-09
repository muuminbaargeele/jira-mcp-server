import { LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export class AppLogger implements LoggerService {
  private readonly logger: Logger = baseLogger;

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }
}

export function getLogger() {
  return baseLogger;
}
