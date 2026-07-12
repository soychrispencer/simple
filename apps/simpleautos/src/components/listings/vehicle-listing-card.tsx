'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@simple/utils';
import {
    MarketplaceReelListingCard,
    abbreviateListingSpecLabel,
    orderVehicleCardTags,
    vehicleSpecIconForLabel,
    type MarketplaceReelChip,
    type MarketplaceReelSpec,
} from '@simple/ui/listings';
import {
    IconCar,
    IconGauge,
    IconGasStation,
    IconManualGearbox,
} from '@tabler/icons-react';

type CardVariant = 'sale' | 'rent' | 'auction';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type VehicleListingCardData = {
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
    vehicleType?: string;
    km?: string;
    fuelType?: string;
    transmission?: string;
    auctionBids?: number;
    auctionTime?: string;
    live?: boolean;
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
    /** Condición (detalle público); no se muestra como chip en la card. */
    condition?: string;
};

type Props = {
    data: VehicleListingCardData;
    mode: 'grid' | 'list';
};

function variantLabel(variant?: CardVariant): string {
    if (variant === 'rent') return 'Arriendo';
    if (variant === 'auction') return 'Subasta';
    return 'Venta';
}

function buildSpecs(data: VehicleListingCardData): MarketplaceReelSpec[] {
    if (data.meta.length > 0) {
        return orderVehicleCardTags(data.meta).map((label, index) => ({
            icon: vehicleSpecIconForLabel(label, index),
            label: abbreviateListingSpecLabel(label),
        }));
    }

    const allText = [...data.meta, data.title].join(' ').toLowerCase();
    const specs: MarketplaceReelSpec[] = [];

    const typeMatch = allText.match(/(sedán|sedan|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible)/);
    const type = data.vehicleType || (typeMatch ? typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1) : 'Auto');
    if (type) specs.push({ icon: <IconCar size={20} />, label: abbreviateListingSpecLabel(type) });

    const kmMatch = allText.match(/(\d+[\d.]*)\s*(km|kilometros|kilómetros)/);
    const km = data.km || (kmMatch ? `${kmMatch[1]} km` : '');
    if (km) specs.push({ icon: <IconGauge size={20} />, label: abbreviateListingSpecLabel(km) });

    const fuel = data.fuelType || (
        allText.includes('bencina') || allText.includes('gasolina') ? 'Bencina' :
            allText.includes('diesel') || allText.includes('diésel') ? 'Diesel' :
                allText.includes('hibrido') || allText.includes('híbrido') ? 'Híbrido' :
                    allText.includes('electrico') || allText.includes('eléctrico') ? 'Eléctrico' : ''
    );
    if (fuel) specs.push({ icon: <IconGasStation size={20} />, label: abbreviateListingSpecLabel(fuel) });

    const transmission = data.transmission || (
        allText.includes('automatico') || allText.includes('automático') ? 'Automático' :
            allText.includes('cvt') ? 'CVT' :
                allText.includes('secuencial') ? 'Secuencial' :
                    allText.includes('manual') ? 'Manual' : ''
    );
    if (transmission) specs.push({ icon: <IconManualGearbox size={20} />, label: abbreviateListingSpecLabel(transmission) });

    return specs.slice(0, 4);
}

function buildChips(data: VehicleListingCardData): MarketplaceReelChip[] {
    const chips: MarketplaceReelChip[] = [{ label: variantLabel(data.variant) }];
    if (data.financing) chips.push({ label: 'Financiamiento' });
    if (data.exchange) chips.push({ label: 'Permuta' });
    else if (data.negotiable) chips.push({ label: 'Conversable' });
    if (data.live) chips.push({ label: 'En vivo' });
    return chips;
}

export default function VehicleListingCard({ data, mode }: Props) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSaved(isListingSaved(data.id));
        return subscribeSavedListings(() => setSaved(isListingSaved(data.id)));
    }, [data.id]);

    const ctaLabel = data.ctaLabel ?? (data.variant === 'rent' ? 'Ver disponibilidad' : data.variant === 'auction' ? 'Ver subasta' : 'Ver detalle');

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
                accent="autos"
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
                shareText={`Mira este vehículo: ${data.title} - ${data.price}`}
                onReport={() => alert('Función de reportar próximamente disponible')}
                emptyMediaIcon={<IconCar size={28} className="text-white/40" />}
            />
        );
    }

    return (
        <MarketplaceReelListingCard
            mode={mode}
            accent="autos"
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
            shareText={`Mira este vehículo: ${data.title} - ${data.price}`}
            onReport={() => alert('Función de reportar próximamente disponible')}
            emptyMediaIcon={<IconCar size={28} className="text-white/40" />}
        />
    );
}
