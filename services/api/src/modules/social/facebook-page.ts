import { logger } from '@simple/logger';
import { getInstagramApiVersion } from '../instagram/service.js';
import { asString } from '../shared/index.js';

const fbLogger = logger.context('facebook-page');

type GraphPostResponse = {
    id?: string;
    post_id?: string;
};

async function requestGraph<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const errorObject = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
        const nestedError = errorObject.error && typeof errorObject.error === 'object'
            ? errorObject.error as Record<string, unknown>
            : null;
        const message = asString(nestedError?.message) || asString(errorObject.error_message)
            || `Facebook respondió con error ${response.status}.`;
        fbLogger.error('Graph API error', new Error(message));
        throw new Error(message);
    }

    return payload as T;
}

function buildFacebookPermalink(postId: string): string | null {
    const normalized = asString(postId);
    if (!normalized) return null;
    if (normalized.includes('_')) {
        const [pageId, storyId] = normalized.split('_');
        if (pageId && storyId) return `https://www.facebook.com/${pageId}/posts/${storyId}`;
    }
    return `https://www.facebook.com/${normalized}`;
}

export async function publishFacebookPageVideo(input: {
    pageId: string;
    pageAccessToken: string;
    videoUrl: string;
    message: string;
    link?: string | null;
}): Promise<{ postId: string; permalink: string | null }> {
    const videoUrl = asString(input.videoUrl);
    if (!videoUrl.startsWith('http')) {
        throw new Error('El video debe tener una URL pública accesible (Cloudflare R2).');
    }

    const params = new URLSearchParams({
        access_token: input.pageAccessToken,
        file_url: videoUrl,
        description: input.message,
    });
    const link = asString(input.link);
    if (link.startsWith('http')) params.set('link', link);

    const url = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.pageId)}/videos`;
    const data = await requestGraph<GraphPostResponse>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    const postId = asString(data.id) || asString(data.post_id);
    if (!postId) throw new Error('Facebook no devolvió un ID de publicación válido.');
    return { postId, permalink: buildFacebookPermalink(postId) };
}

export async function publishFacebookPageLinkPost(input: {
    pageId: string;
    pageAccessToken: string;
    message: string;
    link: string;
    pictureUrl?: string | null;
}): Promise<{ postId: string; permalink: string | null }> {
    const link = asString(input.link);
    if (!link.startsWith('http')) {
        throw new Error('El enlace del aviso debe ser una URL pública válida.');
    }

    const params = new URLSearchParams({
        access_token: input.pageAccessToken,
        message: input.message,
        link,
    });
    const pictureUrl = asString(input.pictureUrl);
    if (pictureUrl.startsWith('http')) params.set('picture', pictureUrl);

    const url = `https://graph.facebook.com/${getInstagramApiVersion()}/${encodeURIComponent(input.pageId)}/feed`;
    const data = await requestGraph<GraphPostResponse>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    const postId = asString(data.id) || asString(data.post_id);
    if (!postId) throw new Error('Facebook no devolvió un ID de publicación válido.');
    return { postId, permalink: buildFacebookPermalink(postId) };
}
