'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconBrandFacebook, IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react';
import {
    buildMarketplaceListingCopy,
    buildMarketplacePublicUrl,
    getFacebookMarketplaceCreateUrl,
    type MarketplaceAssistVertical,
} from '@simple/utils';

export type FacebookMarketplaceAssistCardProps = {
    vertical: MarketplaceAssistVertical;
    brandLabel: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    initialPublished?: boolean;
    initialExternalUrl?: string | null;
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
    initialExternalUrl = null,
    marking = false,
    clearing = false,
    onMarkPublished,
    onClearPublished,
}: FacebookMarketplaceAssistCardProps) {
    const [published, setPublished] = useState(initialPublished);
    const [externalUrl, setExternalUrl] = useState(initialExternalUrl ?? '');
    const [copied, setCopied] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setPublished(initialPublished);
        setExternalUrl(initialExternalUrl ?? '');
    }, [initialExternalUrl, initialPublished]);

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

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(marketplaceCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setMessage('No pudimos copiar al portapapeles. Selecciona y copia el texto manualmente.');
        }
    }

    async function handleMarkPublished() {
        if (!onMarkPublished) return;
        setMessage(null);
        const trimmedUrl = externalUrl.trim();
        const normalizedUrl = trimmedUrl && /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : null;
        await onMarkPublished(normalizedUrl);
        setPublished(true);
        setMessage(`Registrado en ${brandLabel} como publicado en Facebook Marketplace.`);
    }

    async function handleClearPublished() {
        if (!onClearPublished) return;
        setMessage(null);
        await onClearPublished();
        setPublished(false);
        setExternalUrl('');
        setMessage('Marca retirada. Puedes volver a publicar en Marketplace cuando quieras.');
    }

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 text-left">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
                        <IconBrandFacebook size={18} className="text-[#1877F2]" />
                        Facebook Marketplace
                    </p>
                    <p className="mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                        Publicación manual: tú controlas qué subes y cuándo. Meta no permite automatizar avisos de vehículos ni propiedades por ahora.
                    </p>
                </div>
                {published ? (
                    <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                        Registrado
                    </span>
                ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium hover:bg-[var(--bg)] transition-colors"
                >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied ? 'Copiado' : 'Copiar datos del aviso'}
                </button>

                <a
                    href={marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium hover:bg-[var(--bg)] transition-colors"
                >
                    Abrir Marketplace
                    <IconExternalLink size={14} />
                </a>

                <button
                    type="button"
                    disabled={marking || published}
                    onClick={() => void handleMarkPublished()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-3 py-2 text-xs font-medium text-white hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {marking ? 'Guardando...' : published ? 'Ya registrado' : 'Ya lo publiqué en Marketplace'}
                </button>

                {published && onClearPublished ? (
                    <button
                        type="button"
                        disabled={clearing}
                        onClick={() => void handleClearPublished()}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--fg-muted)] hover:bg-[var(--bg)] transition-colors disabled:opacity-50"
                    >
                        {clearing ? 'Guardando...' : 'Ya lo retiré de Marketplace'}
                    </button>
                ) : null}
            </div>

            {!published ? (
                <label className="mt-3 block text-xs text-[var(--fg-muted)]">
                    <span className="font-medium text-[var(--fg)]">Enlace del aviso en Marketplace</span>
                    <span className="ml-1">(opcional)</span>
                    <input
                        type="url"
                        value={externalUrl}
                        onChange={(event) => setExternalUrl(event.target.value)}
                        placeholder="https://www.facebook.com/marketplace/item/..."
                        className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                    />
                </label>
            ) : externalUrl ? (
                <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#1877F2] hover:underline"
                >
                    Ver aviso en Marketplace
                    <IconExternalLink size={12} />
                </a>
            ) : null}

            {message ? (
                <p className={`mt-3 text-xs ${published ? 'text-green-700' : 'text-[var(--fg-muted)]'}`}>{message}</p>
            ) : null}
        </div>
    );
}
