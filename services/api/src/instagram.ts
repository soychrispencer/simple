type InstagramTokenResponse = {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    permissions?: string[];
};

type InstagramRefreshResponse = {
    access_token: string;
    expires_in?: number;
    token_type?: string;
};

type InstagramProfileResponse = {
    id: string;
    ig_id?: string;
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
    return asString(process.env.INSTAGRAM_API_VERSION) || 'v21.0';
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

/**
 * Genera la URL de autorización usando Facebook Login (necesario para Instagram Business/Publishing).
 */
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
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement',
        ]).join(','),
        state: input.state,
        // force_authentication: '1',
    });

    // Usamos el diálogo de Facebook porque Instagram Business requiere Facebook Login
    return `https://www.facebook.com/${getInstagramApiVersion()}/dialog/oauth?${params.toString()}`;
}

/**
 * Intercambia el código de Facebook por un User Access Token.
 */
export async function exchangeInstagramCode(code: string): Promise<{
    accessToken: string;
    expiresInSeconds: number | null;
    scopes: string[];
}> {
    const params = new URLSearchParams({
        client_id: getInstagramAppId(),
        client_secret: getInstagramAppSecret(),
        redirect_uri: getInstagramRedirectUri(),
        code,
    });

    const data = await requestInstagram<InstagramTokenResponse>(
        `https://graph.facebook.com/${getInstagramApiVersion()}/oauth/access_token?${params.toString()}`,
        { method: 'GET' }
    );

    return {
        accessToken: asString(data.access_token),
        expiresInSeconds: typeof data.expires_in === 'number' ? data.expires_in : null,
        scopes: Array.isArray(data.permissions) ? data.permissions.map((item) => asString(item)).filter(Boolean) : [],
    };
}

/**
 * Convierte short-lived token (1h) -> long-lived token (60 días).
 */
export async function exchangeToLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresInSeconds: number | null;
} | null> {
    try {
        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: getInstagramAppId(),
            client_secret: getInstagramAppSecret(),
            fb_exchange_token: shortLivedToken,
        });
        const data = await requestInstagram<InstagramRefreshResponse>(
            `https://graph.facebook.com/${getInstagramApiVersion()}/oauth/access_token?${params.toString()}`,
            { method: 'GET' },
        );
        return {
            accessToken: asString(data.access_token),
            expiresInSeconds: typeof data.expires_in === 'number' ? data.expires_in : null,
        };
    } catch (error) {
        console.error('[instagram] long-lived exchange error:', error);
        return null;
    }
}

/**
 * Renueva un token long-lived (Facebook User Access Token).
 */
export async function refreshInstagramAccessToken(accessToken: string): Promise<{
    accessToken: string;
    expiresInSeconds: number | null;
} | null> {
    // Los tokens de Facebook no se "refrescan" igual que los de Instagram Basic Display.
    // Se recomienda volver a intercambiar o simplemente dejar que expiren y pedir login.
    // Sin embargo, exchangeToLongLivedToken con un token ya long-lived a veces extiende la vida.
    return exchangeToLongLivedToken(accessToken);
}

/**
 * Busca las cuentas de Instagram Business vinculadas a las páginas de Facebook del usuario.
 */
export async function getInstagramBusinessAccounts(accessToken: string): Promise<InstagramProfile[]> {
    type PageRes = {
        data: Array<{
            id: string;
            name: string;
            instagram_business_account?: {
                id: string;
            };
        }>;
    };

    // 1. Obtener las páginas de Facebook del usuario
    const pages = await requestInstagram<PageRes>(
        `https://graph.facebook.com/${getInstagramApiVersion()}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`,
        { method: 'GET' }
    );

    const accounts: InstagramProfile[] = [];

    for (const page of pages.data) {
        if (page.instagram_business_account?.id) {
            try {
                const profile = await getInstagramProfile(accessToken, page.instagram_business_account.id);
                accounts.push(profile);
            } catch (e) {
                console.error(`[instagram] error fetching profile for IG account ${page.instagram_business_account.id}:`, e);
            }
        }
    }

    return accounts;
}

export async function getInstagramProfile(accessToken: string, instagramBusinessAccountId: string): Promise<InstagramProfile> {
    const data = await requestInstagram<InstagramProfileResponse>(
        `https://graph.facebook.com/${getInstagramApiVersion()}/${instagramBusinessAccountId}?fields=id,ig_id,username,name,profile_picture_url&access_token=${accessToken}`,
        { method: 'GET' },
    );

    const username = asString(data.username);
    if (!username) {
        throw new Error('No se pudo obtener el nombre de usuario de Instagram.');
    }

    return {
        instagramUserId: data.id, // Este es el ID de la Business Account
        username,
        displayName: asNullableString(data.name),
        profilePictureUrl: asNullableString(data.profile_picture_url),
        accountType: 'BUSINESS', // Por definición si lo sacamos de una página es Business o Creator
    };
}

export async function publishInstagramCarousel(input: {
    instagramUserId: string;
    accessToken: string;
    images: Array<{ url: string }>;
    caption: string;
}): Promise<{
    mediaId: string;
    permalink: string | null;
}> {
    const tok = encodeURIComponent(input.accessToken);

    // 1. Crear contenedores individuales para cada imagen
    const childrenIds: string[] = [];
    for (const [index, img] of input.images.slice(0, 10).entries()) {
        const imageUrl = asString(img.url);
        if (!imageUrl) {
            console.error(`[instagram] error en item ${index + 1}: URL de imagen vacía`);
            continue;
        }

        const itemUrl = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.instagramUserId)}/media`
            + `?access_token=${tok}`
            + `&image_url=${encodeURIComponent(imageUrl)}`
            + `&is_carousel_item=true`;

        console.log(`[instagram] creando item carrusel ${index + 1}/${input.images.length}. URL: ${imageUrl}`);
        try {
            const res = await requestInstagram<InstagramMediaCreateResponse>(itemUrl, { method: 'POST' });
            if (res.id) childrenIds.push(res.id);
        } catch (error) {
            console.error(`[instagram] error creando item carrusel ${index + 1}:`, error);
            throw error;
        }
    }

    if (childrenIds.length === 0) {
        throw new Error('No se pudieron crear los contenedores de las imágenes.');
    }

    // 2. Crear el contenedor del carrusel (el padre)
    const carouselUrl = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.instagramUserId)}/media`
        + `?access_token=${tok}`
        + `&caption=${encodeURIComponent(input.caption)}`
        + `&media_type=CAROUSEL`
        + `&children=${encodeURIComponent(childrenIds.join(','))}`;

    const carouselContainer = await requestInstagram<InstagramMediaCreateResponse>(carouselUrl, { method: 'POST' });
    const creationId = asString(carouselContainer.id);
    
    if (!creationId) {
        throw new Error('No se pudo crear el contenedor del carrusel.');
    }

    // 3. Publicar el carrusel (con reintentos)
    const publishUrl = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.instagramUserId)}/media_publish`
        + `?access_token=${tok}`
        + `&creation_id=${encodeURIComponent(creationId)}`;

    console.log('[instagram] publicando carrusel:', creationId);

    let mediaId = '';
    let attempts = 0;
    const maxAttempts = 8; // Mas intentos porque los carruseles tardan mas en procesar

    while (attempts < maxAttempts) {
        try {
            const publish = await requestInstagram<InstagramMediaPublishResponse>(publishUrl, { method: 'POST' });
            mediaId = asString(publish.id);
            if (mediaId) break;
        } catch (error) {
            const msg = error instanceof Error ? error.message : '';
            if ((msg.includes('not ready') || msg.includes('not available') || msg.includes('9007')) && attempts < maxAttempts - 1) {
                attempts++;
                console.log(`[instagram] carrusel no listo (intento ${attempts}/${maxAttempts}). esperando 10s...`);
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }
            throw error;
        }
    }

    if (!mediaId) throw new Error('Instagram no devolvió el ID del carrusel publicado.');

    const mediaInfo = await requestInstagram<InstagramMediaInfoResponse>(
        `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(mediaId)}?fields=id,permalink&access_token=${tok}`,
        { method: 'GET' },
    ).catch(() => null);

    return {
        mediaId,
        permalink: mediaInfo ? asNullableString(mediaInfo.permalink) : null,
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
    const tok = encodeURIComponent(input.accessToken);

    // 1. Crear el contenedor del medio
    const creationUrl = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.instagramUserId)}/media`
        + `?access_token=${tok}`
        + `&image_url=${encodeURIComponent(input.imageUrl)}`
        + `&caption=${encodeURIComponent(input.caption)}`
        + `&media_type=IMAGE`;

    console.log('[instagram] media create url (sin token):', creationUrl.replace(tok, 'REDACTED'));

    const creation = await requestInstagram<InstagramMediaCreateResponse>(
        creationUrl,
        { method: 'POST' },
    );

    const creationId = asString(creation.id);
    if (!creationId) {
        throw new Error('Instagram no devolvió un contenedor válido.');
    }

    // 2. Publicar el contenedor
    const publishUrl = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.instagramUserId)}/media_publish`
        + `?access_token=${tok}`
        + `&creation_id=${encodeURIComponent(creationId)}`;

    console.log('[instagram] publicando contenedor (con reintentos si es necesario):', creationId);

    let mediaId = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            const publish = await requestInstagram<InstagramMediaPublishResponse>(
                publishUrl,
                { method: 'POST' },
            );
            mediaId = asString(publish.id);
            if (mediaId) break;
        } catch (error) {
            const isNotReady = error instanceof Error && (
                error.message.includes('not ready') || 
                error.message.includes('not available') ||
                error.message.includes('9007')
            );

            if (isNotReady && attempts < maxAttempts - 1) {
                attempts++;
                console.log(`[instagram] el medio no esta listo (intento ${attempts}/${maxAttempts}). esperando 5s...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            throw error;
        }
    }

    if (!mediaId) {
        throw new Error('Instagram no devolvió el identificador del post publicado tras varios intentos.');
    }

    // 3. Obtener info del post (permalink)
    const mediaInfo = await requestInstagram<InstagramMediaInfoResponse>(
        `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(mediaId)}?fields=id,permalink&access_token=${tok}`,
        { method: 'GET' },
    ).catch(() => null);

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
        // Log detallado para ver que dice Meta exactamente
        console.error('[instagram] Meta API ERROR:', response.status, JSON.stringify(errorObject, null, 2));
        
        const nestedError = errorObject.error && typeof errorObject.error === 'object'
            ? errorObject.error as Record<string, unknown>
            : null;
            
        const metaMessage = asString(nestedError?.message) || asString(errorObject.error_message);
        const errorCode = nestedError?.code;
        const errorSubcode = nestedError?.error_subcode;
        
        let friendlyMessage = metaMessage || `Instagram respondió con error ${response.status}.`;
        
        // Mapeo de errores comunes de Meta para ayudar al usuario
        if (friendlyMessage.toLowerCase().includes('download') || friendlyMessage.toLowerCase().includes('uri')) {
            friendlyMessage = 'Instagram no pudo descargar la imagen. Asegúrate de que el bucket de Backblaze sea PÚBLICO.';
        } else if (errorCode === 100 || errorCode === 10) {
            friendlyMessage = 'Error de parámetros o permisos. Por favor, DESCONECTA y vuelve a CONECTAR Instagram.';
        }

        throw new Error(friendlyMessage);
    }

    if (!payload || typeof payload !== 'object') {
        throw new Error('Meta API devolvió una respuesta inválida.');
    }

    return payload as T;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function asNullableString(value: unknown): string | null {
    const normalized = asString(value);
    return normalized || null;
}
