'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@simple/utils';
import {
    MarketplaceReelListingCard,
    type MarketplaceReelChip,
    type MarketplaceReelSpec,
} from '@simple/ui/listings';
import {
    IconBed,
    IconBath,
    IconBuilding,
    IconHome,
    IconRuler,
} from '@tabler/icons-react';

type CardVariant = 'sale' | 'rent' | 'project';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type PropertyListingCardData = {
    id: string;
    href: string;
    title: string;
    price: string;
    priceOriginal?: string;
    discountLabel?: string;
    priceLabel?: string;
    subtitle?: string;
    meta: string[];
    location: string;
    sellerName: string;
    sellerMeta?: string;
    sellerAvatarUrl?: string;
    sellerProfileHref?: string;
    sellerIsFeatured?: boolean;
    badge: string;
    variant?: CardVariant;
    images?: string[];
    videoUrl?: string;
    videoThumbnail?: string;
    bedrooms?: number;
    bathrooms?: number;
    surface?: string;
    propertyType?: string;
    highlights?: string[];
    projectStatus?: string;
    delivery?: string;
    listedSince?: string;
    createdAt?: string;
    engagement?: CardEngagement;
    ctaLabel?: string;
    isSponsored?: boolean;
    likeCount?: number;
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
};

type Props = {
    data: PropertyListingCardData;
    mode: 'grid' | 'list';
};

function variantLabel(variant?: CardVariant): string {
    if (variant === 'rent') return 'Arriendo';
    if (variant === 'project') return 'Proyecto';
    return 'Venta';
}

function buildSpecs(data: PropertyListingCardData): MarketplaceReelSpec[] {
    if (data.meta.length > 0) {
        const iconCycle = [
            <IconBuilding key="type" size={20} />,
            <IconBed key="bed" size={20} />,
            <IconBath key="bath" size={20} />,
            <IconRuler key="surface" size={20} />,
        ];
        return data.meta.slice(0, 4).map((label, index) => ({
            icon: iconCycle[index] ?? iconCycle[0],
            label,
        }));
    }

    const allText = [...data.meta, data.title].join(' ').toLowerCase();
    const specs: MarketplaceReelSpec[] = [];

    const type = data.propertyType ||
        (allText.includes('casa') ? 'Casa' :
            allText.includes('departamento') || allText.includes('depto') ? 'Depto' :
                allText.includes('oficina') ? 'Oficina' :
                    allText.includes('local') ? 'Local' :
                        allText.includes('terreno') ? 'Terreno' :
                            allText.includes('bodega') ? 'Bodega' : 'Propiedad');
    specs.push({ icon: <IconBuilding size={20} />, label: type });

    const bedMatch = allText.match(/(\d+)\s*(dorm|dormitorio|hab|habitacion|habitación)/);
    const bedrooms = data.bedrooms ? `${data.bedrooms} dorm` : (bedMatch ? `${bedMatch[1]} dorm` : '');
    if (bedrooms) specs.push({ icon: <IconBed size={20} />, label: bedrooms });

    const bathMatch = allText.match(/(\d+)\s*(baño|bano|baños)/);
    const bathrooms = data.bathrooms ? `${data.bathrooms} baños` : (bathMatch ? `${bathMatch[1]} baños` : '');
    if (bathrooms) specs.push({ icon: <IconBath size={20} />, label: bathrooms });

    const surfaceMatch = allText.match(/(\d+[\d.]*)\s*(m2|m²|metros)/);
    const surface = data.surface || (surfaceMatch ? `${surfaceMatch[1]} m²` : '');
    if (surface) specs.push({ icon: <IconRuler size={20} />, label: surface });

    return specs.slice(0, 4);
}

function buildChips(data: PropertyListingCardData): MarketplaceReelChip[] {
    const chips: MarketplaceReelChip[] = [{ label: variantLabel(data.variant) }];
    if (data.projectStatus) chips.push({ label: data.projectStatus });
    if (data.discountPercent && data.discountPercent > 0) {
        chips.push({ label: `-${data.discountPercent}%`, tone: 'accent' });
    }
    if (data.financing) chips.push({ label: 'Financiamiento' });
    if (data.negotiable) chips.push({ label: 'Conversable' });
    if (data.isSponsored) chips.push({ label: 'Patrocinado' });
    return chips;
}

export default function PropertyListingCard({ data, mode }: Props) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSaved(isListingSaved(data.id));
        return subscribeSavedListings(() => setSaved(isListingSaved(data.id)));
    }, [data.id]);

    const ctaLabel = data.ctaLabel ?? (data.variant === 'rent' ? 'Ver disponibilidad' : data.variant === 'project' ? 'Ver proyecto' : 'Ver detalle');

    const handleSave = async () => {
        if (!requireAuth()) return { saved };
        const result = await toggleSavedListing({
            id: data.id,
            href: data.href,
            title: data.title,
            price: data.price,
            location: data.location,
            subtitle: data.subtitle,
            meta: data.meta,
            badge: data.badge,
            sellerName: data.sellerName,
            sellerMeta: data.sellerMeta,
        });
        if (result.ok) setSaved(result.saved);
        return { saved: result.ok ? result.saved : saved };
    };

    if (mode === 'list') {
        return (
            <MarketplaceReelListingCard
                mode="list"
                href={data.href}
                title={data.title}
                price={data.price}
                priceOriginal={data.priceOriginal}
                location={data.location}
                ctaLabel={ctaLabel}
                images={data.images}
                videoUrl={data.videoUrl}
                videoThumbnail={data.videoThumbnail}
                specs={buildSpecs(data)}
                chips={buildChips(data)}
                sellerName={data.sellerName}
                sellerAvatarUrl={data.sellerAvatarUrl}
                sellerProfileHref={data.sellerProfileHref}
                savesCount={data.engagement?.saves}
                isSaved={saved}
                onSave={async (event) => {
                    event.stopPropagation();
                    await handleSave();
                }}
                onNavigate={() => router.push(data.href)}
                onSellerNavigate={data.sellerProfileHref ? () => router.push(data.sellerProfileHref!) : undefined}
                shareText={`Mira esta propiedad: ${data.title} - ${data.price}`}
                onReport={() => alert('Función de reportar próximamente disponible')}
                emptyMediaIcon={<IconBuilding size={28} className="text-white/40" />}
            />
        );
    }

    return (
        <MarketplaceReelListingCard
            mode={mode}
            href={data.href}
            title={data.title}
            price={data.price}
            priceOriginal={data.priceOriginal}
            location={data.location}
            ctaLabel={ctaLabel}
            images={data.images}
            videoUrl={data.videoUrl}
            videoThumbnail={data.videoThumbnail}
            specs={buildSpecs(data)}
            chips={buildChips(data)}
            sellerName={data.sellerName}
            sellerAvatarUrl={data.sellerAvatarUrl}
            sellerProfileHref={data.sellerProfileHref}
            savesCount={data.engagement?.saves}
            isSaved={saved}
            onSave={async (event) => {
                event.stopPropagation();
                await handleSave();
            }}
            onNavigate={() => router.push(data.href)}
            onSellerNavigate={data.sellerProfileHref ? () => router.push(data.sellerProfileHref!) : undefined}
            shareText={`Mira esta propiedad: ${data.title} - ${data.price}`}
            onReport={() => alert('Función de reportar próximamente disponible')}
            emptyMediaIcon={<IconHome size={28} className="text-white/40" />}
        />
    );
}
