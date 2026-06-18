'use client';

import { useState } from 'react';
import { IconCircleCheck, IconCopy, IconExternalLink, IconShare3 } from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';

export type MarketplacePublishSuccessProps = {
    title: string;
    headline?: string;
    description?: string;
    publishedHref: string;
    nextSteps?: string[];
    onReset: () => void;
    onGoToListings?: () => void;
    listingsLabel?: string;
    shareText?: string;
    extraActions?: React.ReactNode;
};

export function MarketplacePublishSuccess({
    title,
    headline = 'Tu publicación ya está en línea',
    description = 'Compártela para llegar más rápido a interesados. Mientras más visible, más consultas.',
    publishedHref,
    nextSteps = [
        'Comparte el link por WhatsApp o redes',
        'Revisa consultas desde el panel',
        'Actualiza fotos o precio cuando quieras',
    ],
    onReset,
    onGoToListings,
    listingsLabel = 'Ir a publicaciones',
    shareText,
    extraActions,
}: MarketplacePublishSuccessProps) {
    const [copied, setCopied] = useState(false);
    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publishedHref}`
        : publishedHref;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    const shareListing = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: shareText ?? `Mira esta publicación: ${title}`,
                    url: publicUrl,
                });
                return;
            } catch {
                // usuario canceló
            }
        }
        await copyLink();
    };

    return (
        <div className="min-h-screen bg-(--bg)">
            <main className="mx-auto max-w-3xl px-4 py-8 lg:max-w-5xl lg:px-8 lg:py-12">
                <PanelCard size="lg">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
                        <div className="space-y-5">
                            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold bg-(--accent-subtle) text-(--accent)">
                                <IconCircleCheck size={15} />
                                Publicación lista
                            </span>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-(--fg) lg:text-3xl">
                                    {headline}
                                </h1>
                                <p className="mt-2 max-w-xl text-sm text-(--fg-secondary)">{description}</p>
                            </div>
                            <div className="rounded-2xl border border-(--border) bg-(--bg-subtle) p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--fg-muted)">
                                    Link público
                                </p>
                                <p className="mt-1 truncate text-sm font-medium text-(--fg)">{publicUrl}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <PanelButton
                                    type="button"
                                    variant="primary"
                                    onClick={() => window.open(publishedHref, '_blank', 'noopener,noreferrer')}
                                >
                                    <IconExternalLink size={15} />
                                    Ver publicación
                                </PanelButton>
                                <PanelButton type="button" variant="secondary" onClick={() => void shareListing()}>
                                    <IconShare3 size={15} />
                                    Compartir
                                </PanelButton>
                                <PanelButton type="button" variant="secondary" onClick={() => void copyLink()}>
                                    <IconCopy size={15} />
                                    {copied ? 'Copiado' : 'Copiar link'}
                                </PanelButton>
                            </div>
                            {extraActions}
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <PanelButton type="button" variant="secondary" onClick={onReset}>
                                    Publicar otra
                                </PanelButton>
                                {onGoToListings ? (
                                    <PanelButton type="button" variant="secondary" onClick={onGoToListings}>
                                        {listingsLabel}
                                    </PanelButton>
                                ) : null}
                            </div>
                        </div>
                        <div className="rounded-[24px] border border-(--border) bg-(--bg-subtle) p-4">
                            <p className="text-sm font-semibold text-(--fg)">Siguiente paso</p>
                            <ul className="mt-4 space-y-3">
                                {nextSteps.map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-(--fg-secondary)">
                                        <IconCircleCheck size={16} className="mt-0.5 shrink-0 text-(--accent)" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </PanelCard>
            </main>
        </div>
    );
}
