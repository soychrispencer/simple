import { createConsoleLogger, sanitizeLogMeta } from '@simple/logging';

export { sanitizeLogMeta };

export const logger = createConsoleLogger({ service: 'simpletiendas' });

export function logError(message: string, meta?: any) {
  if (typeof meta === 'undefined') logger.error(message);
  else logger.error(message, meta);
}

export function logWarn(message: string, meta?: any) {
  if (typeof meta === 'undefined') logger.warn(message);
  else logger.warn(message, meta);
}

export function logInfo(message: string, meta?: any) {
  if (typeof meta === 'undefined') logger.info(message);
  else logger.info(message, meta);
}

export function logDebug(message: string, meta?: any) {
  if (typeof meta === 'undefined') logger.debug(message);
  else logger.debug(message, meta);
}
