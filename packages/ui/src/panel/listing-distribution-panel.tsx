'use client';

import { useMemo } from 'react';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandYoutube,
    IconCheck,
    IconClock,
    IconExternalLink,
    IconMapPin,
    IconRefresh,
    IconX,
} from '@tabler/icons-react';
import type { ListingDistributionChannel } from '@simple/utils';
import { FacebookMarketplaceAssistCard, type FacebookMarketplaceAssistCardProps } from './facebook-marketplace-assist-card.js';
import { PanelScrollModal } from './panel-scroll-modal.js';

export type ListingDistributionPanelProps = {
    channels: ListingDistributionChannel[];
    loading?: boolean;
    soldHint?: boolean;
    onRefresh?: () => void;
    marketplaceAssist?: Omit<FacebookMarketplaceAssistCardProps, 'initialPublished'> & {
        initialPublished?: boolean;
    };
};

function channelIcon(key: string) {
    if (key.startsWith('instagram')) return <IconBrandInstagram size={16} className="text-[#E4405F]" />;
    if (key === 'facebook' || key === 'portal:facebook') return <IconBrandFacebook size={16} className="text-[#1877F2]" />;
    if (key === 'tiktok') return <IconBrandTiktok size={16} />;
    if (key === 'youtube') return <IconBrandYoutube size={16} className="text-red-600" />;
    if (key === 'simple') return <IconMapPin size={16} className="text-[var(--accent)]" />;
    return null;
}

function statusMeta(status: ListingDistributionChannel['status']): { label: string; className: string } {
    if (status === 'published') {
        return { label: 'Publicado', className: 'bg-green-100 text-green-800' };
    }
    if (status === 'ready') {
        return { label: 'Disponible', className: 'bg-blue-50 text-blue-700' };
    }
    if (status === 'failed') {
        return { label: 'Revisar', className: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'Pendiente', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
}

function formatPublishedAt(value: number | null): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function ListingDistributionPanel({
    channels,
    loading = false,
    soldHint = false,
    onRefresh,
    marketplaceAssist,
}: ListingDistributionPanelProps) {
    const publishedChannels = useMemo(
        () => channels.filter((channel) => channel.status === 'published'),
        [channels],
    );

    const facebookChannel = channels.find((channel) => channel.key === 'portal:facebook');
    const showMarketplaceAssist = Boolean(marketplaceAssist);

    return (
        <div className="space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-[var(--fg)]">Dónde está publicado</h3>
                    <p className="mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                        Controla en qué canales está activo tu aviso para no republicar ni olvidar retirarlo al vender.
                    </p>
                </div>
                {onRefresh ? (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                    >
                        <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                ) : null}
            </div>

            {soldHint ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    Este aviso está finalizado. Retira las publicaciones activas en los canales marcados como publicados.
                </div>
            ) : null}

            {loading ? (
                <p className="text-xs text-[var(--fg-muted)]">Cargando canales...</p>
            ) : (
                <ul className="space-y-2">
                    {channels.map((channel) => {
                        const meta = statusMeta(channel.status);
                        const publishedLabel = formatPublishedAt(channel.publishedAt);
                        return (
                            <li
                                key={channel.key}
                                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                            >
                                <div className="min-w-0 flex items-start gap-2.5">
                                    <span className="mt-0.5 shrink-0">{channelIcon(channel.key)}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--fg)] truncate">{channel.label}</p>
                                        {publishedLabel ? (
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
                                                <IconClock size={11} />
                                                {publishedLabel}
                                            </p>
                                        ) : null}
                                        {channel.lastError ? (
                                            <p className="mt-0.5 text-[11px] text-amber-700">{channel.lastError}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>
                                        {meta.label}
                                    </span>
                                    {channel.permalink ? (
                                        <a
                                            href={channel.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                                        >
                                            Abrir
                                            <IconExternalLink size={11} />
                                        </a>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!loading && publishedChannels.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">
                    Aún no hay canales marcados como publicados fuera de Simple.
                </p>
            ) : null}

            {showMarketplaceAssist && marketplaceAssist ? (
                <FacebookMarketplaceAssistCard
                    {...marketplaceAssist}
                    initialPublished={marketplaceAssist.initialPublished ?? facebookChannel?.status === 'published'}
                />
            ) : null}
        </div>
    );
}

export type ListingDistributionDialogProps = ListingDistributionPanelProps & {
    open: boolean;
    title?: string;
    onClose: () => void;
};

export function ListingDistributionDialog({
    open,
    title = 'Dónde está publicado',
    onClose,
    ...panelProps
}: ListingDistributionDialogProps) {
    return (
        <PanelScrollModal
            open={open}
            title={title}
            onClose={onClose}
            size="lg"
        >
            <ListingDistributionPanel {...panelProps} />
        </PanelScrollModal>
    );
}
