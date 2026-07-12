'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@simple/utils';
import { IconBuilding, IconHome } from '@tabler/icons-react';
import {
    MarketplaceReelListingCard,
    abbreviateListingSpecLabel,
    orderPropertyCardTags,
    propertySpecIconForLabel,
    type MarketplaceReelChip,
    type MarketplaceReelSpec,
} from '@simple/ui/listings';

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
    parkingSpaces?: number;
    storageUnits?: number;
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
    const orderedMeta = orderPropertyCardTags(data.meta, data.propertyType);
    if (orderedMeta.length > 0) {
        return orderedMeta.map((label) => ({
            icon: propertySpecIconForLabel(label),
            label: abbreviateListingSpecLabel(label),
        }));
    }

    const allText = [...data.meta, data.title, data.propertyType ?? ''].join(' ').toLowerCase();
    const type = data.propertyType ||
        (allText.includes('casa') ? 'Casa' :
            allText.includes('departamento') || allText.includes('depto') ? 'Depto' :
                allText.includes('oficina') ? 'Oficina' :
                    allText.includes('local') ? 'Local comercial' :
                        allText.includes('parcela') ? 'Parcela' :
                            allText.includes('terreno') ? 'Terreno' :
                                allText.includes('bodega') ? 'Bodega' : 'Propiedad');

    const fallbackTags: string[] = [];
    if (/casa|depto|departamento|local/i.test(type)) {
        if (data.bedrooms != null) fallbackTags.push(`${data.bedrooms}D`);
        if (data.bathrooms != null) fallbackTags.push(`${data.bathrooms}B`);
        if (data.parkingSpaces != null) fallbackTags.push(`${data.parkingSpaces}E`);
        if (data.storageUnits != null) fallbackTags.push(`${data.storageUnits}Bo`);
    } else if (/terreno|parcela/i.test(type)) {
        fallbackTags.push(type);
        if (data.surface) fallbackTags.push(data.surface.includes('m') ? data.surface : `${data.surface} m²`);
    } else if (/oficina/i.test(type)) {
        fallbackTags.push(type);
        if (data.surface) fallbackTags.push(data.surface.includes('m') ? data.surface : `${data.surface} m²`);
        if (data.parkingSpaces != null) fallbackTags.push(`${data.parkingSpaces}E`);
        if (data.storageUnits != null) fallbackTags.push(`${data.storageUnits}Bo`);
    } else {
        fallbackTags.push(type);
        if (data.surface) fallbackTags.push(data.surface.includes('m') ? data.surface : `${data.surface} m²`);
        if (data.parkingSpaces != null) fallbackTags.push(`${data.parkingSpaces}E`);
    }

    return orderPropertyCardTags(fallbackTags, type).map((label) => ({
        icon: propertySpecIconForLabel(label),
        label: abbreviateListingSpecLabel(label),
    }));
}

function buildChips(data: PropertyListingCardData): MarketplaceReelChip[] {
    const chips: MarketplaceReelChip[] = [{ label: variantLabel(data.variant) }];
    if (data.projectStatus) chips.push({ label: data.projectStatus });
    if (data.financing) chips.push({ label: 'Financiamiento' });
    if (data.negotiable) chips.push({ label: 'Conversable' });
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
                accent="propiedades"
                href={data.href}
                title={data.title}
                price={data.price}
                priceOriginal={data.priceOriginal}
                discountPercent={data.discountPercent}
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
            accent="propiedades"
            href={data.href}
            title={data.title}
            price={data.price}
            priceOriginal={data.priceOriginal}
            discountPercent={data.discountPercent}
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
