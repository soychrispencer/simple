'use client';

import { useEffect, useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { PanelButtonLink } from '@simple/ui/panel';
import { PublicProviderGroupCard } from '@/components/public/public-provider-group-card';
import { fetchFeaturedBoosted } from '@/lib/boost';
import { profileHrefWithDate } from '@/lib/marketplace-search';
import { sortMarketplaceGroups } from '@/lib/marketplace-group-display';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import type { FeaturedBoostItem } from '@simple/utils';

const FEATURED_COUNT = 3;

type FeaturedGroup = ProviderGroup & { boosted?: boolean };

type FeaturedStatus = { loading: boolean; error: string | null };

function slugFromHref(href: string): string {
    return href.replace(/^\//, '').split('?')[0]?.trim() ?? '';
}

function parseStartingPrice(priceLabel: string): number | null {
    const digits = priceLabel.replace(/[^\d]/g, '');
    if (!digits) return null;
    const value = Number.parseInt(digits, 10);
    return Number.isFinite(value) ? value : null;
}

function mapBoostToGroup(item: FeaturedBoostItem): FeaturedGroup {
    const subtitleParts = item.subtitle.split(' · ').map((part) => part.trim()).filter(Boolean);
    const comunaBase = subtitleParts[0] ?? null;
    const region = subtitleParts[1] ?? (item.location !== 'Chile' ? item.location : null);
    const imageUrls = item.imageUrls ?? [];
    const coverUrl = imageUrls[0] ?? item.imageUrl ?? null;
    const logoUrl = imageUrls[1] ?? item.imageUrl ?? null;
    const now = new Date().toISOString();

    return {
        id: item.id,
        ownerUserId: item.owner?.id ?? '',
        ownerId: item.owner?.id ?? null,
        name: item.title,
        slug: slugFromHref(item.href),
        description: null,
        logoUrl,
        coverUrl,
        phone: item.owner?.phone ?? null,
        whatsapp: null,
        publicEmail: item.owner?.email ?? null,
        websiteUrl: null,
        instagramUrl: null,
        facebookUrl: null,
        linkedinUrl: null,
        tiktokUrl: null,
        youtubeUrl: null,
        twitterUrl: null,
        region,
        comunaBase,
        countryCode: 'CL',
        serviceComunas: comunaBase ? [comunaBase] : [],
        status: 'active',
        isVerified: false,
        ratingAverage: 0,
        ratingCount: 0,
        startingPrice: parseStartingPrice(item.price),
        activeServicesCount: 0,
        servicesPreview: [],
        createdAt: now,
        updatedAt: now,
        boosted: true,
    };
}

function findGroupMatch(
    item: FeaturedBoostItem,
    catalogById: Map<string, ProviderGroup>,
    catalogBySlug: Map<string, ProviderGroup>,
): FeaturedGroup | null {
    const fromCatalog = catalogById.get(item.id) ?? catalogBySlug.get(slugFromHref(item.href));
    if (!fromCatalog) return null;
    return { ...fromCatalog, boosted: true };
}

async function loadFeaturedGroups(): Promise<{ items: FeaturedGroup[]; error: string | null }> {
    const landingBoosted = await fetchFeaturedBoosted('landing', FEATURED_COUNT);
    const items: FeaturedGroup[] = [];
    const seenKeys = new Set<string>();

    const catalogResponse = await serenatasApi.marketplaceGroups({ limit: 48, offset: 0 });
    const catalog = catalogResponse.ok ? catalogResponse.items : [];
    const catalogById = new Map(catalog.map((group) => [group.id, group]));
    const catalogBySlug = new Map(catalog.map((group) => [group.slug, group]));

    const appendBoostItems = (boostItems: FeaturedBoostItem[]) => {
        for (const item of boostItems) {
            if (items.length >= FEATURED_COUNT) break;
            const key = item.id || slugFromHref(item.href);
            if (!key || seenKeys.has(key)) continue;

            const matched = findGroupMatch(item, catalogById, catalogBySlug);
            if (matched) {
                items.push(matched);
                seenKeys.add(matched.id);
                seenKeys.add(matched.slug);
                continue;
            }

            const mapped = mapBoostToGroup(item);
            if (!mapped.slug) continue;
            items.push(mapped);
            seenKeys.add(mapped.id);
            seenKeys.add(mapped.slug);
        }
    };

    appendBoostItems(landingBoosted);

    if (items.length < FEATURED_COUNT) {
        const marketplaceBoosted = await fetchFeaturedBoosted('marketplace', FEATURED_COUNT - items.length);
        appendBoostItems(marketplaceBoosted);
    }

    if (items.length >= FEATURED_COUNT) {
        return { items: items.slice(0, FEATURED_COUNT), error: null };
    }

    if (!catalogResponse.ok) {
        return {
            items,
            error: items.length === 0 ? (catalogResponse.error ?? 'No pudimos cargar destacados.') : null,
        };
    }

    for (const group of sortMarketplaceGroups(catalog, 'recommended')) {
        if (items.length >= FEATURED_COUNT) break;
        if (seenKeys.has(group.id) || seenKeys.has(group.slug)) continue;
        items.push({ ...group, boosted: false });
        seenKeys.add(group.id);
        seenKeys.add(group.slug);
    }

    return { items, error: null };
}

export function FeaturedMariachisSection({
    date,
    onOpen,
}: {
    date?: string;
    onOpen: (slug: string) => void;
}) {
    const [featured, setFeatured] = useState<FeaturedGroup[]>([]);
    const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatus>({ loading: true, error: null });

    useEffect(() => {
        let cancelled = false;

        void loadFeaturedGroups().then(({ items, error }) => {
            if (cancelled) return;
            setFeatured(items);
            setFeaturedStatus({ loading: false, error });
        });

        return () => {
            cancelled = true;
        };
    }, []);

    if (featuredStatus.loading) {
        return null;
    }

    return (
        <section id="destacados" className="scroll-mt-24 border-b py-14 border-border sm:py-18">
            <div className="container-app max-w-6xl">
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                            Catálogo
                        </p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                            Mariachis destacados
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
                            Grupos con mayor visibilidad y una muestra del catálogo. Filtra por zona, nombre y fecha con cupo disponible.
                        </p>
                    </div>
                    <PanelButtonLink
                        href="/mariachis"
                        variant="secondary"
                        className="h-11 px-5 sm:self-center"
                    >
                        Ver todos
                        <IconChevronRight size={17} />
                    </PanelButtonLink>
                </div>

                {featured.length === 0 ? (
                    <div className="rounded-card border p-8 text-center border-border bg-surface">
                        <p className="text-sm text-fg-muted">
                            {featuredStatus.error ?? 'Aún no hay mariachis publicados en el catálogo.'}
                        </p>
                        <PanelButtonLink href="/mariachis" variant="accent" className="mt-4 h-11 px-6">
                            Explorar catálogo
                        </PanelButtonLink>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-3">
                        {featured.map((group) => (
                            <PublicProviderGroupCard
                                key={group.id}
                                group={group}
                                href={profileHrefWithDate(group.slug, date)}
                                onOpen={onOpen}
                                boosted={group.boosted}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
