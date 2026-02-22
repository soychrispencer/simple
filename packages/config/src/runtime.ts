export type RuntimePublicEnv = {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SIMPLE_API_BASE_URL?: string;
  NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS?: string;
  NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES?: string;
  NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES?: string;
};

function readWindowRuntimeEnv(): RuntimePublicEnv {
  const win = (globalThis as any)?.window;
  if (!win) {
    return {};
  }
  return (win.__SIMPLE_RUNTIME_ENV__ as RuntimePublicEnv) || {};
}

export function readPublicEnvValue(
  key: keyof RuntimePublicEnv,
  processFallback?: string
): string {
  const fromProcess = String(process.env[key] || processFallback || "").trim();
  if (fromProcess) {
    return fromProcess;
  }
  const runtime = readWindowRuntimeEnv();
  return String(runtime[key] || "").trim();
}

export function parseBooleanEnv(
  rawValue: string | undefined | null,
  defaultValue = false
): boolean {
  const raw = String(rawValue || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  if (["true", "1", "yes", "on"].includes(raw)) return true;
  if (["false", "0", "no", "off"].includes(raw)) return false;
  return defaultValue;
}
