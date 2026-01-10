const REDACTED = '[REDACTED]';
const MAX_STRING_LENGTH = 2000;
const MAX_DEPTH = 6;

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type Logger = {
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

const isPlainObject = (v: any): v is Record<string, any> => {
  if (!v || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const truncateString = (s: string) => (s.length > MAX_STRING_LENGTH ? `${s.slice(0, MAX_STRING_LENGTH)}…[truncated]` : s);

const looksLikeEmail = (s: string) => /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(s);
const maskEmail = (s: string) => {
  const m = s.match(/^([^\s@]+)@([^\s@]+)$/);
  if (!m) return s;
  const local = m[1];
  const domain = m[2];
  const maskedLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
};

const looksLikePhone = (s: string) => /\+?\d[\d\s().-]{7,}\d/.test(s);
const maskPhone = (s: string) => {
  const digits = s.replace(/\D/g, '');
  if (digits.length < 6) return s;
  const last4 = digits.slice(-4);
  return `${REDACTED}-****${last4}`;
};

const isSensitiveKey = (k: string) => {
  const key = k.toLowerCase();
  return (
    key.includes('password') ||
    key === 'pass' ||
    key.includes('secret') ||
    key.includes('token') ||
    key.includes('authorization') ||
    key.includes('cookie') ||
    key.includes('set-cookie') ||
    key.includes('session') ||
    key.includes('apikey') ||
    key.includes('api_key') ||
    key.includes('service_role') ||
    (key.includes('supabase') && key.includes('key'))
  );
};

const sanitizeScalarString = (s: string, keyHint?: string) => {
  const truncated = truncateString(s);
  if (keyHint && isSensitiveKey(keyHint)) return REDACTED;
  if (looksLikeEmail(truncated)) return maskEmail(truncated);
  if (looksLikePhone(truncated)) return maskPhone(truncated);
  return truncated;
};

export function sanitizeLogMeta<T = any>(input: T): T {
  const seen = new WeakSet<object>();

  const sanitize = (value: any, depth: number, keyHint?: string): any => {
    if (value == null) return value;

    if (typeof value === 'string') return sanitizeScalarString(value, keyHint);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;

    if (value instanceof Error) {
      return {
        name: value.name,
        message: sanitizeScalarString(value.message || '', 'message'),
        stack: typeof value.stack === 'string' ? truncateString(value.stack) : undefined,
      };
    }

    if (depth >= MAX_DEPTH) {
      try {
        return Array.isArray(value) ? `[array depth>${MAX_DEPTH}]` : `[object depth>${MAX_DEPTH}]`;
      } catch {
        return `[depth>${MAX_DEPTH}]`;
      }
    }

    if (typeof value === 'object') {
      if (seen.has(value)) return '[circular]';
      seen.add(value);

      if (Array.isArray(value)) {
        return value.map((v) => sanitize(v, depth + 1));
      }

      if (isPlainObject(value)) {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          if (isSensitiveKey(k)) {
            out[k] = REDACTED;
          } else {
            out[k] = sanitize(v, depth + 1, k);
          }
        }
        return out;
      }

      // Para objetos no-plain (Response, Headers, Supabase, etc.), evitar expandir demasiado.
      try {
        return sanitize(String(value), depth + 1, keyHint);
      } catch {
        return '[unserializable]';
      }
    }

    return value;
  };

  return sanitize(input, 0) as T;
}

const shouldSkipClientLog = (level: LogLevel) => {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'production') return false;
  if (process.env.NEXT_PUBLIC_DEBUG_LOGS === '1') return false;
  return level === 'info' || level === 'debug';
};

const serializeArgs = (args: any[]) => {
  const safeArgs = args.map((a) => sanitizeLogMeta(a));
  return safeArgs
    .map((a) => {
      try {
        if (typeof a === 'string') return a;
        return JSON.stringify(a);
      } catch {
        try {
          return String(a);
        } catch {
          return '[unserializable]';
        }
      }
    })
    .join(' ');
};

const writeLine = (level: LogLevel, line: string, service?: string) => {
  const tag = service ? `[${level}][${service}]` : `[${level}]`;
  const payload = `${tag} ${line}\n`;

  try {
    if (typeof process !== 'undefined') {
      if (level === 'error' && process.stderr && typeof process.stderr.write === 'function') {
        process.stderr.write(payload);
        return;
      }
      if (process.stdout && typeof process.stdout.write === 'function') {
        process.stdout.write(payload);
        return;
      }
    }
  } catch {
    // ignore
  }

  // Fallback a consola del navegador
  try {
    if (level === 'error') console.error(`${tag} ${line}`);
    else if (level === 'warn') console.warn(`${tag} ${line}`);
    else if (level === 'info') console.info(`${tag} ${line}`);
    else console.debug(`${tag} ${line}`);
  } catch {
    // ignore
  }
};

export function createConsoleLogger(options?: { service?: string }): Logger {
  const service = options?.service;
  return {
    error: (...args: any[]) => {
      const line = serializeArgs(args);
      writeLine('error', line, service);
    },
    warn: (...args: any[]) => {
      const line = serializeArgs(args);
      writeLine('warn', line, service);
    },
    info: (...args: any[]) => {
      if (shouldSkipClientLog('info')) return;
      const line = serializeArgs(args);
      writeLine('info', line, service);
    },
    debug: (...args: any[]) => {
      if (shouldSkipClientLog('debug')) return;
      const line = serializeArgs(args);
      writeLine('debug', line, service);
    },
  };
}
