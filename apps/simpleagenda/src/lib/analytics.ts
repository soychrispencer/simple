/**
 * Analítica de producto, sin proveedor atado.
 *
 * Escribe en `window.dataLayer` (Google Tag Manager) y en `window.gtag` si están
 * presentes. Si no hay ningún destino cargado no hace nada: los eventos quedan
 * listos para cuando se conecte un proveedor, sin tocar la interfaz.
 *
 * Para conectarlo: cargar el script del proveedor (GTM, GA4, PostHog…) en el
 * layout. Los nombres y propiedades de abajo ya son estables.
 */
export type AgendaEventName = 'landing_cta_click' | 'demo_confirm';

export type AgendaEventProps = Record<string, string | number | boolean | undefined>;

declare global {
    interface Window {
        dataLayer?: AgendaEventProps[];
        gtag?: (...args: unknown[]) => void;
    }
}

export function track(event: AgendaEventName, props: AgendaEventProps = {}): void {
    if (typeof window === 'undefined') return;

    try {
        window.dataLayer?.push({ event, ...props });
        window.gtag?.('event', event, props);

        if (process.env.NODE_ENV !== 'production') {
            console.info('[analytics]', event, props);
        }
    } catch {
        // La analítica nunca debe romper la interfaz.
    }
}
