'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconBrandFacebook, IconCheck, IconLoader2 } from '@tabler/icons-react';
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

        try {
            await navigator.clipboard.writeText(marketplaceCopy);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 2200);
        } catch {
            // sigue abriendo Marketplace aunque falle el portapapeles
        }
        window.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
        setPending(true);
    }

    async function handleClear() {
        if (!onClearPublished || busy) return;
        await onClearPublished();
        setPublished(false);
        setPending(false);
    }

    const showDone = published || pending;

    return (
        <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--bg-subtle)">
                <IconBrandFacebook size={20} className="text-[#1877F2]" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--fg)">Facebook Marketplace</p>
                {flash ? (
                    <p className="mt-0.5 text-[10px] text-green-600">Copiado — pega en Facebook</p>
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
                <PanelButton
                    type="button"
                    variant={showDone ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={busy || published}
                    onClick={() => void handlePrimary()}
                >
                    {busy ? (
                        <IconLoader2 size={14} className="animate-spin" />
                    ) : published ? (
                        <IconCheck size={14} />
                    ) : null}
                    {busy ? 'Guardando...' : published ? 'Listo' : pending ? 'Listo' : 'Publicar'}
                </PanelButton>
            </div>
        </div>
    );
}
