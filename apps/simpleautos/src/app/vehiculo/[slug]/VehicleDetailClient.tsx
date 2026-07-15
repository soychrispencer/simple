'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    IconCalendar,
    IconCar,
    IconGauge,
    IconGasStation,
    IconManualGearbox,
    IconChevronDown,
} from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { SellerProductsCrossSell } from '@/components/listings/seller-products-cross-sell';
import { buildSimuladorCreditoHrefFromListing } from '@/lib/financiamiento/listing-href';
import { type PublicListing } from '@/lib/public-listings';
import { buildVehicleJsonLd, JsonLd } from '@/lib/schema';
import {
    PublicListingDetailGallery,
    PublicListingDetailHeader,
    PublicListingDetailPriceCard,
    PublicListingDetailSellerCard,
    PublicListingDetailSpecGrid,
    PublicListingDetailSpecItem,
} from '@simple/ui/listings';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelCard } from '@simple/ui/panel';
import { isVehicleConditionValue } from '@simple/utils';

function sectionBadgeTone(section: PublicListing['section']) {
    if (section === 'auction') return 'info' as const;
    if (section === 'rent') return 'warning' as const;
    return 'success' as const;
}

function vehicleHighlightTags(summary: string[]) {
    return summary.filter((entry) => {
        const lower = entry.toLowerCase();
        return lower.includes('dueño') || lower.includes('garantía');
    });
}

function resolveVehicleCondition(item: PublicListing): string {
    if (item.condition && isVehicleConditionValue(item.condition)) return item.condition;
    if (item.condition?.trim()) return item.condition.trim();
    const fromSummary = item.summary.find((entry) => isVehicleConditionValue(entry));
    return fromSummary || 'Usado';
}

function resolveTransmission(summary: string[]): string {
    const known = summary.find((entry) =>
        /manual|automática|automatico|automático|cvt|secuencial|dct|dsg|tiptronic/i.test(entry),
    );
    return known || 'Por definir';
}

interface VehicleDetailClientProps {
    item: PublicListing;
}

function CollapsibleSection({
    title,
    children,
    defaultExpanded = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <PanelCard size="lg">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={isExpanded}
            >
                <PanelBlockHeader title={title} className="mb-0" />
                <IconChevronDown
                    size={20}
                    className="transition-transform duration-200"
                    style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--fg-secondary)',
                    }}
                />
            </button>
            {isExpanded && <div className="mt-4">{children}</div>}
        </PanelCard>
    );
}

export default function VehicleDetailClient({ item }: VehicleDetailClientProps) {
    const sectionHref = item.section === 'rent'
        ? '/arriendos'
        : item.section === 'auction'
            ? '/subastas'
            : '/ventas';

    const contactBlock = (
        <>
            <PublicListingDetailSellerCard
                sellerName={item.seller?.name ?? 'Cuenta SimpleAutos'}
                sellerBadge={item.seller ? 'En SimpleAutos' : undefined}
                profileHref={item.seller?.profileHref}
                avatarUrl={item.seller?.avatarUrl}
            />
            <PublicListingContactCard
                listingId={item.id}
                listingTitle={item.title}
                sourcePage={item.href}
                seller={item.seller ? {
                    email: item.seller.email,
                    phone: item.seller.phone,
                    whatsapp: item.seller.whatsapp,
                } : null}
            />
        </>
    );

    const financingLink = item.section === 'sale' ? (
        <div className="mt-5 space-y-2">
            <Link
                href={buildSimuladorCreditoHrefFromListing(item)}
                className="flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
                Simular crédito automotriz
            </Link>
            <p className="text-center text-xs text-[var(--fg-muted)]">
                Referencial · pie habitual desde ~20% · sujeto a evaluación comercial
            </p>
        </div>
    ) : null;

    return (
        <div className="container-app py-8">
            <JsonLd data={buildVehicleJsonLd(item)} />
            <PublicBreadcrumbs
                className="mb-6 flex items-center gap-1.5 text-sm"
                items={[
                    { label: 'Inicio', href: '/' },
                    { label: item.sectionLabel ?? 'Vehículo', href: sectionHref },
                    { label: item.title ?? 'Detalle' },
                ]}
            />

            <div className="public-listing-detail-layout">
                <div className="public-listing-detail-layout__main">
                    <PublicListingDetailGallery
                        listingId={item.id}
                        title={item.title}
                        images={item.images}
                        videoUrl={item.videoUrl}
                        shareText={`Mira este ${item.title} en SimpleAutos`}
                    />

                    <PublicListingDetailHeader
                        title={item.title}
                        location={item.location}
                        badgeLabel={item.sectionLabel}
                        badgeTone={sectionBadgeTone(item.section)}
                        highlightTags={vehicleHighlightTags(item.summary)}
                    />

                    <PublicListingDetailSpecGrid>
                        <PublicListingDetailSpecItem
                            icon={<IconCar size={20} />}
                            label="Condición"
                            value={resolveVehicleCondition(item)}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconCalendar size={20} />}
                            label="Año"
                            value={item.year || item.summary.find((entry) => /^\d{4}$/.test(entry)) || 'N/A'}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconGauge size={20} />}
                            label="Kilometraje"
                            value={item.summary.find((entry) => entry.toLowerCase().includes('km')) || 'N/A'}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconManualGearbox size={20} />}
                            label="Transmisión"
                            value={resolveTransmission(item.summary)}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconGasStation size={20} />}
                            label="Combustible"
                            value={item.summary.find((entry) => ['Bencina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas'].includes(entry)) || 'Por definir'}
                        />
                    </PublicListingDetailSpecGrid>

                    <CollapsibleSection title="Descripción del vendedor" defaultExpanded={true}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap md:text-base" style={{ color: 'var(--fg-secondary)' }}>
                            {item.description || 'Esta publicación no incluye descripción adicional.'}
                        </div>
                    </CollapsibleSection>

                    {item.seller?.username ? (
                        <CollapsibleSection title="Más publicaciones del vendedor" defaultExpanded={false}>
                            <SellerProductsCrossSell
                                sellerUsername={item.seller.username}
                                sellerName={item.seller.name}
                                profileHref={item.seller.profileHref}
                            />
                        </CollapsibleSection>
                    ) : null}
                </div>

                <aside className="public-listing-detail-layout__aside">
                    <PublicListingDetailPriceCard
                        price={item.price}
                        priceOriginal={item.priceOriginal}
                        discountPercent={item.discountPercent}
                        publishedAgo={item.publishedAgo}
                        views={item.views}
                    >
                        {financingLink}
                    </PublicListingDetailPriceCard>
                    {contactBlock}
                </aside>
            </div>
        </div>
    );
}
