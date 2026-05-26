'use client';

import Link from 'next/link';
import { BrandLogo } from '@simple/ui/brand';
import { PanelNotice } from '@simple/ui/panel';
import { ScreenShell } from '@/components/layout/screen-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { MariachiProfileContent } from '@/components/public/mariachi-profile-content';
import { useMarketplaceGroup } from '@/hooks/use-marketplace-group';

export function PublicMariachiPage({ slug }: { slug: string }) {
    const { group, services, loading, error } = useMarketplaceGroup(slug);

    return (
        <ScreenShell>
            <SerenatasChromeHeader
                publicLinks={[{ href: '/mariachis', label: 'Mariachis' }]}
            />
            <div className="mx-auto min-w-0 w-full max-w-5xl overflow-x-hidden px-4 py-6 sm:px-6 lg:py-8">
                {loading ? (
                    <p className="text-sm text-fg-muted">Cargando mariachi…</p>
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
