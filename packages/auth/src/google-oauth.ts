import { API_BASE } from '@simple/config';

type SimplePlatformApp = 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas' | 'simpleadmin';

function resolveAppFromBrowser(): SimplePlatformApp | null {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname.toLowerCase();
    const port = window.location.port;
    if (hostname.includes('simpleagenda') || port === '3004') return 'simpleagenda';
    if (hostname.includes('simpleautos') || port === '3002') return 'simpleautos';
    if (hostname.includes('simplepropiedades') || port === '3003') return 'simplepropiedades';
    if (hostname.includes('simpleserenatas') || port === '3005') return 'simpleserenatas';
    if (hostname.includes('simpleadmin') || port === '3000') return 'simpleadmin';
    return null;
}

export type GoogleOAuthCallbackResult = {
    ok: boolean;
    error?: string;
    isNewUser?: boolean;
};

/** Completa el intercambio OAuth en same-origin para que la cookie quede en el dominio de la app. */
export async function completeGoogleOAuthCallback(code: string, state: string): Promise<GoogleOAuthCallbackResult> {
    const currentApp = resolveAppFromBrowser();
    const response = await fetch(`${API_BASE}/api/auth/google/callback`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(currentApp ? { 'X-Simple-App': currentApp } : {}),
        },
        body: JSON.stringify({ code, state }),
    });
    const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        isNewUser?: boolean;
    } | null;
    if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'No pudimos iniciar sesión con Google.' };
    }
    return { ok: true, isNewUser: data.isNewUser };
}

export async function startGoogleOAuthLogin(returnTo?: string): Promise<void> {
    const targetReturn = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem('auth.returnTo', targetReturn);

    const response = await fetch(
        `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(targetReturn)}`,
        { credentials: 'include' },
    );
    const data = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;

    if (!response.ok || !data?.authUrl) {
        throw new Error(data?.error || 'No pudimos iniciar el acceso con Google.');
    }

    window.location.href = data.authUrl;
}
