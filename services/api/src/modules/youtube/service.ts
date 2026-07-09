import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { logger } from '@simple/logger';
import { getGoogleOAuth2Client, resolveOAuthRedirectBase } from '../../lib/google-auth.js';
import { asString } from '../shared/index.js';
import {
    buildYouTubeShortDescription,
    buildYouTubeShortTitle,
    readListingVideoDurationSeconds,
    validateYouTubeShortVideoBuffer,
    youTubeCategoryIdForVertical,
} from './short-validation.js';

const ytLogger = logger.context('youtube');

const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export function isYouTubeConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getYouTubeOAuthRedirectUri(): string {
    return `${resolveOAuthRedirectBase()}/api/integrations/youtube/callback`;
}

export function getYouTubeOAuthClient() {
    return getGoogleOAuth2Client('/api/integrations/youtube/callback');
}

export function buildYouTubeAuthorizationUrl(input: { state: string }): string {
    const client = getYouTubeOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READONLY_SCOPE],
        state: input.state,
    });
}

export async function exchangeYouTubeCode(code: string) {
    const client = getYouTubeOAuthClient();
    const { tokens } = await client.getToken(code);
    const accessToken = asString(tokens.access_token);
    if (!accessToken) throw new Error('YouTube no devolvió un access token válido.');
    return {
        accessToken,
        refreshToken: asString(tokens.refresh_token) || null,
        expiresInSeconds: typeof tokens.expiry_date === 'number'
            ? Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000))
            : null,
        scopes: Array.isArray(tokens.scope) ? tokens.scope : asString(tokens.scope).split(' ').filter(Boolean),
    };
}

export async function refreshYouTubeAccessToken(refreshToken: string) {
    const client = getYouTubeOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    const accessToken = asString(credentials.access_token);
    if (!accessToken) throw new Error('No se pudo renovar el token de YouTube.');
    return {
        accessToken,
        refreshToken: asString(credentials.refresh_token) || refreshToken,
        expiresInSeconds: typeof credentials.expiry_date === 'number'
            ? Math.max(0, Math.floor((credentials.expiry_date - Date.now()) / 1000))
            : null,
        scopes: Array.isArray(credentials.scope) ? credentials.scope : asString(credentials.scope).split(' ').filter(Boolean),
    };
}

export async function fetchYouTubeChannelProfile(accessToken: string) {
    const client = getYouTubeOAuthClient();
    client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: client });
    const response = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
    });
    const channel = response.data.items?.[0];
    const channelId = asString(channel?.id);
    if (!channelId) throw new Error('No encontramos un canal de YouTube vinculado a esta cuenta.');

    const snippet = channel?.snippet;
    return {
        channelId,
        channelTitle: asString(snippet?.title) || 'Canal de YouTube',
        channelHandle: asString(snippet?.customUrl) || null,
        avatarUrl: asString(snippet?.thumbnails?.default?.url) || null,
    };
}

async function downloadVideoBuffer(videoUrl: string): Promise<Buffer> {
    const response = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`No se pudo descargar el video (${response.status}).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error('El video descargado está vacío.');
    return buffer;
}

function formatYouTubeApiError(error: unknown): string {
    if (error && typeof error === 'object') {
        const record = error as {
            message?: string;
            response?: { data?: { error?: { message?: string; errors?: Array<{ message?: string }> } } };
        };
        const apiMessage = record.response?.data?.error?.message
            ?? record.response?.data?.error?.errors?.[0]?.message;
        if (apiMessage) return apiMessage;
        if (record.message) return record.message;
    }
    return 'No se pudo publicar en YouTube.';
}

export async function publishYouTubeShort(input: {
    accessToken: string;
    refreshToken?: string | null;
    videoUrl: string;
    title: string;
    description: string;
    vertical?: string;
    listingRawData?: unknown;
}): Promise<{ videoId: string; permalink: string }> {
    const videoUrl = asString(input.videoUrl);
    if (!videoUrl.startsWith('https://')) {
        throw new Error('El video debe tener una URL pública HTTPS (Cloudflare R2).');
    }

    const client = getYouTubeOAuthClient();
    client.setCredentials({
        access_token: input.accessToken,
        refresh_token: input.refreshToken ?? undefined,
    });
    const youtube = google.youtube({ version: 'v3', auth: client });
    const videoBuffer = await downloadVideoBuffer(videoUrl);
    const durationSeconds = readListingVideoDurationSeconds(input.listingRawData);
    const validation = validateYouTubeShortVideoBuffer(videoBuffer, durationSeconds);
    if (!validation.ok) throw new Error(validation.error);

    const title = buildYouTubeShortTitle(input.title);
    const description = buildYouTubeShortDescription(input.description);
    const categoryId = youTubeCategoryIdForVertical(asString(input.vertical) || 'autos');

    try {
        const response = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title,
                    description,
                    categoryId,
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: Readable.from(videoBuffer),
            },
        });

        const videoId = asString(response.data.id);
        if (!videoId) throw new Error('YouTube no devolvió un ID de video válido.');
        return {
            videoId,
            permalink: `https://www.youtube.com/shorts/${videoId}`,
        };
    } catch (error) {
        const message = formatYouTubeApiError(error);
        ytLogger.error('YouTube upload failed', error instanceof Error ? error : new Error(message));
        throw new Error(message);
    }
}
