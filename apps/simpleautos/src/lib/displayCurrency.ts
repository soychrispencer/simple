import type { DisplayCurrency } from "@simple/ui";

const DEFAULT_USD_CLP_RATE = 900;

function parseUsdClpRateFromEnv(): number | null {
  const raw = process.env.NEXT_PUBLIC_USD_CLP_RATE;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function getUsdClpRate(): number {
  return parseUsdClpRateFromEnv() ?? DEFAULT_USD_CLP_RATE;
}

export function convertFromClp(valueClp: number, displayCurrency: DisplayCurrency): number {
  if (!Number.isFinite(valueClp)) return valueClp;
  if (displayCurrency === "USD") {
    const rate = getUsdClpRate();
    return valueClp / rate;
  }
  return valueClp;
}
