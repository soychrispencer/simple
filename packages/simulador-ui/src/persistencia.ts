/** Persistencia ligera en sessionStorage para formularios de simulador. */

export function leerEstadoSimulador<T extends Record<string, unknown>>(
    key: string,
): Partial<T> | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as Partial<T>;
    } catch {
        return null;
    }
}

export function guardarEstadoSimulador(
    key: string,
    estado: Record<string, unknown>,
): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(key, JSON.stringify(estado));
    } catch {
        // cuota / modo privado: ignorar
    }
}

export function limpiarEstadoSimulador(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // ignore
    }
}
