import { API_BASE } from '@simple/config';

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
