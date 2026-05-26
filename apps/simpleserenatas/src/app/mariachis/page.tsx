import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicMarketplacePage } from '@/components/public/public-marketplace-page';

export const metadata: Metadata = {
    title: 'Mariachis · Simple Serenatas',
    description: 'Explora mariachis por región, comuna y disponibilidad. Compara servicios y solicita tu serenata.',
};

export default function MariachisCatalogPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-fg-muted">
                    Cargando mariachis…
                </div>
            }
        >
            <PublicMarketplacePage />
        </Suspense>
    );
}
