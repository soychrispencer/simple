'use client';

import { PanelCard } from '@simple/ui/panel';

export function MariachiProfileSkeleton() {
    return (
        <div className="grid min-w-0 gap-4 sm:gap-5" aria-busy="true" aria-label="Cargando ficha del mariachi">
            <PanelCard className="min-w-0 overflow-hidden !p-0">
                <div className="aspect-video min-h-[14rem] animate-pulse bg-bg-subtle" />
                <div className="flex flex-wrap gap-4 border-b border-border px-4 py-3">
                    <div className="h-7 w-24 animate-pulse rounded-md bg-bg-subtle" />
                    <div className="h-7 w-20 animate-pulse rounded-md bg-bg-subtle" />
                </div>
                <div className="space-y-2 px-4 py-5">
                    <div className="h-3 w-24 animate-pulse rounded bg-bg-subtle" />
                    <div className="h-4 w-full animate-pulse rounded bg-bg-subtle" />
                </div>
            </PanelCard>
            <div className="h-28 animate-pulse rounded-xl border border-border bg-bg-subtle/60" />
            <PanelCard className="min-w-0 p-4 sm:p-5">
                <div className="h-6 w-48 animate-pulse rounded bg-bg-subtle" />
                <div className="mt-5 space-y-3">
                    {Array.from({ length: 2 }, (_, index) => (
                        <div key={index} className="overflow-hidden rounded-xl border border-border">
                            <div className="h-20 animate-pulse bg-bg-subtle" />
                            <div className="h-14 animate-pulse bg-bg-subtle/70" />
                        </div>
                    ))}
                </div>
            </PanelCard>
        </div>
    );
}
