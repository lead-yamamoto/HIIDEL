type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  action?: string;
}

class Logger {
  private static instance: Logger;
  private readonly isDevelopment: boolean;
  private readonly logLevels: Record<LogLevel, number> = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getCurrentUserId(),
      action: this.getCurrentAction(),
    };
  }

  private getCurrentUserId(): string | undefined {
    // セッションからユーザーIDを取得するロジックを実装
    return undefined;
  }

  private getCurrentAction(): string | undefined {
    // 現在のアクションを取得するロジックを実装
    return undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentLevel = this.isDevelopment ? "DEBUG" : "INFO";
    return this.logLevels[level] <= this.logLevels[currentLevel as LogLevel];
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(level, message, context);

    switch (level) {
      case "ERROR":
        console.error(entry);
        this.sendToErrorTracking(entry);
        break;
      case "WARN":
        console.warn(entry);
        break;
      case "INFO":
        console.info(entry);
        break;
      case "DEBUG":
        console.debug(entry);
        break;
    }
  }

  private sendToErrorTracking(entry: LogEntry): void {
    // エラートラッキングサービスへの送信ロジックを実装
    // 例: Sentry, LogRocket など
  }

  public error(message: string, context?: any): void {
    this.log("ERROR", message, context);
  }

  public warn(message: string, context?: any): void {
    this.log("WARN", message, context);
  }

  public info(message: string, context?: any): void {
    this.log("INFO", message, context);
  }

  public debug(message: string, context?: any): void {
    this.log("DEBUG", message, context);
  }
}

export const logger = Logger.getInstance();

// 使用例
export const logApiCall = (
  endpoint: string,
  status: number,
  duration: number
) => {
  logger.info(`API Call: ${endpoint}`, {
    status,
    duration,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    ...context,
    stack: error.stack,
  });
};

export const logPerformance = (metric: string, value: number) => {
  logger.debug(`Performance: ${metric}`, {
    value,
    timestamp: new Date().toISOString(),
  });
};
