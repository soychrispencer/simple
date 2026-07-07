'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { OperatorDirectoryFilterChip } from './types.js';

export type OperatorDirectoryPageFrameProps = {
    breadcrumb?: ReactNode;
    title: string;
    description?: string;
    search: ReactNode;
    stickySearch?: boolean;
    resultsEyebrow?: string;
    resultsLabel: string;
    sortControl?: ReactNode;
    filterChips?: OperatorDirectoryFilterChip[];
    clearFiltersHref?: string;
    clearFiltersLabel?: string;
    children: ReactNode;
    beforeResults?: ReactNode;
};

export function OperatorDirectoryFilterChips({
    chips,
    clearHref,
    clearLabel = 'Limpiar filtros',
}: {
    chips: OperatorDirectoryFilterChip[];
    clearHref?: string;
    clearLabel?: string;
}) {
    if (chips.length === 0) return null;

    return (
        <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
                <Link
                    key={chip.id}
                    href={chip.href}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs font-medium text-fg transition-colors hover:bg-bg-muted"
                >
                    {chip.label}
                    <span className="text-fg-muted" aria-hidden>×</span>
                </Link>
            ))}
            {clearHref ? (
                <Link href={clearHref} className="text-xs font-semibold text-accent hover:underline">
                    {clearLabel}
                </Link>
            ) : null}
        </div>
    );
}

export function OperatorDirectoryPageFrame({
    breadcrumb,
    title,
    description,
    search,
    stickySearch = true,
    resultsEyebrow = 'Resultados',
    resultsLabel,
    sortControl,
    filterChips = [],
    clearFiltersHref,
    clearFiltersLabel,
    children,
    beforeResults,
}: OperatorDirectoryPageFrameProps) {
    return (
        <div className="container-app py-6 sm:py-10">
            {breadcrumb ? <div className="mb-6">{breadcrumb}</div> : null}

            <div className="mb-6 max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
                {description ? (
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-base">{description}</p>
                ) : null}
            </div>

            <div
                className={
                    stickySearch
                        ? 'sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 -mx-3 mb-6 border-b border-border bg-(--bg)/95 px-3 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none'
                        : 'mb-6'
                }
            >
                {search}
            </div>

            {beforeResults}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{resultsEyebrow}</p>
                    <p className="mt-2 text-sm text-fg-muted">{resultsLabel}</p>
                </div>
                {sortControl ? <div className="grid w-full gap-1.5 sm:w-52">{sortControl}</div> : null}
            </div>

            <OperatorDirectoryFilterChips
                chips={filterChips}
                clearHref={clearFiltersHref}
                clearLabel={clearFiltersLabel}
            />

            <div className="mt-6">{children}</div>
        </div>
    );
}

/** Inserta nodos de publicidad inline cada N items en un grid de directorio. */
export function interleaveDirectoryGridItems<T>(
    items: T[],
    renderItem: (item: T, index: number) => ReactNode,
    renderAd: (slotIndex: number) => ReactNode,
    interval = 6,
): ReactNode[] {
    const nodes: ReactNode[] = [];
    let adSlot = 0;

    items.forEach((item, index) => {
        nodes.push(renderItem(item, index));
        if ((index + 1) % interval === 0) {
            nodes.push(renderAd(adSlot));
            adSlot += 1;
        }
    });

    return nodes;
}
