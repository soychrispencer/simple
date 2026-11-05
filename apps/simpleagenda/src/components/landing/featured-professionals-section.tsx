'use client';

import { useEffect, useState } from 'react';
import { IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { PanelButtonLink } from '@simple/ui/panel';
import { PublicProfessionalCard, type FeaturedProfessional } from '@/components/public/public-professional-card';
import { fetchFeaturedBoosted, type FeaturedBoostItem } from '@/lib/boost';
import { fetchMarketplaceProfessionals } from '@/lib/marketplace-professionals';

const FEATURED_COUNT = 3;

type FeaturedStatus = { loading: boolean; error: string | null };

const FALLBACK_PROFESSIONALS: FeaturedProfessional[] = [
    {
        slug: 'dra-valentina',
        displayName: 'Dra. Valentina Muñoz',
        profession: 'Psicóloga Clínica',
        headline: 'Atención psicológica individual y terapia de adultos en Providencia y online.',
        avatarUrl: '/hero/doctor-profile.jpg',
        coverUrl: '/hero/consultation-hero.webp',
        city: 'Providencia',
        region: 'RM',
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
        boosted: true,
    },
    {
        slug: 'esteban-carrasco',
        displayName: 'Esteban Carrasco',
        profession: 'Barbero Profesional & Estilista',
        headline: 'Cortes clásicos, perfilado de barba y asesoría de imagen en Viña del Mar.',
        avatarUrl: '/hero/barber-profile.jpg',
        coverUrl: '/hero/barber-profile.jpg',
        city: 'Viña del Mar',
        region: 'Valparaíso',
        countryCode: 'CL',
        servesOnline: false,
        servesPresential: true,
        boosted: true,
    },
    {
        slug: 'camila-silva',
        displayName: 'Camila Silva',
        profession: 'Nutricionista Deportiva',
        headline: 'Planes nutricionales personalizados, composición corporal y rendimiento.',
        avatarUrl: '/hero/nutrition-profile.jpg',
        coverUrl: '/hero/nutrition-profile.jpg',
        city: 'Las Condes',
        region: 'RM',
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
        boosted: true,
    },
];

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
    try {
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
        if (catalog.ok && catalog.items.length > 0) {
            for (const professional of catalog.items) {
                if (items.length >= FEATURED_COUNT) break;
                if (seenSlugs.has(professional.slug)) continue;
                items.push({ ...professional, boosted: false });
                seenSlugs.add(professional.slug);
            }
        }

        // Si la base está vacía o hay menos de los necesarios, usamos los perfiles modelo garantizados
        if (items.length === 0) {
            return { items: FALLBACK_PROFESSIONALS, error: null };
        }

        return { items, error: null };
    } catch {
        return { items: FALLBACK_PROFESSIONALS, error: null };
    }
}

export function FeaturedProfessionalsSection() {
    const [featured, setFeatured] = useState<FeaturedProfessional[]>(FALLBACK_PROFESSIONALS);
    const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatus>({ loading: false, error: null });

    useEffect(() => {
        let cancelled = false;

        void loadFeaturedProfessionals().then(({ items, error }) => {
            if (cancelled) return;
            setFeatured(items.length > 0 ? items : FALLBACK_PROFESSIONALS);
            setFeaturedStatus({ loading: false, error });
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section id="destacados" className="scroll-mt-24 border-b border-(--border) py-14 sm:py-20" style={{ background: 'var(--bg-subtle)' }}>
            <div className="container-app">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3.5 border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-2xs">
                            <IconSparkles size={14} />
                            Comunidad activa
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--fg)] leading-tight">
                            Profesionales que ya usan SimpleAgenda
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm sm:text-base text-[var(--fg-secondary)] leading-relaxed">
                            Explora perfiles y agendas en vivo. Tus clientes disfrutarán de esta misma experiencia de reserva simple, rápida y sin registro.
                        </p>
                    </div>
                    <PanelButtonLink
                        href="/profesionales"
                        variant="secondary"
                        className="h-11 px-5 sm:self-center shrink-0 rounded-xl"
                    >
                        Ver directorio completo
                        <IconChevronRight size={17} />
                    </PanelButtonLink>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {featured.map((professional) => (
                        <PublicProfessionalCard key={professional.slug} professional={professional} />
                    ))}
                </div>
            </div>
        </section>
    );
}
