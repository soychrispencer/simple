'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconBrandFacebook, IconCheck, IconLoader2, IconRefresh } from '@tabler/icons-react';
import {
    buildMarketplaceListingCopy,
    buildMarketplacePublicUrl,
    getFacebookMarketplaceCreateUrl,
    type MarketplaceAssistVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';

export type FacebookMarketplaceAssistCardProps = {
    vertical: MarketplaceAssistVertical;
    brandLabel: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    initialPublished?: boolean;
    marking?: boolean;
    clearing?: boolean;
    onMarkPublished?: (externalUrl: string | null) => void | Promise<void>;
    onClearPublished?: () => void | Promise<void>;
};

export function FacebookMarketplaceAssistCard({
    vertical,
    brandLabel,
    listingTitle,
    listingHref,
    listingPrice,
    listingDescription,
    listingLocation,
    initialPublished = false,
    marking = false,
    clearing = false,
    onMarkPublished,
    onClearPublished,
}: FacebookMarketplaceAssistCardProps) {
    const [published, setPublished] = useState(initialPublished);
    const [pending, setPending] = useState(false);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        setPublished(initialPublished);
        if (initialPublished) setPending(false);
    }, [initialPublished]);

    const marketplaceCopy = useMemo(
        () => buildMarketplaceListingCopy({
            title: listingTitle,
            price: listingPrice,
            description: listingDescription,
            location: listingLocation,
            publicUrl: buildMarketplacePublicUrl(listingHref),
            brandLabel,
        }),
        [brandLabel, listingDescription, listingHref, listingLocation, listingPrice, listingTitle],
    );

    const marketplaceUrl = getFacebookMarketplaceCreateUrl(vertical);
    const busy = marking || clearing;

    async function handlePrimary() {
        if (busy || published) return;

        if (pending) {
            if (!onMarkPublished) return;
            await onMarkPublished(null);
            setPublished(true);
            setPending(false);
            return;
        }

        // Abrir primero para no perder el gesto de usuario (popup blockers).
        window.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
        try {
            await navigator.clipboard.writeText(marketplaceCopy);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 2200);
        } catch {
            // sigue el flujo aunque falle el portapapeles
        }
        setPending(true);
    }

    async function handleRepublish() {
        if (busy) return;
        window.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
        try {
            await navigator.clipboard.writeText(marketplaceCopy);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 2200);
        } catch {
            // ignore
        }
        if (!published) setPending(true);
    }

    async function handleClear() {
        if (!onClearPublished || busy) return;
        await onClearPublished();
        setPublished(false);
        setPending(false);
    }

    const hint = flash
        ? 'Copiado — pega en Facebook'
        : pending && !published
            ? 'Cuando esté publicado en Marketplace, pulsa Listo'
            : null;

    return (
        <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-subtle)">
                <IconBrandFacebook size={20} className="text-[#1877F2]" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--fg)">Facebook Marketplace</p>
                {hint ? (
                    <p className={`mt-0.5 text-[10px] ${flash ? 'text-green-600' : 'text-(--fg-muted)'}`}>{hint}</p>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {published && onClearPublished ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleClear()}
                        className="text-[10px] font-medium text-(--fg-muted) transition hover:text-(--fg)"
                    >
                        Quitar
                    </button>
                ) : null}
                {published ? (
                    <>
                        <PanelButton type="button" variant="success" size="sm" disabled>
                            <IconCheck size={14} />
                            Publicado
                        </PanelButton>
                        <button
                            type="button"
                            aria-label="Republicar"
                            title="Republicar"
                            disabled={busy}
                            onClick={() => void handleRepublish()}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-(--fg-muted) transition hover:bg-(--bg-subtle) hover:text-(--fg) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? (
                                <IconLoader2 size={15} className="animate-spin" />
                            ) : (
                                <IconRefresh size={15} />
                            )}
                        </button>
                    </>
                ) : (
                    <PanelButton
                        type="button"
                        variant={pending ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={busy}
                        onClick={() => void handlePrimary()}
                    >
                        {busy ? (
                            <IconLoader2 size={14} className="animate-spin" />
                        ) : pending ? (
                            <IconCheck size={14} />
                        ) : null}
                        {busy ? 'Guardando...' : pending ? 'Listo' : 'Publicar'}
                    </PanelButton>
                )}
            </div>
        </div>
    );
}
