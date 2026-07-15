import type { TipoPropiedad } from './calculadora';

export const SIMULADOR_HIPOTECARIO_PATH = '/simulador-hipotecario';

/** Interpreta precio publicado en CLP o UF (si hay valorUF). */
export function parseListingPriceToCLP(
  price: string,
  valorUF: number,
): number | undefined {
  const trimmed = price.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  if (/^UF\b/i.test(trimmed) || /\bUF\b/i.test(trimmed)) {
    return Math.round(amount * valorUF);
  }
  return Math.round(amount);
}

/** Extrae monto en UF del label, o convierte desde CLP. */
export function parseListingPriceToUF(
  price: string,
  valorUF: number,
): number | undefined {
  const trimmed = price.trim();
  if (!trimmed) return undefined;

  const desdeMatch = trimmed.match(/^desde\s+(.+)$/i);
  const core = desdeMatch ? desdeMatch[1].trim() : trimmed;
  // Rangos: usar el primer valor
  const firstPart = core.split(/\s+-\s+/)[0]?.trim() ?? core;

  const digits = firstPart.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  if (/^UF\b/i.test(firstPart) || /\bUF\b/i.test(firstPart)) {
    return Math.round(amount);
  }
  if (!(valorUF > 0)) return undefined;
  return Math.round(amount / valorUF);
}

export function resolveTipoPropiedadFromSummary(
  summary: string[],
  title?: string,
): TipoPropiedad {
  const haystack = `${summary.join(' ')} ${title || ''}`.toLowerCase();
  if (haystack.includes('nuevo') || haystack.includes('en verde') || haystack.includes('proyecto')) {
    return 'nueva';
  }
  return 'usada';
}

export function buildSimuladorHipotecarioHrefFromListing(
  item: {
    id: string;
    title: string;
    price: string;
    summary: string[];
  },
  valorUF: number,
): string {
  const params = new URLSearchParams();
  const precioUF = parseListingPriceToUF(item.price, valorUF);
  if (precioUF) {
    params.set('precioUF', String(precioUF));
  } else {
    const precioCLP = parseListingPriceToCLP(item.price, valorUF);
    if (precioCLP) params.set('precio', String(precioCLP));
  }
  params.set('titulo', item.title);
  params.set('listingId', item.id);
  params.set('tipo', resolveTipoPropiedadFromSummary(item.summary, item.title));
  return `${SIMULADOR_HIPOTECARIO_PATH}?${params.toString()}`;
}
