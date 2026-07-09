'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandWhatsapp,
    IconBrandYoutube,
    IconCheck,
    IconCopy,
    IconExternalLink,
    IconLoader2,
    IconShare3,
} from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import type { SimplePublishShareIcon, SimplePublishShareIntegration } from './types';

export type SimplePublishShareHubProps = {
    brandName: string;
    listingTitle: string;
    publishedHref: string;
    shareText?: string;
    integrations?: SimplePublishShareIntegration[];
    loading?: boolean;
    hasVideo?: boolean;
    publishAllAction?: {
        label?: string;
        busy?: boolean;
        disabled?: boolean;
        disabledReason?: string | null;
        onPublishAll?: () => void | Promise<void>;
    };
};

const VIDEO_REQUIRED_MESSAGE = 'Debes subir un video';

function ShareIcon({ icon }: { icon: SimplePublishShareIcon }) {
    const size = 20;
    if (icon === 'instagram') return <IconBrandInstagram size={size} className="text-[#E4405F]" />;
    if (icon === 'facebook') return <IconBrandFacebook size={size} className="text-[#1877F2]" />;
    if (icon === 'tiktok') return <IconBrandTiktok size={size} />;
    if (icon === 'youtube') return <IconBrandYoutube size={size} className="text-[#FF0000]" />;
    if (icon === 'whatsapp') return <IconBrandWhatsapp size={size} className="text-[#25D366]" />;
    return <IconShare3 size={size} />;
}

function getIntegrationAvailability(
    item: SimplePublishShareIntegration,
    hasVideo: boolean,
): { blocked: boolean; reason: string | null } {
    if (item.published) return { blocked: false, reason: null };
    if (item.unavailableReason) return { blocked: true, reason: item.unavailableReason };
    if (item.requiresVideo && !hasVideo) return { blocked: true, reason: VIDEO_REQUIRED_MESSAGE };
    return { blocked: false, reason: null };
}

function IntegrationLabel({
    label,
    reason,
}: {
    label: string;
    reason?: string | null;
}) {
    return (
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-(--fg)">{label}</p>
            {reason ? (
                <p className="mt-0.5 text-[10px] leading-snug text-(--fg-muted)">{reason}</p>
            ) : null}
        </div>
    );
}

function ManualIntegrationRow({
    item,
    hasVideo,
}: {
    item: SimplePublishShareIntegration;
    hasVideo: boolean;
}) {
    const [pending, setPending] = useState(false);
    const [flash, setFlash] = useState(false);
    const { blocked, reason } = getIntegrationAvailability(item, hasVideo);

    useEffect(() => {
        if (item.published) setPending(false);
    }, [item.published]);

    async function handlePrimary() {
        if (item.busy || blocked) return;

        if (item.published) return;

        if (pending) {
            await item.onMarkPublished?.();
            setPending(false);
            return;
        }

        await item.onCopyAssist?.();
        if (item.openHref) {
            window.open(item.openHref, '_blank', 'noopener,noreferrer');
        }
        setFlash(true);
        setPending(true);
        window.setTimeout(() => setFlash(false), 2200);
    }

    const showDone = item.published || pending;
    const hint = flash ? 'Copiado — pega en Facebook' : reason;

    return (
        <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-subtle)">
                <ShareIcon icon={item.icon} />
            </div>
            <IntegrationLabel label={item.label} reason={hint} />
            <div className="flex shrink-0 items-center gap-1.5">
                {item.published && item.onClearPublished ? (
                    <button
                        type="button"
                        disabled={item.busy}
                        onClick={() => void item.onClearPublished?.()}
                        className="text-[10px] font-medium text-(--fg-muted) transition hover:text-(--fg)"
                    >
                        Quitar
                    </button>
                ) : null}
                {blocked ? (
                    <PanelButton type="button" variant="secondary" size="sm" disabled>
                        No disponible
                    </PanelButton>
                ) : (
                    <PanelButton
                        type="button"
                        variant={showDone ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={item.busy || item.published}
                        onClick={() => void handlePrimary()}
                    >
                        {item.busy ? (
                            <IconLoader2 size={14} className="animate-spin" />
                        ) : item.published ? (
                            <IconCheck size={14} />
                        ) : null}
                        {item.busy ? 'Guardando...' : item.published ? 'Listo' : pending ? 'Listo' : 'Publicar'}
                    </PanelButton>
                )}
            </div>
        </div>
    );
}

function IntegrationRow({
    item,
    hasVideo,
}: {
    item: SimplePublishShareIntegration;
    hasVideo: boolean;
}) {
    if (item.manual) {
        return <ManualIntegrationRow item={item} hasVideo={hasVideo} />;
    }

    const { blocked, reason } = getIntegrationAvailability(item, hasVideo);

    return (
        <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-subtle)">
                <ShareIcon icon={item.icon} />
            </div>
            <IntegrationLabel label={item.label} reason={reason} />
            <div className="flex shrink-0 items-center">
                {blocked ? (
                    <PanelButton type="button" variant="secondary" size="sm" disabled>
                        No disponible
                    </PanelButton>
                ) : item.connected ? (
                    <PanelButton
                        type="button"
                        variant={item.published ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={item.busy || !item.onPublish}
                        onClick={() => void item.onPublish?.()}
                    >
                        {item.busy ? (
                            <IconLoader2 size={14} className="animate-spin" />
                        ) : item.published ? (
                            <IconCheck size={14} />
                        ) : null}
                        {item.published ? 'Listo' : 'Publicar'}
                    </PanelButton>
                ) : (
                    <Link href={item.connectHref}>
                        <PanelButton type="button" variant="secondary" size="sm">
                            Conectar
                        </PanelButton>
                    </Link>
                )}
            </div>
        </div>
    );
}

export function SimplePublishShareHub({
    brandName,
    listingTitle,
    publishedHref,
    shareText,
    integrations = [],
    loading = false,
    hasVideo = false,
    publishAllAction,
}: SimplePublishShareHubProps) {
    const [copied, setCopied] = useState(false);

    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publishedHref}`
        : publishedHref;

    const visibleIntegrations = integrations.filter((item) => item.available);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    const shareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: listingTitle,
                    text: shareText ?? `Mira esta publicación en ${brandName}: ${listingTitle}`,
                    url: publicUrl,
                });
                return;
            } catch {
                // usuario canceló
            }
        }
        await copyLink();
    };

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText ?? `Mira esto en ${brandName}: ${publicUrl}`)}`;

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <PanelButton
                    type="button"
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() => window.open(publishedHref, '_blank', 'noopener,noreferrer')}
                >
                    <IconExternalLink size={16} />
                    Ver publicación
                </PanelButton>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-medium text-(--fg-secondary) transition hover:text-(--fg)"
                        onClick={() => void shareNative()}
                    >
                        <IconShare3 size={15} />
                        Compartir
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-medium text-(--fg-secondary) transition hover:text-(--fg)"
                        onClick={() => void copyLink()}
                    >
                        <IconCopy size={15} />
                        {copied ? 'Copiado' : 'Copiar enlace'}
                    </button>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-(--fg-secondary) transition hover:text-(--fg)"
                    >
                        <IconBrandWhatsapp size={15} />
                        WhatsApp
                    </a>
                </div>
            </div>

            {visibleIntegrations.length > 0 ? (
                <div className="space-y-2 border-t border-(--border) pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-(--fg)">Publicar también en</p>
                        {publishAllAction?.onPublishAll ? (
                            <PanelButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={
                                    publishAllAction.disabled
                                    || publishAllAction.busy
                                    || loading
                                }
                                onClick={() => void publishAllAction.onPublishAll?.()}
                            >
                                {publishAllAction.busy ? (
                                    <IconLoader2 size={14} className="animate-spin" />
                                ) : null}
                                {publishAllAction.busy
                                    ? 'Publicando...'
                                    : (publishAllAction.label ?? 'Publicar en todas')}
                            </PanelButton>
                        ) : null}
                    </div>
                    {publishAllAction?.disabled && publishAllAction.disabledReason ? (
                        <p className="text-[10px] leading-snug text-(--fg-muted)">
                            {publishAllAction.disabledReason}
                        </p>
                    ) : null}
                    {loading ? (
                        <p className="flex items-center gap-2 text-xs text-(--fg-muted)">
                            <IconLoader2 size={14} className="animate-spin" />
                            Cargando integraciones...
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {visibleIntegrations.map((item) => (
                                <IntegrationRow key={item.key} item={item} hasVideo={hasVideo} />
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
