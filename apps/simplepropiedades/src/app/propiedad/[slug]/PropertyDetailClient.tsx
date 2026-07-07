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

function findSummaryValue(summary: string[], patterns: RegExp[]) {
    return summary.find((entry) => patterns.some((pattern) => pattern.test(entry))) ?? 'Por definir';
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
                                value={findSummaryValue(item.summary, [/dorm/i, /habitaci/i])}
                            />
                            <PublicListingDetailSpecItem
                                icon={<IconBath size={20} />}
                                label="Baños"
                                value={findSummaryValue(item.summary, [/baño/i, /bano/i])}
                            />
                            <PublicListingDetailSpecItem
                                icon={<IconRuler size={20} />}
                                label="Superficie"
                                value={findSummaryValue(item.summary, [/m²/i, /m2/i, /metros/i])}
                            />
                            <PublicListingDetailSpecItem
                                icon={<IconBuilding size={20} />}
                                label="Tipo"
                                value={findSummaryValue(item.summary, [/casa|depto|departamento|oficina|local|terreno|bodega/i])}
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
                                            {entry}
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
                </div>

                <aside className="public-listing-detail-layout__aside">
                    <PublicListingDetailPriceCard
                        price={item.price}
                        publishedAgo={item.publishedAgo}
                        views={item.views}
                    />
                    {sellerBlock}
                </aside>
            </div>
        </div>
    );
}
