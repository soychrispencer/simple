/**
 * Utilidades de formato de fecha y moneda compartidas entre todas las apps.
 * Unifica las funciones que estaban duplicadas en:
 *   - apps/simpleagenda/src/lib/format.ts
 *   - services/api/src/whatsapp.ts
 */

/** Formatea un monto en CLP: $1.5M / $120K / $45.000 */
export function fmtCLP(amount: string | number): string {
    const n = Number(amount);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

/** Precio de publicación con separador chileno, respetando UF, USD o CLP. */
export function formatListingPrice(price: string): string {
    const trimmed = price.trim();
    if (!trimmed) return '';

    const suffixMatch = trimmed.match(/(\s*\/\s*.+)$/i);
    const suffix = suffixMatch?.[1] ?? '';
    const core = suffix ? trimmed.slice(0, -suffix.length).trim() : trimmed;

    if (!/\d/.test(core)) return trimmed;

    if (/\s+-\s+/.test(core)) {
        return core
            .split(/\s+-\s+/)
            .map((part) => formatListingPriceCore(part))
            .join(' - ') + suffix;
    }

    return formatListingPriceCore(core) + suffix;
}

/** @deprecated Usa formatListingPrice */
export function formatListingPriceCLP(price: string): string {
    return formatListingPrice(price);
}

function formatListingPriceCore(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const desdeMatch = trimmed.match(/^(desde)\s+(.+)$/i);
    if (desdeMatch) {
        return `Desde ${formatListingPriceCore(desdeMatch[2])}`;
    }

    const ufMatch = trimmed.match(/^UF\s*(.+)$/i);
    if (ufMatch) {
        const amount = formatListingAmountDigits(ufMatch[1]);
        return amount ? `UF ${amount}` : trimmed;
    }

    const usdMatch = trimmed.match(/^USD\s*(.+)$/i);
    if (usdMatch) {
        const amount = formatListingAmountDigits(usdMatch[1]);
        return amount ? `USD ${amount}` : trimmed;
    }

    const clpBody = trimmed.replace(/^\$\s*/, '').trim();
    const amount = formatListingAmountDigits(clpBody);
    if (!amount) return trimmed;
    return `$${amount}`;
}

function formatListingAmountDigits(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    if (!digits) return null;
    const amount = Number.parseInt(digits, 10);
    if (!Number.isFinite(amount)) return null;
    return amount.toLocaleString('es-CL');
}

/** Formatea una fecha corta: "lun. 3 abr." */
export function fmtDateShort(iso: string | Date, tz?: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(tz ? { timeZone: tz } : {}),
    });
}

/** Formatea una fecha larga: "3 de abril de 2026" */
export function fmtDateLong(iso: string | Date, tz?: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(tz ? { timeZone: tz } : {}),
    });
}

/** Formatea una fecha media: "3 abr. 2026" */
export function fmtDateMedium(iso: string | Date, tz?: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(tz ? { timeZone: tz } : {}),
    });
}

/** Formatea una hora: "14:30" */
export function fmtTime(iso: string | Date, tz?: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...(tz ? { timeZone: tz } : {}),
    });
}

/** Formatea una fecha con timezone: "lunes 3 de abril" */
export function fmtDateTz(iso: string | Date, tz: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: tz,
    });
}

/** Formatea fecha y hora juntas: "lun. 3 abr. a las 14:30" */
export function fmtDateTimeShort(iso: string | Date, tz?: string): string {
    const zone = tz ?? undefined;
    return `${fmtDateShort(iso, zone)} a las ${fmtTime(iso, zone)}`;
}

/** Fecha calendario (YYYY-MM-DD) en la zona indicada — para eventos sin timestamp UTC. */
export function fmtCalendarDateYmd(ymd: string, tz: string): string {
    const trimmed = ymd.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}T12:00:00Z`).toLocaleDateString('es-CL', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            timeZone: tz,
        });
    }
    return fmtDateShort(trimmed, tz);
}

/** Etiqueta de «hoy» en la zona del usuario: "miércoles 27 de mayo" */
export function fmtTodayLabel(tz?: string): string {
    return new Date().toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(tz ? { timeZone: tz } : {}),
    });
}

/** Formatea fecha completa con timezone: "lunes 3 de abril a las 14:30" */
export function fmtDateTimeLong(iso: string | Date, tz: string): string {
    return `${fmtDateTz(iso, tz)} a las ${fmtTime(iso, tz)}`;
}

/** Alias para compatibilidad con el frontend */
export { fmtDateMedium as formatDate, fmtCLP as formatCurrency };