import { google } from 'googleapis';

export function getGoogleOAuth2Client(callbackPath: string) {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.API_BASE_URL ?? 'http://localhost:4000'}${callbackPath}`,
    );
}
