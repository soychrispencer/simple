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

/** Formatea una fecha corta: "lun. 3 abr." */
export function fmtDateShort(iso: string | Date): string {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Formatea una fecha larga: "3 de abril de 2026" */
export function fmtDateLong(iso: string | Date): string {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Formatea una fecha media: "3 abr. 2026" */
export function fmtDateMedium(iso: string | Date): string {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
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
    return `${fmtDateShort(iso)} a las ${fmtTime(iso, tz)}`;
}

/** Formatea fecha completa con timezone: "lunes 3 de abril a las 14:30" */
export function fmtDateTimeLong(iso: string | Date, tz: string): string {
    return `${fmtDateTz(iso, tz)} a las ${fmtTime(iso, tz)}`;
}