'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconCheck, IconBrandWhatsapp, IconLink, IconPlus, IconChevronRight, IconStar } from '@tabler/icons-react';
import type { QuickBasicData } from './types';

interface Props {
    listingId: string;
    listingHref: string;
    listingTitle: string;
    basicData: QuickBasicData | null;
    onPublishAnother: () => void;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.cl';

function getEnrichItems(basicData: QuickBasicData | null) {
    return [
        { label: 'Color exterior', benefit: 'Filtro más buscado', done: !!basicData?.color },
        { label: 'Motor y cilindrada', benefit: 'Requerido por portales', done: false },
        { label: 'Combustible', benefit: 'Requerido por portales', done: !!basicData?.fuelType },
        { label: 'Tipo de carrocería', benefit: 'Mejora búsqueda', done: !!basicData?.bodyType },
        { label: 'Equipamiento', benefit: 'Destaca tu vehículo', done: false },
        { label: 'Ubicación', benefit: 'Genera confianza', done: false },
    ];
}

export default function StepSuccess({ listingId, listingHref, listingTitle, basicData, onPublishAnother }: Props) {
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        setCanShare(typeof navigator.share === 'function');
    }, []);

    const publicUrl = `${APP_URL}${listingHref}`;
    const whatsappText = encodeURIComponent(`Mira este auto en SimpleAutos: ${listingTitle}\n${publicUrl}`);
    const enrichItems = getEnrichItems(basicData);

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
            {/* Success header */}
            <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#ecfdf5' }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#059669' }}>
                        <IconCheck size={22} color="white" strokeWidth={2.5} />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>¡Tu auto está publicado!</h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Ya puede ser visto en SimpleAutos</p>
                </div>
            </div>

            {/* Share buttons */}
            <div className={`grid gap-2 ${canShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <a
                    href={`https://wa.me/?text=${whatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-semibold transition-opacity active:opacity-80"
                    style={{ background: '#25D366', color: 'white' }}
                >
                    <IconBrandWhatsapp size={20} />
                    WhatsApp
                </a>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-semibold border-2 transition-all active:opacity-80"
                    style={{
                        borderColor: copied ? '#059669' : 'var(--border)',
                        background: copied ? '#ecfdf5' : 'var(--bg)',
                        color: copied ? '#059669' : 'var(--fg)',
                    }}
                >
                    {copied ? <IconCheck size={20} /> : <IconLink size={20} />}
                    {copied ? '¡Copiado!' : 'Copiar link'}
                </button>

                {canShare && (
                    <button
                        type="button"
                        onClick={handleShare}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-semibold border-2 transition-opacity active:opacity-80"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                    >
                        <span className="text-base">📤</span>
                        Compartir
                    </button>
                )}
            </div>

            {/* View listing */}
            <Link
                href={listingHref}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-center border-2 transition-opacity"
                style={{ borderColor: '#FF3600', color: '#FF3600', background: '#fff2ee' }}
            >
                Ver mi publicación →
            </Link>

            {/* Enrichment card — always visible, not collapsed */}
            <div
                className="w-full rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--border)' }}
            >
                {/* Header */}
                <div className="px-4 pt-4 pb-3" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="flex items-start gap-2.5 mb-3">
                        <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ background: '#FF3600' }}
                        >
                            <IconStar size={15} color="white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Completa tu anuncio</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                Más datos = más alcance en portales y más consultas
                            </p>
                        </div>
                    </div>

                    {/* Portal logos as text pills */}
                    <div className="flex flex-wrap gap-1.5">
                        {['Yapo', 'Chileautos', 'MercadoAuto'].map((portal) => (
                            <span
                                key={portal}
                                className="rounded-full px-2.5 py-1 text-[11px] font-semibold border"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg)' }}
                            >
                                {portal}
                            </span>
                        ))}
                        <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            +más
                        </span>
                    </div>
                </div>

                {/* Fields list */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                    {enrichItems.map((item, i) => (
                        <div
                            key={item.label}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderTop: i === 0 ? undefined : '1px solid var(--border)' }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm" style={{ color: item.done ? 'var(--fg-muted)' : 'var(--fg)' }}>{item.label}</span>
                                {!item.done && (
                                    <span className="text-[11px] rounded-full px-2 py-0.5 shrink-0" style={{ background: '#fff2ee', color: '#FF3600' }}>
                                        {item.benefit}
                                    </span>
                                )}
                            </div>
                            <div
                                className="h-2.5 w-2.5 rounded-full shrink-0 flex items-center justify-center ml-2"
                                style={{ background: item.done ? '#059669' : 'var(--border)' }}
                            >
                                {item.done && (
                                    <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link
                        href={`/panel/publicar?edit=${listingId}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-opacity active:opacity-80"
                        style={{ background: '#FF3600', color: 'white' }}
                    >
                        Completar anuncio
                        <IconChevronRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Publish another */}
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
