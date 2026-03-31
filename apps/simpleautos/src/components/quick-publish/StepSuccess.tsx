'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconBrandWhatsapp, IconLink, IconPlus, IconChevronRight } from '@tabler/icons-react';

interface Props {
    listingId: string;
    listingHref: string;
    listingTitle: string;
    onPublishAnother: () => void;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.cl';

export default function StepSuccess({ listingId, listingHref, listingTitle, onPublishAnother }: Props) {
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        setCanShare(typeof navigator.share === 'function');
    }, []);

    const publicUrl = `${APP_URL}${listingHref}`;
    const whatsappText = encodeURIComponent(`Mira este auto en SimpleAutos: ${listingTitle}\n${publicUrl}`);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    }

    function handleShare() {
        void navigator.share({ title: listingTitle, url: publicUrl });
    }

    return (
        <div className="flex flex-col gap-5 py-2">
            <div
                className="rounded-[28px] border p-5 md:p-6"
                style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))' }}
            >
                <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: '#ecfdf5' }}>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#059669' }}>
                                <IconCheck size={20} color="white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#34d399' }}>
                                Publicado en SimpleAutos
                            </p>
                            <h2 className="mt-1 text-xl font-semibold leading-tight" style={{ color: 'var(--fg)' }}>
                                Tu aviso ya está arriba
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Ya lo puedes compartir. Si quieres, ahora entras a la ficha completa para seguir editando los detalles del vehículo.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
                        <Link
                            href={`/panel/publicar?edit=${listingId}&created=1`}
                            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-opacity active:opacity-80"
                            style={{ background: '#FF3600', color: 'white' }}
                        >
                            Abrir ficha completa
                            <IconChevronRight size={16} />
                        </Link>

                        <Link
                            href={listingHref}
                            className="flex items-center justify-center rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-opacity active:opacity-80"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--bg-subtle)' }}
                        >
                            Ver publicación
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <a
                            href={`https://wa.me/?text=${whatsappText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-opacity active:opacity-80"
                            style={{ background: '#25D366', color: 'white' }}
                        >
                            <IconBrandWhatsapp size={16} />
                            WhatsApp
                        </a>

                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all active:opacity-80"
                            style={{
                                borderColor: copied ? '#059669' : 'var(--border)',
                                background: copied ? '#ecfdf5' : 'var(--bg)',
                                color: copied ? '#059669' : 'var(--fg)',
                            }}
                        >
                            {copied ? <IconCheck size={16} /> : <IconLink size={16} />}
                            {copied ? 'Link copiado' : 'Copiar link'}
                        </button>

                        {canShare && (
                            <button
                                type="button"
                                onClick={handleShare}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-opacity active:opacity-80"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                            >
                                <span className="text-sm">📤</span>
                                Compartir
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={onPublishAnother}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold border-2 flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--bg)' }}
            >
                <IconPlus size={16} />
                Publicar otro vehículo
            </button>
        </div>
    );
}
