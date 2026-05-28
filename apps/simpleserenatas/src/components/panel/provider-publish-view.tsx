'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { IconCheck, IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelNotice, PanelSwitch } from '@simple/ui/panel';
import { serenatasApi } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import { publicMariachiProfileUrl } from '@/lib/public-mariachi-routes';
import { providerGroupStatusLabel } from '@/lib/marketplace-group-display';
import {
    canPublishProviderGroup,
    countPricedActiveServices,
    getProviderGroupPublishRequirements,
    publishBlockersErrorMessage,
    providerGroupPublishMissing,
} from '@/lib/provider-group-publish';
import { EmptyBlock } from './shared';
import { ProviderPublicProfileLink, ProviderPublishQrPanel } from './provider-public-profile-link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

const SHARE_TIPS = [
    'Agrega el link a tu bio de Instagram',
    'Compártelo por WhatsApp con clientes',
    'Inclúyelo en tu firma de correo',
    'Pégalo en flyers o tarjetas con el QR',
];

export function ProviderPublishView({ refresh }: { refresh: () => Promise<void> }) {
    const router = useRouter();
    const { mariachi, hasMariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();
    const [toggling, setToggling] = useState(false);
    const [toggleError, setToggleError] = useState('');
    const [toggleSaved, setToggleSaved] = useState(false);
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

    const requirements = useMemo(
        () => getProviderGroupPublishRequirements(mariachi, activeServiceCount),
        [mariachi, activeServiceCount],
    );
    const canPublish = useMemo(
        () => (mariachi ? canPublishProviderGroup(mariachi, activeServiceCount) : false),
        [mariachi, activeServiceCount],
    );
    const publishMissing = useMemo(
        () => (mariachi ? providerGroupPublishMissing(mariachi, activeServiceCount) : []),
        [mariachi, activeServiceCount],
    );

    const isPublished = mariachi?.status === 'active';
    const publicUrl = useMemo(
        () => (mariachi ? publicMariachiProfileUrl(mariachi.slug, APP_URL || undefined) : ''),
        [mariachi?.slug],
    );

    async function handleTogglePublish(next: boolean) {
        if (!mariachi) return;
        if (next && !canPublish) {
            setToggleError(publishBlockersErrorMessage(publishMissing));
            return;
        }
        setToggling(true);
        setToggleError('');
        setToggleSaved(false);
        const response = await serenatasApi.updateProviderGroup(mariachi.id, {
            status: next ? 'active' : 'paused',
        });
        setToggling(false);
        if (!response.ok) {
            setToggleError(response.error ?? 'No pudimos actualizar la visibilidad.');
            return;
        }
        await refreshMariachi();
        await refresh();
        setToggleSaved(true);
        window.setTimeout(() => setToggleSaved(false), 2500);
    }

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshMariachi()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    if (!hasMariachi || !mariachi) {
        return (
            <div className="grid gap-5">
                <EmptyBlock
                    title="Primero tus datos comerciales"
                    description="Crea tu mariachi en la pestaña Datos comerciales. Luego podrás publicarlo y compartir tu link."
                />
                <PanelButton
                    type="button"
                    className="w-fit"
                    onClick={() => router.push(panelMiNegocioHref('datos'))}
                >
                    Ir a datos comerciales
                </PanelButton>
            </div>
        );
    }

    return (
        <div className="grid w-full gap-6 lg:gap-8">
            <PanelBlockHeader
                title="Publicar"
                description="Activa tu página en el marketplace, comparte tu link y el código QR."
            />

            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start lg:gap-x-8 xl:grid-cols-[minmax(0,1.35fr)_320px] xl:gap-x-10">
                <div className="grid min-w-0 gap-5">
                    <PanelCard size="md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-fg lg:text-lg">
                                        {isPublished ? 'Visible en marketplace' : providerGroupStatusLabel(mariachi.status)}
                                    </p>
                                    <span
                                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                                        style={{
                                            background: isPublished
                                                ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                                                : 'var(--bg-subtle)',
                                            color: isPublished ? 'var(--accent)' : 'var(--fg-muted)',
                                        }}
                                    >
                                        {isPublished ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                                        {isPublished ? 'Publicado' : 'No publicado'}
                                    </span>
                                </div>
                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
                                    {isPublished
                                        ? 'Los clientes pueden encontrarte en el marketplace y abrir tu página pública.'
                                        : 'Tu página y listado quedan ocultos hasta completar los datos mínimos y activar la publicación.'}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end lg:flex-row lg:items-center">
                                {toggling || servicesLoading ? (
                                    <IconLoader2 size={22} className="animate-spin text-fg-muted" />
                                ) : (
                                    <PanelSwitch
                                        checked={isPublished}
                                        onChange={(next) => void handleTogglePublish(next)}
                                        disabled={!isPublished && !canPublish}
                                        ariaLabel={isPublished ? 'Ocultar en marketplace' : 'Publicar en marketplace'}
                                    />
                                )}
                            </div>
                        </div>
                        {!isPublished && !canPublish ? (
                            <PanelNotice tone="warning" className="mt-4">
                                <p className="text-sm font-medium text-fg">
                                    Completa estos requisitos antes de publicar:
                                </p>
                                <ul className="mt-3 grid gap-2">
                                    {requirements.map((item) => (
                                        <li key={item.id}>
                                            {item.met ? (
                                                <span className="flex items-center gap-2 text-sm text-fg-muted">
                                                    <IconCheck size={14} className="shrink-0 text-accent" />
                                                    {item.label}
                                                </span>
                                            ) : (
                                                <Link
                                                    href={item.href}
                                                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-subtle/60 px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-accent-border hover:bg-accent-soft/30"
                                                >
                                                    <span>{item.label}</span>
                                                    <span className="text-xs text-accent">Completar</span>
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </PanelNotice>
                        ) : null}
                        {toggleError ? (
                            <p className="mt-3 text-xs text-[var(--color-error)]">{toggleError}</p>
                        ) : null}
                        {toggleSaved ? (
                            <p className="mt-3 flex items-center gap-1 text-xs text-accent">
                                <IconCheck size={12} />
                                Guardado
                            </p>
                        ) : null}
                    </PanelCard>

                    <ProviderPublicProfileLink
                        group={mariachi}
                        published={isPublished}
                        canPublish={canPublish}
                        showMobileQrToggle
                    />
                </div>

                <aside className="grid min-w-0 gap-5 lg:sticky lg:top-6 lg:self-start">
                    <ProviderPublishQrPanel group={mariachi} url={publicUrl} className="hidden lg:block" />

                    <PanelCard size="md">
                        <p className="text-sm font-semibold text-fg">Cómo compartir</p>
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                            {SHARE_TIPS.map((tip) => (
                                <li key={tip} className="flex items-start gap-2 text-sm text-fg-muted">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                    <span className="min-w-0 leading-snug">{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </PanelCard>
                </aside>
            </div>
        </div>
    );
}
