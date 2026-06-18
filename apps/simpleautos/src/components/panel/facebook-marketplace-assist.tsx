'use client';

import { useMemo, useState } from 'react';
import { IconBrandFacebook, IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react';
import {
    buildMarketplaceListingCopy,
    buildMarketplacePublicUrl,
    FACEBOOK_MARKETPLACE_VEHICLE_URL,
} from '@/lib/marketplace-assist';
import { publishListingToPortal } from '@/lib/panel-listings';

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    initialPublished?: boolean;
    onMarkedPublished?: () => void;
};

export function FacebookMarketplaceAssist({
    listingId,
    listingTitle,
    listingHref,
    listingPrice,
    listingDescription,
    listingLocation,
    initialPublished = false,
    onMarkedPublished,
}: Props) {
    const [published, setPublished] = useState(initialPublished);
    const [copied, setCopied] = useState(false);
    const [marking, setMarking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const marketplaceCopy = useMemo(
        () => buildMarketplaceListingCopy({
            title: listingTitle,
            price: listingPrice,
            description: listingDescription,
            location: listingLocation,
            publicUrl: buildMarketplacePublicUrl(listingHref),
        }),
        [listingDescription, listingHref, listingLocation, listingPrice, listingTitle],
    );

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
        setMarking(true);
        setMessage(null);
        const result = await publishListingToPortal(listingId, 'facebook');
        setMarking(false);

        if (result.ok) {
            setPublished(true);
            onMarkedPublished?.();
            setMessage('Registrado en SimpleAutos como publicado en Facebook Marketplace.');
            return;
        }

        setMessage(result.error ?? 'No pudimos registrar la publicación en Marketplace.');
    }

    return (
        <div className="sm:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 text-left">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
                        <IconBrandFacebook size={18} className="text-[#1877F2]" />
                        Facebook Marketplace
                    </p>
                    <p className="mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                        Publicación manual: tú controlas qué subes y cuándo. Meta no permite automatizar avisos de vehículos.
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
                    href={FACEBOOK_MARKETPLACE_VEHICLE_URL}
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
            </div>

            {message ? (
                <p className={`mt-3 text-xs ${published ? 'text-green-700' : 'text-[var(--fg-muted)]'}`}>{message}</p>
            ) : null}
        </div>
    );
}
