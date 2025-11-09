// Logger que funciona tanto en cliente como servidor
let logger: any = null;

// Inicializar logger solo en servidor
if (typeof window === 'undefined') {
  const winston = require('winston');
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'simpleautos' },
    transports: [
      // En desarrollo, log a console con formato legible
      ...(process.env.NODE_ENV !== 'production' ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ] : []),
      // En producción, log a archivos
      ...(process.env.NODE_ENV === 'production' ? [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ] : [])
    ]
  });

  // Si estamos en producción pero no hay archivos de log, log a console
  if (process.env.NODE_ENV === 'production' && !process.env.LOG_TO_FILE) {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));
  }
}

export default logger;

// Helper functions para facilitar el uso
export const logError = (message: string, error?: any, meta?: any) => {
  if (logger) {
    logger.error(message, { error: error?.message || error, stack: error?.stack, ...meta });
  } else {
    console.error(message, error, meta);
  }
};

export const logWarn = (message: string, meta?: any) => {
  if (logger) {
    logger.warn(message, meta);
  } else {
    console.warn(message, meta);
  }
};

export const logInfo = (message: string, meta?: any) => {
  if (logger) {
    logger.info(message, meta);
  } else {
    console.info(message, meta);
  }
};

export const logDebug = (message: string, meta?: any) => {
  if (logger) {
    logger.debug(message, meta);
  } else {
    console.debug(message, meta);
  }
};