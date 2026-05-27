declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
    }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? '';

export function isMetaPixelEnabled(): boolean {
    return PIXEL_ID.length > 0;
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
    if (typeof window === 'undefined' || !isMetaPixelEnabled() || typeof window.fbq !== 'function') return;
    if (params) {
        window.fbq('track', event, params);
        return;
    }
    window.fbq('track', event);
}

export function trackOwnerRegistrationComplete() {
    trackMetaEvent('CompleteRegistration', { content_name: 'owner_group_signup' });
}

export function getMetaPixelId(): string {
    return PIXEL_ID;
}
