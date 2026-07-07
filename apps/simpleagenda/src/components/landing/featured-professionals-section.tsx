'use client';

import { useEffect, useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { PanelButtonLink } from '@simple/ui/panel';
import { PublicProfessionalCard, type FeaturedProfessional } from '@/components/public/public-professional-card';
import { fetchFeaturedBoosted, type FeaturedBoostItem } from '@/lib/boost';
import { fetchMarketplaceProfessionals } from '@/lib/marketplace-professionals';

const FEATURED_COUNT = 3;

type FeaturedStatus = { loading: boolean; error: string | null };

function slugFromHref(href: string): string {
    return href.replace(/^\//, '').split('?')[0] ?? '';
}

function mapBoostToProfessional(item: FeaturedBoostItem): FeaturedProfessional {
    const subtitleParts = item.subtitle.split(' · ').map((part) => part.trim()).filter(Boolean);
    const profession = subtitleParts[0] ?? null;
    const cityFromSubtitle = subtitleParts[1] ?? null;
    const imageUrls = item.imageUrls ?? [];
    const coverUrl = imageUrls[0] ?? item.imageUrl ?? null;
    const avatarUrl = imageUrls[1] ?? item.imageUrl ?? null;

    return {
        slug: slugFromHref(item.href),
        displayName: item.title,
        profession,
        headline: null,
        avatarUrl,
        coverUrl,
        city: cityFromSubtitle ?? (item.location !== 'Chile' ? item.location : null),
        region: null,
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
        boosted: true,
    };
}

async function loadFeaturedProfessionals(): Promise<{ items: FeaturedProfessional[]; error: string | null }> {
    const landingBoosted = await fetchFeaturedBoosted('landing', FEATURED_COUNT);
    const items = landingBoosted.map(mapBoostToProfessional);
    const seenSlugs = new Set(items.map((item) => item.slug));

    if (items.length < FEATURED_COUNT) {
        const marketplaceBoosted = await fetchFeaturedBoosted('marketplace', FEATURED_COUNT - items.length);
        for (const item of marketplaceBoosted) {
            const mapped = mapBoostToProfessional(item);
            if (seenSlugs.has(mapped.slug)) continue;
            items.push(mapped);
            seenSlugs.add(mapped.slug);
            if (items.length >= FEATURED_COUNT) break;
        }
    }

    if (items.length >= FEATURED_COUNT) {
        return { items: items.slice(0, FEATURED_COUNT), error: null };
    }

    const catalog = await fetchMarketplaceProfessionals({ limit: 24 });
    if (!catalog.ok) {
        return {
            items,
            error: items.length === 0 ? catalog.error : null,
        };
    }

    for (const professional of catalog.items) {
        if (items.length >= FEATURED_COUNT) break;
        if (seenSlugs.has(professional.slug)) continue;
        items.push({ ...professional, boosted: false });
        seenSlugs.add(professional.slug);
    }

    return {
        items,
        error: null,
    };
}

export function FeaturedProfessionalsSection() {
    const [featured, setFeatured] = useState<FeaturedProfessional[]>([]);
    const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatus>({ loading: true, error: null });

    useEffect(() => {
        let cancelled = false;

        void loadFeaturedProfessionals().then(({ items, error }) => {
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
        <section id="destacados" className="scroll-mt-24 border-b border-(--border) py-14 sm:py-18" style={{ background: 'var(--bg-subtle)' }}>
            <div className="container-app">
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                            Directorio
                        </p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                            Profesionales destacados
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
                            Reserva directa con profesionales publicados. Explora el directorio completo por rubro, zona y modalidad.
                        </p>
                    </div>
                    <PanelButtonLink
                        href="/profesionales"
                        variant="secondary"
                        className="h-11 px-5 sm:self-center"
                    >
                        Ver todos
                        <IconChevronRight size={17} />
                    </PanelButtonLink>
                </div>

                {featured.length === 0 ? (
                    <div className="rounded-card border border-(--border) bg-(--surface) p-8 text-center">
                        <p className="text-sm text-fg-muted">
                            {featuredStatus.error ?? 'Aún no hay profesionales publicados en el directorio.'}
                        </p>
                        <PanelButtonLink href="/profesionales" variant="accent" className="mt-4 h-11 px-6">
                            Explorar directorio
                        </PanelButtonLink>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-3">
                        {featured.map((professional) => (
                            <PublicProfessionalCard key={professional.slug} professional={professional} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
