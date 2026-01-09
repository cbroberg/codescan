type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelColors: Record<LogLevel, string> = {
      debug: colors.dim,
      info: colors.blue,
      warn: colors.yellow,
      error: colors.red,
    };

    const levelStr = level.toUpperCase().padEnd(5);
    const coloredLevel = `${levelColors[level]}${levelStr}${colors.reset}`;

    console.log(`${colors.dim}${timestamp}${colors.reset} ${coloredLevel} ${message}`);

    if (data) {
      console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
    }
  }

  public debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  public error(message: string, error?: unknown): void {
    const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.log('error', message, errorData);
  }
}

// Global logger instance
let logger: Logger | null = null;

export function initializeLogger(level: LogLevel = 'info'): Logger {
  if (!logger) {
    logger = new Logger(level);
  }
  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    logger = new Logger('info');
  }
  return logger;
}
