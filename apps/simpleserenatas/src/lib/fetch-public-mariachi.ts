import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';

function apiOrigin() {
    return process.env.API_INTERNAL_URL
        ?? process.env.NEXT_PUBLIC_API_URL
        ?? 'http://127.0.0.1:4000';
}

export type PublicMariachiProfile = {
    group: ProviderGroup;
    services: ProviderGroupService[];
};

export async function fetchPublicMariachiBySlug(slug: string): Promise<PublicMariachiProfile | null> {
    const origin = apiOrigin().replace(/\/$/, '');
    const groupRes = await fetch(
        `${origin}/api/serenatas/marketplace/groups/${encodeURIComponent(slug)}`,
        { headers: { accept: 'application/json' }, next: { revalidate: 30 } },
    );
    if (!groupRes.ok) return null;
    const groupBody = await groupRes.json() as { ok?: boolean; item?: ProviderGroup };
    if (!groupBody.ok || !groupBody.item) return null;

    const servicesRes = await fetch(
        `${origin}/api/serenatas/marketplace/groups/${encodeURIComponent(groupBody.item.id)}/services`,
        { headers: { accept: 'application/json' }, next: { revalidate: 30 } },
    );
    if (!servicesRes.ok) {
        return { group: groupBody.item, services: [] };
    }
    const servicesBody = await servicesRes.json() as { ok?: boolean; items?: ProviderGroupService[] };
    return {
        group: groupBody.item,
        services: servicesBody.ok && servicesBody.items ? servicesBody.items : [],
    };
}
