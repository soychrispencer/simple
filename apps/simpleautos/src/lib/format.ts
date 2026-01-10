export function formatPrice(value: number | null | undefined, options?: { currency?: string; locale?: string; fallback?: string }) {
  const { currency = 'CLP', locale = 'es-CL', fallback = 'Sin precio' } = options || {};
  if (value == null) return fallback;
  try {
    // Para CLP normalmente sin decimales
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 });
    return formatter.format(value);
  } catch {
    // Fallback simple si Intl falla o moneda no soportada
    return `$${value.toLocaleString(locale)}`;
  }
}

export function formatNumber(value: number | null | undefined, options?: { locale?: string; fallback?: string }) {
  const { locale = 'es-CL', fallback = '-' } = options || {};
  if (value == null) return fallback;
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return value.toString();
  }
}

export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatDate(date: Date | string, format: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '-';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    default:
      return d.toLocaleDateString('es-CL');
  }
}

export const format = {
  currency: formatPrice,
  number: formatNumber,
  date: formatDate,
};


