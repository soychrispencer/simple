'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { IconBuildingStore } from '@tabler/icons-react';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';
import { fetchPublicProfile, type PublicListing } from '@/lib/public-listings';
import {
    PublicProfileShell,
    PublicProfileLoadingSkeleton,
    PanelNotice,
    getPublicProfileTodayState,
    initialsFromPublicProfileName,
} from '@simple/ui';

function toCardData(item: PublicListing): VehicleListingCardData {
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: item.section === 'rent' ? 'Arriendo' : item.section === 'auction' ? 'Oferta actual' : 'Precio',
        subtitle: item.description,
        meta: item.summary,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimpleAutos',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
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
            companyNameExtra={<IconBuildingStore size={15} />}
            teamSectionDescription="Asesores o vendedores visibles conectados a esta cuenta y a su operación pública."
            listings={
                cards.length === 0 ? (
                    <PanelNotice tone="neutral">Este perfil no tiene publicaciones activas.</PanelNotice>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {cards.map((item) => (
                            <VehicleListingCard key={item.id} data={item} mode="grid" />
                        ))}
                    </div>
                )
            }
        />
    );
}
