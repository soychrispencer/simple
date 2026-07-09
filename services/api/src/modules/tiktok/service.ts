import { logger } from '@simple/logger';
import { asString } from '../shared/index.js';

const ttLogger = logger.context('tiktok');

type TikTokTokenResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: string;
    error_description?: string;
    data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        open_id?: string;
        scope?: string;
    };
};

type TikTokUserInfoResponse = {
    data?: {
        user?: {
            open_id?: string;
            username?: string;
            display_name?: string;
            avatar_url?: string;
        };
    };
    error?: { message?: string };
};

type TikTokPublishInitResponse = {
    data?: {
        publish_id?: string;
    };
    error?: {
        code?: string;
        message?: string;
    };
};

type TikTokPublishStatusResponse = {
    data?: {
        status?: string;
        fail_reason?: string;
        publicly_available_post_id?: string[];
        share_url?: string;
    };
    error?: {
        message?: string;
    };
};

const TIKTOK_PUBLISH_POLL_INTERVAL_MS = 5_000;
const TIKTOK_PUBLISH_POLL_MAX_ATTEMPTS = 24;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function buildTikTokPermalink(input: {
    shareUrl?: string | null;
    postIds?: string[] | null;
}): string | null {
    const shareUrl = asString(input.shareUrl);
    if (shareUrl.startsWith('https://')) return shareUrl;
    const postId = asString(input.postIds?.[0]);
    if (!postId) return null;
    return `https://www.tiktok.com/t/${postId}`;
}

export function isTikTokConfigured(): boolean {
    return Boolean(getTikTokClientKey() && getTikTokClientSecret() && getTikTokRedirectUri());
}

export function getTikTokClientKey(): string {
    return asString(process.env.TIKTOK_CLIENT_KEY);
}

export function getTikTokClientSecret(): string {
    return asString(process.env.TIKTOK_CLIENT_SECRET);
}

export function getTikTokRedirectUri(): string {
    return asString(process.env.TIKTOK_REDIRECT_URI);
}

export function buildTikTokAuthorizationUrl(input: { state: string; scopes?: string[] }): string {
    const redirectUri = getTikTokRedirectUri();
    if (!redirectUri) throw new Error('TIKTOK_REDIRECT_URI no está configurado.');

    const params = new URLSearchParams({
        client_key: getTikTokClientKey(),
        response_type: 'code',
        scope: (input.scopes ?? ['user.info.basic', 'video.publish']).join(','),
        redirect_uri: redirectUri,
        state: input.state,
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function requestTikTok<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload && typeof payload === 'object'
            ? asString((payload as TikTokTokenResponse).error_description)
                || asString((payload as { error?: { message?: string } }).error?.message)
                || `TikTok respondió con error ${response.status}.`
            : `TikTok respondió con error ${response.status}.`;
        ttLogger.error('TikTok API error', new Error(message));
        throw new Error(message);
    }
    return payload as T;
}

function unwrapTokenResponse(data: TikTokTokenResponse) {
    const nested = data.data ?? data;
    const accessToken = asString(nested.access_token);
    if (!accessToken) throw new Error('TikTok no devolvió un access token válido.');
    return {
        accessToken,
        refreshToken: asString(nested.refresh_token) || null,
        expiresInSeconds: typeof nested.expires_in === 'number' ? nested.expires_in : null,
        openId: asString(nested.open_id),
        scopes: asString(nested.scope).split(',').map((item) => item.trim()).filter(Boolean),
    };
}

export async function exchangeTikTokCode(code: string) {
    const body = new URLSearchParams({
        client_key: getTikTokClientKey(),
        client_secret: getTikTokClientSecret(),
        code,
        grant_type: 'authorization_code',
        redirect_uri: getTikTokRedirectUri(),
    });

    const data = await requestTikTok<TikTokTokenResponse>('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    return unwrapTokenResponse(data);
}

export async function refreshTikTokAccessToken(refreshToken: string) {
    const body = new URLSearchParams({
        client_key: getTikTokClientKey(),
        client_secret: getTikTokClientSecret(),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    const data = await requestTikTok<TikTokTokenResponse>('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    return unwrapTokenResponse(data);
}

export async function fetchTikTokUserProfile(accessToken: string) {
    const params = new URLSearchParams({
        fields: 'open_id,username,display_name,avatar_url',
    });
    const data = await requestTikTok<TikTokUserInfoResponse>(
        `https://open.tiktokapis.com/v2/user/info/?${params.toString()}`,
        {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    const user = data.data?.user;
    const username = asString(user?.username) || asString(user?.display_name) || 'tiktok';
    return {
        openId: asString(user?.open_id),
        username,
        displayName: asString(user?.display_name) || null,
        avatarUrl: asString(user?.avatar_url) || null,
    };
}

export async function fetchTikTokPublishStatus(accessToken: string, publishId: string) {
    return requestTikTok<TikTokPublishStatusResponse>(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({ publish_id: publishId }),
        },
    );
}

async function waitForTikTokPublishPermalink(accessToken: string, publishId: string): Promise<string | null> {
    for (let attempt = 0; attempt < TIKTOK_PUBLISH_POLL_MAX_ATTEMPTS; attempt += 1) {
        const statusResponse = await fetchTikTokPublishStatus(accessToken, publishId);
        const status = asString(statusResponse.data?.status);
        if (status === 'PUBLISH_COMPLETE') {
            return buildTikTokPermalink({
                shareUrl: statusResponse.data?.share_url,
                postIds: statusResponse.data?.publicly_available_post_id,
            });
        }
        if (status === 'FAILED') {
            const reason = asString(statusResponse.data?.fail_reason) || 'TikTok rechazó la publicación.';
            throw new Error(reason);
        }
        if (attempt < TIKTOK_PUBLISH_POLL_MAX_ATTEMPTS - 1) {
            await sleep(TIKTOK_PUBLISH_POLL_INTERVAL_MS);
        }
    }
    return null;
}

export async function publishTikTokVideo(input: {
    accessToken: string;
    videoUrl: string;
    title: string;
}): Promise<{ publishId: string; permalink: string | null }> {
    const videoUrl = asString(input.videoUrl);
    if (!videoUrl.startsWith('https://')) {
        throw new Error('El video debe tener una URL pública HTTPS (Cloudflare R2).');
    }

    const data = await requestTikTok<TikTokPublishInitResponse>(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${input.accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                post_info: {
                    title: input.title.slice(0, 2200),
                    privacy_level: 'PUBLIC_TO_EVERYONE',
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                },
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: videoUrl,
                },
            }),
        },
    );

    const publishId = asString(data.data?.publish_id);
    if (!publishId) {
        throw new Error(data.error?.message || 'TikTok no devolvió un publish_id válido.');
    }

    const permalink = await waitForTikTokPublishPermalink(input.accessToken, publishId);

    return {
        publishId,
        permalink,
    };
}
