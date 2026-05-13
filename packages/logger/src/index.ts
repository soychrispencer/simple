/**
 * Logger estructurado para reemplazar console.log/error/warn en producción.
 * Proporciona logging consistente con niveles, metadatos y formato JSON.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: LogMeta;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const minLevel = isProduction ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatEntry(entry: LogEntry): string {
    if (isProduction) {
        return JSON.stringify(entry);
    }

    // Formato legible para desarrollo
    const { timestamp, level, message, meta, error } = entry;
    const levelColor = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
    }[level];
    const reset = '\x1b[0m';

    let output = `${levelColor}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`;
    if (meta && Object.keys(meta).length > 0) {
        output += ` ${JSON.stringify(meta)}`;
    }
    if (error) {
        output += `\n  ${error.name}: ${error.message}`;
        if (error.stack) {
            output += `\n  ${error.stack.split('\n').slice(1, 4).join('\n  ')}`;
        }
    }
    return output;
}

function createEntry(level: LogLevel, message: string, meta?: LogMeta, err?: Error): LogEntry {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
    };

    if (meta && Object.keys(meta).length > 0) {
        entry.meta = meta;
    }

    if (err) {
        entry.error = {
            name: err.name,
            message: err.message,
            stack: err.stack,
        };
    }

    return entry;
}

function log(level: LogLevel, message: string, meta?: LogMeta, err?: Error): void {
    if (!shouldLog(level)) return;

    const entry = createEntry(level, message, meta, err);
    const formatted = formatEntry(entry);

    if (level === 'error') {
        console.error(formatted);
    } else if (level === 'warn') {
        console.warn(formatted);
    } else {
        console.info(formatted);
    }
}

export const logger = {
    /**
     * Log de depuración. Solo visible en desarrollo.
     */
    debug(message: string, meta?: LogMeta): void {
        log('debug', message, meta);
    },

    /**
     * Log informativo. Visible en producción y desarrollo.
     */
    info(message: string, meta?: LogMeta): void {
        log('info', message, meta);
    },

    /**
     * Log de advertencia. Para situaciones inesperadas pero no críticas.
     */
    warn(message: string, meta?: LogMeta): void {
        log('warn', message, meta);
    },

    /**
     * Log de error. Para errores que deben ser investigados.
     */
    error(message: string, err?: Error | unknown, meta?: LogMeta): void {
        const error = err instanceof Error ? err : err ? new Error(String(err)) : undefined;
        log('error', message, meta, error);
    },

    /**
     * Crea un logger con contexto predefinido (ej: nombre del módulo).
     */
    context(context: string): ContextLogger {
        return new ContextLogger(context);
    },
};

class ContextLogger {
    private readonly context: string;

    constructor(context: string) {
        this.context = context;
    }

    debug(message: string, meta?: LogMeta): void {
        logger.debug(`[${this.context}] ${message}`, meta);
    }

    info(message: string, meta?: LogMeta): void {
        logger.info(`[${this.context}] ${message}`, meta);
    }

    warn(message: string, meta?: LogMeta): void {
        logger.warn(`[${this.context}] ${message}`, meta);
    }

    error(message: string, err?: Error | unknown, meta?: LogMeta): void {
        logger.error(`[${this.context}] ${message}`, err, meta);
    }
}

export type { ContextLogger, LogMeta };