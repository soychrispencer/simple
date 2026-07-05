'use client';

import { type ReactNode, useState } from 'react';
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

export type MarketplaceShareChannel = {
    key: string;
    label: string;
    icon?: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'whatsapp';
    connected: boolean;
    disabled?: boolean;
    busy?: boolean;
    published?: boolean;
    onShare: () => void | Promise<void>;
};

export type MarketplacePublishSharePanelProps = {
    brandName: string;
    listingTitle: string;
    publishedHref: string;
    shareText?: string;
    channels?: MarketplaceShareChannel[];
    loading?: boolean;
};

function ChannelIcon({ icon }: { icon: MarketplaceShareChannel['icon'] }) {
    const size = 18;
    if (icon === 'instagram') return <IconBrandInstagram size={size} />;
    if (icon === 'facebook') return <IconBrandFacebook size={size} />;
    if (icon === 'tiktok') return <IconBrandTiktok size={size} />;
    if (icon === 'youtube') return <IconBrandYoutube size={size} />;
    if (icon === 'whatsapp') return <IconBrandWhatsapp size={size} />;
    return <IconShare3 size={size} />;
}

function ShareChannelButton({ channel }: { channel: MarketplaceShareChannel }) {
    if (!channel.connected) return null;

    return (
        <PanelButton
            type="button"
            variant={channel.published ? 'secondary' : 'primary'}
            className="w-full justify-center"
            disabled={channel.disabled || channel.busy}
            onClick={() => void channel.onShare()}
        >
            {channel.busy ? (
                <IconLoader2 size={16} className="animate-spin" />
            ) : channel.published ? (
                <IconCheck size={16} />
            ) : (
                <ChannelIcon icon={channel.icon} />
            )}
            {channel.published ? `${channel.label} · Publicado` : channel.label}
        </PanelButton>
    );
}

export function MarketplacePublishSharePanel({
    brandName,
    listingTitle,
    publishedHref,
    shareText,
    channels = [],
    loading = false,
}: MarketplacePublishSharePanelProps) {
    const [copied, setCopied] = useState(false);
    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publishedHref}`
        : publishedHref;

    const connectedChannels = channels.filter((item) => item.connected);

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
        <div className="space-y-4">
            <div className="rounded-2xl border border-(--border) bg-(--accent-subtle)/40 p-4">
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

            {loading ? (
                <p className="text-xs text-(--fg-muted)">Cargando integraciones...</p>
            ) : connectedChannels.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
                        También puedes publicar en
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {connectedChannels.map((channel) => (
                            <ShareChannelButton key={channel.key} channel={channel} />
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
