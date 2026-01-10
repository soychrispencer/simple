export type RegionCode = 'cl' | 'ar' | 'mx' | 'co';

export interface CurrencyOption {
  value: string;
  label: string;
  symbol?: string;
  locale?: string;
}

const regionCurrencyMap: Record<RegionCode, CurrencyOption[]> = {
  cl: [
    { value: 'CLP', label: 'CLP', symbol: '$', locale: 'es-CL' },
    { value: 'UF', label: 'UF', symbol: 'UF', locale: 'es-CL' },
    { value: 'USD', label: 'USD', symbol: 'US$', locale: 'en-US' },
  ],
  ar: [
    { value: 'ARS', label: 'ARS', symbol: '$', locale: 'es-AR' },
    { value: 'USD', label: 'USD', symbol: 'US$', locale: 'en-US' },
  ],
  mx: [
    { value: 'MXN', label: 'MXN', symbol: '$', locale: 'es-MX' },
    { value: 'USD', label: 'USD', symbol: 'US$', locale: 'en-US' },
  ],
  co: [
    { value: 'COP', label: 'COP', symbol: '$', locale: 'es-CO' },
    { value: 'USD', label: 'USD', symbol: 'US$', locale: 'en-US' },
  ],
};

export const DEFAULT_REGION: RegionCode = 'cl';

export interface CurrencyOptionsParams {
  region?: RegionCode;
  allowedCodes?: string[];
  fallbackRegion?: RegionCode;
}

export function getCurrencyOptions({
  region = DEFAULT_REGION,
  allowedCodes,
  fallbackRegion = DEFAULT_REGION,
}: CurrencyOptionsParams = {}): CurrencyOption[] {
  const base = regionCurrencyMap[region] || regionCurrencyMap[fallbackRegion] || [];
  if (!allowedCodes || allowedCodes.length === 0) {
    return base;
  }
  const filtered = base.filter((option) => allowedCodes.includes(option.value));
  return filtered.length > 0 ? filtered : base;
}

export function getDefaultCurrency(options?: CurrencyOptionsParams): string {
  const list = getCurrencyOptions(options);
  return list[0]?.value || 'USD';
}

export function getAvailableRegions(): RegionCode[] {
  return Object.keys(regionCurrencyMap) as RegionCode[];
}
