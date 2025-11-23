/**
 * Unified logging system
 * Provides structured logging with level control
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    return `${timestamp} [${level}] ${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context), ...args);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context), ...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context), ...args);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMessage = this.formatMessage('ERROR', message, context);
      if (error instanceof Error) {
        console.error(errorMessage, error.message, error.stack, ...args);
      } else if (error) {
        console.error(errorMessage, error, ...args);
      } else {
        console.error(errorMessage, ...args);
      }
    }
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

export const logger = new Logger();
