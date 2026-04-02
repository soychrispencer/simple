type InstagramTokenResponse = {
    access_token: string;
    user_id?: string | number;
    permissions?: string[];
    expires_in?: number;
    token_type?: string;
};

type InstagramRefreshResponse = {
    access_token: string;
    expires_in?: number;
    token_type?: string;
};

type InstagramProfileResponse = {
    id?: string;
    user_id?: string | number;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    account_type?: string;
};

type InstagramMediaCreateResponse = {
    id?: string;
};

type InstagramMediaPublishResponse = {
    id?: string;
};

type InstagramMediaInfoResponse = {
    id?: string;
    permalink?: string;
};

export type InstagramProfile = {
    instagramUserId: string;
    username: string;
    displayName: string | null;
    profilePictureUrl: string | null;
    accountType: string | null;
};

export function isInstagramConfigured(): boolean {
    return Boolean(getInstagramAppId() && getInstagramAppSecret() && getInstagramRedirectUri());
}

export function getInstagramAppId(): string {
    return asString(process.env.INSTAGRAM_APP_ID);
}

export function getInstagramAppSecret(): string {
    return asString(process.env.INSTAGRAM_APP_SECRET);
}

export function getInstagramRedirectUri(): string {
    return asString(process.env.INSTAGRAM_REDIRECT_URI);
}

export function getInstagramApiVersion(): string {
    return asString(process.env.INSTAGRAM_API_VERSION) || 'v24.0';
}

export function getInstagramPublicApiOrigin(): string {
    const redirectUri = getInstagramRedirectUri();
    if (!redirectUri) return '';
    try {
        return new URL(redirectUri).origin;
    } catch {
        return '';
    }
}

export function buildInstagramAuthorizationUrl(input: {
    state: string;
    scopes?: string[];
}): string {
    const redirectUri = getInstagramRedirectUri();
    if (!redirectUri) {
        throw new Error('INSTAGRAM_REDIRECT_URI no está configurado.');
    }

    const params = new URLSearchParams({
        client_id: getInstagramAppId(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: (input.scopes ?? [
            'instagram_business_basic',
            'instagram_business_content_publish',
        ]).join(','),
        state: input.state,
        enable_fb_login: '0',
        force_authentication: '1',
    });

    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string): Promise<{
    accessToken: string;
    instagramUserId: string;
    expiresInSeconds: number | null;
    scopes: string[];
}> {
    const payload = new URLSearchParams({
        client_id: getInstagramAppId(),
        client_secret: getInstagramAppSecret(),
        grant_type: 'authorization_code',
        redirect_uri: getInstagramRedirectUri(),
        code,
    });

    const data = await requestInstagram<InstagramTokenResponse>('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
    });

    return {
        accessToken: asString(data.access_token),
        instagramUserId: asString(data.user_id),
        expiresInSeconds: typeof data.expires_in === 'number' ? data.expires_in : null,
        scopes: Array.isArray(data.permissions) ? data.permissions.map((item) => asString(item)).filter(Boolean) : [],
    };
}

export async function refreshInstagramAccessToken(accessToken: string): Promise<{
    accessToken: string;
    expiresInSeconds: number | null;
} | null> {
    const params = new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: accessToken,
    });

    try {
        const data = await requestInstagram<InstagramRefreshResponse>(`https://graph.instagram.com/refresh_access_token?${params.toString()}`, {
            method: 'GET',
        });

        return {
            accessToken: asString(data.access_token),
            expiresInSeconds: typeof data.expires_in === 'number' ? data.expires_in : null,
        };
    } catch {
        return null;
    }
}

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
    const params = new URLSearchParams({
        fields: 'user_id,username,name,profile_picture_url,account_type',
        access_token: accessToken,
    });

    const data = await requestInstagram<InstagramProfileResponse>(`${graphBaseUrl()}/me?${params.toString()}`, {
        method: 'GET',
    });

    const instagramUserId = asString(data.user_id) || asString(data.id);
    const username = asString(data.username);

    if (!instagramUserId || !username) {
        throw new Error('Instagram no devolvió los datos mínimos del perfil.');
    }

    return {
        instagramUserId,
        username,
        displayName: asNullableString(data.name),
        profilePictureUrl: asNullableString(data.profile_picture_url),
        accountType: asNullableString(data.account_type),
    };
}

export async function publishInstagramImage(input: {
    instagramUserId: string;
    accessToken: string;
    imageUrl: string;
    caption: string;
}): Promise<{
    creationId: string;
    mediaId: string;
    permalink: string | null;
}> {
    const creationPayload = new URLSearchParams({
        image_url: input.imageUrl,
        caption: input.caption,
        access_token: input.accessToken,
    });

    const creation = await requestInstagram<InstagramMediaCreateResponse>(`${graphBaseUrl()}/${encodeURIComponent(input.instagramUserId)}/media`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: creationPayload.toString(),
    });

    const creationId = asString(creation.id);
    if (!creationId) {
        throw new Error('Instagram no devolvió un contenedor válido.');
    }

    const publishPayload = new URLSearchParams({
        creation_id: creationId,
        access_token: input.accessToken,
    });

    const publish = await requestInstagram<InstagramMediaPublishResponse>(`${graphBaseUrl()}/${encodeURIComponent(input.instagramUserId)}/media_publish`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: publishPayload.toString(),
    });

    const mediaId = asString(publish.id);
    if (!mediaId) {
        throw new Error('Instagram no devolvió el identificador del post publicado.');
    }

    const mediaInfo = await requestInstagram<InstagramMediaInfoResponse>(`${graphBaseUrl()}/${encodeURIComponent(mediaId)}?${new URLSearchParams({
        fields: 'id,permalink',
        access_token: input.accessToken,
    }).toString()}`, {
        method: 'GET',
    }).catch(() => null);

    return {
        creationId,
        mediaId,
        permalink: mediaInfo ? asNullableString(mediaInfo.permalink) : null,
    };
}

async function requestInstagram<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const errorObject = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
        console.error('[instagram] API error payload:', JSON.stringify(errorObject));
        const nestedError = errorObject.error && typeof errorObject.error === 'object'
            ? errorObject.error as Record<string, unknown>
            : null;
        const message = asString(nestedError?.message) || asString(errorObject.error_message) || `Instagram respondió con ${response.status}.`;
        throw new Error(message);
    }

    if (!payload || typeof payload !== 'object') {
        throw new Error('Instagram devolvió una respuesta inválida.');
    }

    return payload as T;
}

function graphBaseUrl(): string {
    return `https://graph.instagram.com/${getInstagramApiVersion()}`;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function asNullableString(value: unknown): string | null {
    const normalized = asString(value);
    return normalized || null;
}
