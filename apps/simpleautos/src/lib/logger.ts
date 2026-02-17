import { createConsoleLogger, sanitizeLogMeta } from '@simple/logging';

export { sanitizeLogMeta };

// Logger que funciona tanto en cliente como servidor
let winstonLogger: any = null;

const fallbackLogger = createConsoleLogger({ service: 'simpleautos' });

// Inicializar winston solo en servidor
if (typeof window === 'undefined') {
  const fs = require('node:fs');
  const path = require('node:path');
  const winston = require('winston');

  const isProd = process.env.NODE_ENV === 'production';
  const logToFile = ['1', 'true', 'yes', 'on'].includes(String(process.env.LOG_TO_FILE || '').toLowerCase());

  if (isProd && logToFile) {
    try {
      fs.mkdirSync(path.resolve(process.cwd(), 'logs'), { recursive: true });
    } catch {
      // Si no se puede crear (p.ej. FS read-only), Winston seguirá con Console (según configuración).
    }
  }

  winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'simpleautos' },
    transports: [
      // En desarrollo, log a console con formato legible
      ...(!isProd
        ? [
            new winston.transports.Console({
              format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
            }),
          ]
        : []),
      // En producción, log a archivos solo si se habilita explícitamente.
      ...(isProd && logToFile
        ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
            }),
          ]
        : []),
    ]
  });

  // En producción, asegurar siempre Console logs cuando no se persiste a archivo.
  if (isProd && !logToFile) {
    winstonLogger.add(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );
  }
}

// Exportar un logger por defecto que siempre expone los métodos usados
const defaultLogger = {
  error: (...args: any[]) => {
    const safeArgs = args.map((a) => sanitizeLogMeta(a));
    if (winstonLogger && typeof winstonLogger.error === 'function') {
      try { winstonLogger.error(...safeArgs); } catch { /* ignore */ }
    } else {
      fallbackLogger.error(...args);
    }
  },
  warn: (...args: any[]) => {
    const safeArgs = args.map((a) => sanitizeLogMeta(a));
    if (winstonLogger && typeof winstonLogger.warn === 'function') {
      try { winstonLogger.warn(...safeArgs); } catch { /* ignore */ }
    } else {
      fallbackLogger.warn(...args);
    }
  },
  info: (...args: any[]) => {
    // En cliente, evitar ruido en producción (a menos que se habilite explícitamente)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_DEBUG_LOGS !== '1'
    ) {
      return;
    }
    const safeArgs = args.map((a) => sanitizeLogMeta(a));
    if (winstonLogger && typeof winstonLogger.info === 'function') {
      try { winstonLogger.info(...safeArgs); } catch { /* ignore */ }
    } else {
      fallbackLogger.info(...args);
    }
  },
  debug: (...args: any[]) => {
    // En cliente, evitar ruido en producción (a menos que se habilite explícitamente)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_DEBUG_LOGS !== '1'
    ) {
      return;
    }
    const safeArgs = args.map((a) => sanitizeLogMeta(a));
    if (winstonLogger && typeof winstonLogger.debug === 'function') {
      try { winstonLogger.debug(...safeArgs); } catch { /* ignore */ }
    } else {
      fallbackLogger.debug(...args);
    }
  }
};

export default defaultLogger;

// Helper functions para facilitar el uso
export const logError = (message: string, error?: any, meta?: any) => {
  const safeMeta = sanitizeLogMeta(meta || {});
  const safeErr = sanitizeLogMeta(error);
  defaultLogger.error(message, { error: (safeErr as any)?.message || safeErr, stack: (safeErr as any)?.stack, ...safeMeta });
};

export const logWarn = (message: string, meta?: any) => {
  defaultLogger.warn(message, sanitizeLogMeta(meta));
};

export const logInfo = (message: string, meta?: any) => {
  defaultLogger.info(message, sanitizeLogMeta(meta));
};

export const logDebug = (message: string, meta?: any) => {
  defaultLogger.debug(message, sanitizeLogMeta(meta));
};

