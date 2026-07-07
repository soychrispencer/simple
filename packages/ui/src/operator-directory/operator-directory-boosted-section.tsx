'use client';

import type { ReactNode } from 'react';

export function OperatorDirectoryBoostedSection({
    title = 'Destacados',
    description,
    children,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{title}</p>
            {description ? (
                <p className="mt-2 text-sm text-fg-muted">{description}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {children}
            </div>
        </section>
    );
}
