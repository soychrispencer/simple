'use client';

import Link from 'next/link';
import { BrandLogo } from '@simple/ui/brand';
import { PanelNotice } from '@simple/ui/panel';
import { ScreenShell } from '@/components/layout/screen-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { serenatasExploreNavLinks } from '@/components/layout/landing-header';
import { MariachiProfileContent } from '@/components/public/mariachi-profile-content';
import { MariachiProfileSkeleton } from '@/components/public/mariachi-profile-skeleton';
import { useMarketplaceGroup, type MarketplaceGroupData } from '@/hooks/use-marketplace-group';

export function PublicMariachiPage({
    slug,
    initialData,
}: {
    slug: string;
    initialData?: MarketplaceGroupData;
}) {
    const { group, services, loading, error } = useMarketplaceGroup(slug, { fallbackData: initialData });

    return (
        <ScreenShell>
            <SerenatasChromeHeader publicLinks={serenatasExploreNavLinks} />
            <div className="mx-auto min-w-0 w-full max-w-5xl overflow-x-hidden px-3 py-4 pb-8 sm:px-6 sm:py-6 lg:py-8">
                {loading ? (
                    <MariachiProfileSkeleton />
                ) : error || !group ? (
                    <div className="grid gap-4">
                        <PanelNotice tone="warning">
                            {error ?? 'Este mariachi no está disponible o aún no se publica en el marketplace.'}
                        </PanelNotice>
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                            <BrandLogo appId="simpleserenatas" size="sm" />
                            Volver al inicio
                        </Link>
                    </div>
                ) : (
                    <MariachiProfileContent group={group} services={services} />
                )}
            </div>
        </ScreenShell>
    );
}
