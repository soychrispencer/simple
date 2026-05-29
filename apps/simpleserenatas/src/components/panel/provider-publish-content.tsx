'use client';

import { useEffect, useMemo, useState } from 'react';
import { serenatasApi } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { publicMariachiProfileUrl } from '@/lib/public-mariachi-routes';
import { countPricedActiveServices } from '@/lib/provider-group-publish';
import { ProviderPublicProfileLink, ProviderPublishQrPanel } from './provider-public-profile-link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function ProviderPublishContent({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, hasMariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();
    const [activeServiceCount, setActiveServiceCount] = useState(0);
    const [servicesLoading, setServicesLoading] = useState(false);

    useEffect(() => {
        if (!mariachi?.id) {
            setActiveServiceCount(0);
            return;
        }
        let cancelled = false;
        setServicesLoading(true);
        void serenatasApi.providerGroupServices(mariachi.id).then((response) => {
            if (cancelled) return;
            setServicesLoading(false);
            if (!response.ok) {
                setActiveServiceCount(0);
                return;
            }
            setActiveServiceCount(countPricedActiveServices(response.items));
        });
        return () => {
            cancelled = true;
        };
    }, [mariachi?.id]);

    const canPublish = useMemo(
        () => (mariachi ? activeServiceCount > 0 : false),
        [mariachi, activeServiceCount],
    );

    const isPublished = mariachi?.status === 'active';
    const publicUrl = useMemo(
        () => (mariachi ? publicMariachiProfileUrl(mariachi.slug, APP_URL || undefined) : ''),
        [mariachi?.slug],
    );
    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return null;
    }

    if (!hasMariachi || !mariachi) {
        return null;
    }

    return (
        <div className="grid w-full min-w-0 gap-5">
            <ProviderPublicProfileLink
                group={mariachi}
                published={isPublished}
                canPublish={canPublish}
                showMobileQrToggle={false}
                onSaved={async () => {
                    await refreshMariachi();
                    await refresh();
                }}
            />
            <ProviderPublishQrPanel group={mariachi} url={publicUrl} />
        </div>
    );
}
