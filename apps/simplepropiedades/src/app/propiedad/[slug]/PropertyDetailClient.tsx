'use client';

import {
    IconBed,
    IconBuilding,
    IconRuler,
    IconBath,
} from '@tabler/icons-react';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import PublicListingContactCard from '@/components/listings/public-listing-contact-card';
import { type PublicListing } from '@/lib/public-listings';
import { buildPropertyJsonLd, JsonLd } from '@/lib/schema';
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
import { SellerProductsCrossSell } from '@/components/listings/seller-products-cross-sell';

function sectionBadgeTone(section: PublicListing['section']) {
    if (section === 'project') return 'info' as const;
    if (section === 'rent') return 'warning' as const;
    return 'success' as const;
}

function sectionHref(section: PublicListing['section']) {
    if (section === 'rent') return '/arriendos';
    if (section === 'project') return '/proyectos';
    return '/ventas';
}

function propertyHighlightTags(summary: string[]) {
    return summary
        .filter((entry) => /proyecto|nuevo|entrega|inmobiliaria|dueño/i.test(entry))
        .slice(0, 3);
}

function expandCompactPropertyTag(entry: string): string {
    const dorm = entry.match(/^(\d+)\s*D$/i);
    if (dorm) return `${dorm[1]} dormitorio${dorm[1] === '1' ? '' : 's'}`;
    const bath = entry.match(/^(\d+)\s*B$/i);
    if (bath) return `${bath[1]} baño${bath[1] === '1' ? '' : 's'}`;
    const parking = entry.match(/^(\d+)\s*E$/i);
    if (parking) return `${parking[1]} estacionamiento${parking[1] === '1' ? '' : 's'}`;
    const storage = entry.match(/^(\d+)\s*Bo$/i);
    if (storage) return `${storage[1]} bodega${storage[1] === '1' ? '' : 's'}`;
    return entry;
}

function findSummaryValue(summary: string[], patterns: RegExp[]) {
    const match = summary.find((entry) => patterns.some((pattern) => pattern.test(entry)));
    return match ? expandCompactPropertyTag(match) : 'Por definir';
}

interface PropertyDetailClientProps {
    item: PublicListing;
}

export default function PropertyDetailClient({ item }: PropertyDetailClientProps) {
    const sellerBlock = (
        <>
            <PublicListingDetailSellerCard
                sellerName={item.seller?.name ?? 'Cuenta SimplePropiedades'}
                sellerBadge={item.seller ? 'En SimplePropiedades' : undefined}
                profileHref={item.seller?.profileHref}
                profileLinkLabel="Ver perfil público"
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

    return (
        <div className="container-app py-8">
            <JsonLd data={buildPropertyJsonLd(item)} />
            <PublicBreadcrumbs
                className="mb-6 flex items-center gap-1.5 text-sm"
                items={[
                    { label: 'Inicio', href: '/' },
                    { label: item.sectionLabel ?? 'Propiedad', href: sectionHref(item.section) },
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
                        shareText={`Mira esta propiedad en SimplePropiedades: ${item.title}`}
                    />

                    <PublicListingDetailHeader
                        title={item.title}
                        location={item.location}
                        badgeLabel={item.sectionLabel}
                        badgeTone={sectionBadgeTone(item.section)}
                        highlightTags={propertyHighlightTags(item.summary)}
                    />

                    <PublicListingDetailSpecGrid>
                        <PublicListingDetailSpecItem
                            icon={<IconBed size={20} />}
                            label="Dormitorios"
                            value={findSummaryValue(item.summary, [/^\d+\s*D$/i, /dorm/i, /habitaci/i])}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconBath size={20} />}
                            label="Baños"
                            value={findSummaryValue(item.summary, [/^\d+\s*B$/i, /baño/i, /bano/i])}
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconRuler size={20} />}
                            label={item.summary.some((entry) => /^\d+\s*E$/i.test(entry) || /estacionamiento/i.test(entry))
                                && !item.summary.some((entry) => /m²|m2|metros/i.test(entry))
                                ? 'Estacionamientos'
                                : 'Superficie'}
                            value={
                                findSummaryValue(item.summary, [/m²/i, /m2/i, /metros/i]) !== 'Por definir'
                                    ? findSummaryValue(item.summary, [/m²/i, /m2/i, /metros/i])
                                    : findSummaryValue(item.summary, [/^\d+\s*E$/i, /estacionamiento/i])
                            }
                        />
                        <PublicListingDetailSpecItem
                            icon={<IconBuilding size={20} />}
                            label={item.summary.some((entry) => /^\d+\s*Bo$/i.test(entry) || /bodega/i.test(entry))
                                && !item.summary.some((entry) => /casa|depto|departamento|oficina|local|terreno/i.test(entry))
                                ? 'Bodegas'
                                : 'Tipo'}
                            value={
                                findSummaryValue(item.summary, [/casa|depto|departamento|oficina|local|terreno/i]) !== 'Por definir'
                                    ? findSummaryValue(item.summary, [/casa|depto|departamento|oficina|local|terreno/i])
                                    : findSummaryValue(item.summary, [/^\d+\s*Bo$/i, /bodega/i])
                            }
                        />
                    </PublicListingDetailSpecGrid>

                    {item.summary.length > 0 ? (
                        <PanelCard size="lg">
                            <PanelBlockHeader title="Resumen" className="mb-4" />
                            <div className="flex flex-wrap gap-2">
                                {item.summary.map((entry) => (
                                    <span
                                        key={entry}
                                        className="rounded-full px-3 py-1 text-xs"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                    >
                                        {expandCompactPropertyTag(entry)}
                                    </span>
                                ))}
                            </div>
                        </PanelCard>
                    ) : null}

                    <PanelCard size="lg">
                        <PanelBlockHeader title="Descripción" className="mb-3" />
                        <p className="text-sm leading-relaxed whitespace-pre-wrap md:text-base" style={{ color: 'var(--fg-secondary)' }}>
                            {item.description || 'Esta publicación no incluye descripción adicional.'}
                        </p>
                    </PanelCard>

                    {item.seller?.username ? (
                        <SellerProductsCrossSell
                            sellerUsername={item.seller.username}
                            sellerName={item.seller.name}
                            profileHref={item.seller.profileHref}
                        />
                    ) : null}
                </div>

                <aside className="public-listing-detail-layout__aside">
                    <PublicListingDetailPriceCard
                        price={item.price}
                        priceOriginal={item.priceOriginal}
                        discountPercent={item.discountPercent}
                        publishedAgo={item.publishedAgo}
                        views={item.views}
                    />
                    {sellerBlock}
                </aside>
            </div>
        </div>
    );
}
