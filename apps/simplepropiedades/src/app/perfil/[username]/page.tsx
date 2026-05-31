'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';
import { fetchPublicProfile, type PublicListing } from '@/lib/public-listings';
import {
    PublicProfileShell,
    PublicProfileLoadingSkeleton,
    getPublicProfileTodayState,
    initialsFromPublicProfileName,
} from '@simple/ui/public-profile';
import { PanelNotice } from '@simple/ui/panel';

function toCardData(item: PublicListing): PropertyListingCardData {
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: item.section === 'project' ? 'Proyecto' : item.section === 'rent' ? 'Arriendo' : 'Precio',
        subtitle: item.description,
        meta: item.summary,
        highlights: item.summary,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimplePropiedades',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        videoUrl: item.videoUrl ?? undefined,
        projectStatus: item.section === 'project' ? item.summary[3] : undefined,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

export default function PublicProfilePage() {
    const params = useParams<{ username: string }>();
    const username = Array.isArray(params?.username) ? params.username[0] : params?.username;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Awaited<ReturnType<typeof fetchPublicProfile>>>(null);

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        void (async () => {
            const nextData = await fetchPublicProfile(username);
            setData(nextData);
            setLoading(false);
        })();
    }, [username]);

    const cards = useMemo(() => (data?.listings ?? []).map((item) => toCardData(item)), [data]);
    const profile = data?.profile ?? null;

    if (loading) {
        return <PublicProfileLoadingSkeleton />;
    }

    if (!data || !profile) {
        return (
            <div className="container-app py-8">
                <PanelNotice tone="warning">No encontramos este perfil público.</PanelNotice>
            </div>
        );
    }

    const todayState = getPublicProfileTodayState(profile);

    return (
        <PublicProfileShell
            profile={profile}
            todayState={todayState}
            initials={initialsFromPublicProfileName(profile.name)}
            listings={
                cards.length === 0 ? (
                    <PanelNotice tone="neutral">Este perfil no tiene publicaciones activas.</PanelNotice>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {cards.map((item) => (
                            <PropertyListingCard key={item.id} data={item} mode="grid" />
                        ))}
                    </div>
                )
            }
        />
    );
}
