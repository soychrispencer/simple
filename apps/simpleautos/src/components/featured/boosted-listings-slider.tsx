'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    IconArrowRight,
    IconBolt,
    IconCar,
    IconChevronLeft,
    IconChevronRight,
    IconMapPin,
} from '@tabler/icons-react';
import {
    BOOST_SECTION_META,
    fetchFeaturedBoosted,
    type BoostSection,
    type FeaturedBoostItem,
} from '@/lib/boost';

const SECTIONS: BoostSection[] = ['sale', 'rent', 'auction'];

export default function BoostedListingsSlider() {
    const [section, setSection] = useState<BoostSection>('sale');
    const [items, setItems] = useState<FeaturedBoostItem[]>([]);
    const [loading, setLoading] = useState(true);

    const sliderRef = useRef<HTMLDivElement | null>(null);
    const sectionMeta = BOOST_SECTION_META[section];

    const loadItems = useCallback(async () => {
        setLoading(true);
        const featured = await fetchFeaturedBoosted(section, 8);
        setItems(featured);
        setLoading(false);
    }, [section]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const scrollByCards = (direction: -1 | 1) => {
        const node = sliderRef.current;
        if (!node) return;
        node.scrollBy({ left: direction * 328, behavior: 'smooth' });
    };

    const cards = useMemo(() => {
        if (loading) {
            return Array.from({ length: 4 }, (_, index) => (
                <div
                    key={`placeholder-${index}`}
                    className="shrink-0 w-[280px] rounded-xl border animate-pulse"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="aspect-[4/3]" style={{ background: 'var(--bg-muted)' }} />
                    <div className="p-4 space-y-2">
                        <div className="h-4 rounded" style={{ background: 'var(--bg-muted)' }} />
                        <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-muted)' }} />
                    </div>
                </div>
            ));
        }

        if (items.length === 0) {
            return (
                <article
                    className="w-full rounded-xl border p-8 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        Aún no hay publicaciones impulsadas en esta sección.
                    </p>
                </article>
            );
        }

        return items.map((item) => (
            <Link
                key={item.id}
                href={item.href}
                className="shrink-0 w-[280px] rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div
                    className="aspect-[4/3] p-3 flex items-start justify-between"
                    style={{
                        background: item.imageUrl
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url(${item.imageUrl}) center / cover no-repeat`
                            : 'var(--bg-muted)',
                    }}
                >
                    <span
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
                        style={{
                            background: item.boosted ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.65)',
                            color: '#ffffff',
                        }}
                    >
                        <IconBolt size={12} />
                        {item.boosted ? item.planName : 'Orgánica'}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}>
                        <IconCar size={16} />
                    </div>
                </div>
                <div className="p-4 space-y-1.5">
                    <h3 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--fg)' }}>
                        {item.title}
                    </h3>
                    <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                        {item.price}
                    </p>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--fg-secondary)' }}>
                        {item.subtitle}
                    </p>
                    <p className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />
                        {item.location}
                    </p>
                </div>
            </Link>
        ));
    }, [items, loading]);

    return (
        <section style={{ borderTop: '1px solid var(--border)' }}>
            <div className="container-app py-14">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>
                            Publicaciones destacadas
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                            Ordenadas por campañas Boost activas.
                        </p>
                    </div>
                    <Link
                        href={sectionMeta.href}
                        className="text-sm font-medium inline-flex items-center gap-1"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Ver {sectionMeta.label.toLowerCase()} <IconArrowRight size={12} />
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {SECTIONS.map((itemSection) => (
                        <button
                            key={itemSection}
                            onClick={() => setSection(itemSection)}
                            className="h-9 px-4 rounded-md text-sm border transition-all hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                            style={{
                                borderColor: section === itemSection ? 'var(--button-primary-border)' : 'var(--border)',
                                background: section === itemSection ? 'var(--button-primary-bg)' : 'var(--surface)',
                                color: section === itemSection ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                            }}
                        >
                            {BOOST_SECTION_META[itemSection].label}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <div
                        ref={sliderRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {cards}
                    </div>
                    <div className="hidden md:flex items-center gap-2 absolute right-0 -top-12">
                        <button
                            onClick={() => scrollByCards(-1)}
                            className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            aria-label="Anterior"
                        >
                            <IconChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => scrollByCards(1)}
                            className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            aria-label="Siguiente"
                        >
                            <IconChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
