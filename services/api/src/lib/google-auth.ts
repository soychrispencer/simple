import { google } from 'googleapis';

/** Origen público para `redirect_uri` (sin path). */
export function resolveOAuthRedirectBase(preferredAppUrl?: string): string {
    return (
        preferredAppUrl
        ?? process.env.API_BASE_URL
        ?? 'http://localhost:4000'
    ).replace(/\/$/, '');
}

export function getGoogleOAuth2Client(callbackPath: string, redirectBase?: string) {
    const base = resolveOAuthRedirectBase(redirectBase);
    const path = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${base}${path}`,
    );
}

/** Redirect URI de Calendar para SimpleSerenatas (mismo origen que la app). */
export function getSerenatasGoogleCalendarOAuthClient() {
    const explicit = process.env.GOOGLE_SERENATAS_CALENDAR_REDIRECT_URI?.trim();
    if (explicit) {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            explicit,
        );
    }
    return getGoogleOAuth2Client(
        '/api/serenatas/google-calendar/callback',
        process.env.SERENATAS_APP_URL ?? process.env.API_BASE_URL,
    );
}
