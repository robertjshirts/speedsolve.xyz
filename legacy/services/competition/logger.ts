// logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enableConsoleColors = true;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    return this;
  }

  setEnableColors(enable: boolean) {
    this.enableConsoleColors = enable;
    return this;
  }

  private getTime(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.getTime();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown) {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      if (this.enableConsoleColors) {
        console.log(`\x1b[36m${formattedMessage}\x1b[0m`); // Cyan
      } else {
        console.log(formattedMessage);
      }
    }
  }

  info(message: string, data?: unknown) {
    if (this.logLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      if (this.enableConsoleColors) {
        console.log(`\x1b[32m${formattedMessage}\x1b[0m`); // Green
      } else {
        console.log(formattedMessage);
      }
    }
  }

  warn(message: string, data?: unknown) {
    if (this.logLevel <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      if (this.enableConsoleColors) {
        console.log(`\x1b[33m${formattedMessage}\x1b[0m`); // Yellow
      } else {
        console.log(formattedMessage);
      }
    }
  }

  error(message: string, error?: Error | unknown) {
    if (this.logLevel <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, error);
      if (this.enableConsoleColors) {
        console.log(`\x1b[31m${formattedMessage}\x1b[0m`); // Red
      } else {
        console.log(formattedMessage);
      }
    }
  }
}

// Export a default logger instance
export const logger = Logger.getInstance();