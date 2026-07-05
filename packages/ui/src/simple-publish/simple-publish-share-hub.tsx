'use client';

import { useState } from 'react';
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
};

function ShareIcon({ icon }: { icon: SimplePublishShareIcon }) {
    const size = 20;
    if (icon === 'instagram') return <IconBrandInstagram size={size} className="text-[#E4405F]" />;
    if (icon === 'facebook') return <IconBrandFacebook size={size} className="text-[#1877F2]" />;
    if (icon === 'tiktok') return <IconBrandTiktok size={size} />;
    if (icon === 'youtube') return <IconBrandYoutube size={size} className="text-[#FF0000]" />;
    if (icon === 'whatsapp') return <IconBrandWhatsapp size={size} className="text-[#25D366]" />;
    return <IconShare3 size={size} />;
}

function IntegrationRow({ item }: { item: SimplePublishShareIntegration }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-subtle)">
                <ShareIcon icon={item.icon} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--fg)">{item.label}</p>
                <p className="text-xs text-(--fg-muted)">
                    {item.published
                        ? 'Publicado en esta red'
                        : item.connected
                            ? 'Listo para publicar'
                            : 'Conecta tu cuenta para publicar'}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {item.connected ? (
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
                        {item.published ? 'Publicado' : 'Publicar'}
                    </PanelButton>
                ) : (
                    <Link href={item.connectHref}>
                        <PanelButton type="button" variant="secondary" size="sm">
                            Conectar →
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
}: SimplePublishShareHubProps) {
    const [copied, setCopied] = useState(false);

    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publishedHref}`
        : publishedHref;

    const visibleIntegrations = integrations.filter((item) => {
        if (!item.available) return false;
        if (item.requiresVideo && !hasVideo) return false;
        return true;
    });

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
            <div className="rounded-2xl border border-(--accent)/20 bg-(--accent-subtle)/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--accent)">
                    Publicado en {brandName}
                </p>
                <p className="mt-1 text-sm font-medium text-(--fg)">{listingTitle}</p>
                <p className="mt-2 truncate text-xs text-(--fg-muted)">{publicUrl}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PanelButton
                    type="button"
                    variant="primary"
                    className="sm:col-span-2 justify-center"
                    onClick={() => window.open(publishedHref, '_blank', 'noopener,noreferrer')}
                >
                    <IconExternalLink size={16} />
                    Ver en {brandName}
                </PanelButton>
                <PanelButton type="button" variant="secondary" className="justify-center" onClick={() => void shareNative()}>
                    <IconShare3 size={16} />
                    Compartir link
                </PanelButton>
                <PanelButton type="button" variant="secondary" className="justify-center" onClick={() => void copyLink()}>
                    <IconCopy size={16} />
                    {copied ? 'Copiado' : 'Copiar link'}
                </PanelButton>
                <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-(--border) bg-(--surface) px-4 text-sm font-medium text-(--fg) transition hover:bg-(--bg-subtle) sm:col-span-2"
                >
                    <IconBrandWhatsapp size={16} />
                    Enviar por WhatsApp
                </a>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
                    Publicar también en
                </p>
                {loading ? (
                    <p className="flex items-center gap-2 text-xs text-(--fg-muted)">
                        <IconLoader2 size={14} className="animate-spin" />
                        Cargando integraciones...
                    </p>
                ) : visibleIntegrations.length > 0 ? (
                    <div className="space-y-2">
                        {visibleIntegrations.map((item) => (
                            <IntegrationRow key={item.key} item={item} />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-(--fg-muted)">
                        Las integraciones sociales estarán disponibles pronto.
                    </p>
                )}
            </div>
        </div>
    );
}
