'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandLogo, PanelNotice } from '@simple/ui';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { ScreenShell } from '@/components/layout/screen-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { MariachiProfileContent } from '@/components/public/mariachi-profile-content';

export function PublicMariachiPage({ slug }: { slug: string }) {
    const [group, setGroup] = useState<ProviderGroup | null>(null);
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        void serenatasApi.marketplaceGroupBySlug(slug).then(async (groupResponse) => {
            if (cancelled) return;
            if (!groupResponse.ok || !groupResponse.item) {
                setLoading(false);
                setError(groupResponse.error ?? 'Mariachi no encontrado');
                return;
            }
            setGroup(groupResponse.item);
            const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
            if (cancelled) return;
            setServices(servicesResponse.ok ? servicesResponse.items : []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    return (
        <ScreenShell>
            <SerenatasChromeHeader
                publicLinks={[{ href: '/panel/mariachis', label: 'Mariachis' }]}
            />
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
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
