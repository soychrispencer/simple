'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import FeaturedCardSwiper from '../listing-card/featured-card-swiper';

export type FeaturedBoostTab<T extends string = string> = {
    key: T;
    label: string;
};

export type FeaturedBoostSliderSectionProps<T extends string = string> = {
    title?: string;
    subtitle?: string;
    viewMoreHref: string;
    viewMoreLabel: string;
    tabs: FeaturedBoostTab<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    loading: boolean;
    emptyMessage: string;
    slides: Array<{ key: string; node: ReactNode }>;
    placeholderAspectClass?: string;
};

export function FeaturedBoostSliderSection<T extends string = string>({
    title = 'Publicaciones destacadas',
    subtitle = 'Ordenadas por campañas Boost activas.',
    viewMoreHref,
    viewMoreLabel,
    tabs,
    activeTab,
    onTabChange,
    loading,
    emptyMessage,
    slides,
    placeholderAspectClass = 'aspect-4/3',
}: FeaturedBoostSliderSectionProps<T>) {
    const hasSlides = slides.length > 0;

    return (
        <section className="border-t border-(--border)">
            <div className="container-app py-14">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="type-section-title text-(--fg)">{title}</h2>
                        <p className="mt-1 text-sm text-(--fg-secondary)">{subtitle}</p>
                    </div>
                    <Link
                        href={viewMoreHref}
                        className="inline-flex items-center gap-1 text-sm font-medium text-(--fg-muted)"
                    >
                        {viewMoreLabel} <IconArrowRight size={12} />
                    </Link>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onTabChange(tab.key)}
                            className={`featured-boost-tab h-9 rounded-button border px-4 text-sm transition-all hover:border-(--border-strong) hover:bg-(--bg-subtle) hover:text-(--fg) ${
                                activeTab === tab.key ? 'featured-boost-tab--active' : ''
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={`placeholder-${index}`}
                                className="w-[calc(85%-8px)] shrink-0 animate-pulse rounded-2xl border border-(--border) bg-(--surface) sm:w-[45%] md:w-[32%] xl:w-[24%]"
                            >
                                <div className={`${placeholderAspectClass} rounded-t-2xl bg-(--bg-muted)`} />
                                <div className="space-y-2 p-4">
                                    <div className="h-4 rounded bg-(--bg-muted)" />
                                    <div className="h-3 w-3/4 rounded bg-(--bg-muted)" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !hasSlides ? (
                    <article className="w-full rounded-xl border border-(--border) bg-(--surface) p-8 text-center">
                        <p className="text-sm text-(--fg-secondary)">{emptyMessage}</p>
                    </article>
                ) : (
                    <FeaturedCardSwiper items={slides} />
                )}
            </div>
        </section>
    );
}
