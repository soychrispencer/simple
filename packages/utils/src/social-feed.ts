export type SocialVertical = 'autos' | 'propiedades';
export type SocialSection = 'todos' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';

export type SocialClip = {
    id: string;
    vertical: SocialVertical;
    section: SocialSection;
    href: string;
    title: string;
    price: string;
    location: string;
    mediaType: 'video' | 'image';
    mediaUrl: string;
    posterUrl?: string;
    views: number;
    saves: number;
    publishedAgo: string;
    featured: boolean;
    specs?: Array<{ label: string; value: string; icon?: string }>;
    // Badges
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
    author: {
        id: string;
        name: string;
        username: string;
        profileHref: string | null;
        avatar?: string;
        followers: number;
        isFollowing: boolean;
        canFollow: boolean;
    };
};

type FeedResponse = {
    ok: boolean;
    clips?: SocialClip[];
};

type ToggleFollowResponse = {
    ok: boolean;
    following: boolean;
    followers: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as T | null;
    } catch {
        return null;
    }
}

export async function fetchSocialFeed(vertical: SocialVertical, section: SocialSection = 'todos'): Promise<SocialClip[]> {
    const query = new URLSearchParams({ vertical });
    if (section && section !== 'todos') query.set('section', section);
    const data = await apiRequest<FeedResponse>(`/api/social/feed?${query.toString()}`, { method: 'GET' });
    return data?.clips ?? [];
}

export async function toggleFollowAuthor(
    followeeUserId: string,
    vertical: SocialVertical
): Promise<{ following: boolean; followers: number } | null> {
    const data = await apiRequest<ToggleFollowResponse>('/api/social/follows/toggle', {
        method: 'POST',
        body: JSON.stringify({ followeeUserId, vertical }),
    });

    if (!data) return null;
    return { following: data.following, followers: data.followers };
}
