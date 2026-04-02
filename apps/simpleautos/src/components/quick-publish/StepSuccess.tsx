'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    IconCheck, IconBrandWhatsapp, IconLink, IconPlus, IconChevronRight,
    IconBrandInstagram, IconLock, IconLoader2, IconExternalLink,
} from '@tabler/icons-react';
import {
    fetchInstagramIntegrationStatus,
    publishListingToInstagram,
    type InstagramIntegrationStatus,
} from '@/lib/instagram';

interface Props {
    listingId: string;
    listingHref: string;
    listingTitle: string;
    onPublishAnother: () => void;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.app';

export default function StepSuccess({ listingId, listingHref, listingTitle, onPublishAnother }: Props) {
    const [copied, setCopied] = useState(false);
    const [igStatus, setIgStatus] = useState<InstagramIntegrationStatus | null | 'loading'>('loading');
    const [igPublishing, setIgPublishing] = useState(false);
    const [igResult, setIgResult] = useState<{ ok: boolean; message: string } | null>(null);

    const publicUrl = `${APP_URL}${listingHref}`;
    const whatsappText = encodeURIComponent(`Mira este auto en SimpleAutos: ${listingTitle}\n${publicUrl}`);

    useEffect(() => {
        fetchInstagramIntegrationStatus()
            .then((s) => setIgStatus(s))
            .catch(() => setIgStatus(null));
    }, []);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    }

    async function handleInstagramPost() {
        setIgPublishing(true);
        setIgResult(null);
        const result = await publishListingToInstagram(listingId);
        setIgPublishing(false);
        setIgResult({
            ok: result.ok,
            message: result.ok
                ? 'Publicado en Instagram correctamente.'
                : (result.error ?? 'No se pudo publicar en Instagram.'),
        });
    }

    const igLoading = igStatus === 'loading';
    const igStatusResolved = igStatus !== 'loading' && igStatus !== null ? igStatus : null;
    const igEligible = igStatusResolved !== null && igStatusResolved.eligible;
    const igConnected = igStatusResolved !== null && igStatusResolved.eligible && igStatusResolved.account?.status === 'connected';

    return (
        <div className="flex flex-col gap-5 py-2">
            {/* Success header */}
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

                    {/* Primary actions */}
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
                </div>
            </div>

            {/* Share cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Card 1: Copy link */}
                <div
                    className="flex flex-col gap-3 rounded-2xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                        <IconLink size={18} style={{ color: 'var(--fg-secondary)' }} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Compartir link</p>
                        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                            Copia el enlace directo a tu publicación.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all active:opacity-80"
                        style={{
                            background: copied ? '#ecfdf5' : 'var(--bg-muted)',
                            color: copied ? '#059669' : 'var(--fg)',
                            border: `1px solid ${copied ? '#6ee7b7' : 'var(--border)'}`,
                        }}
                    >
                        {copied ? <IconCheck size={14} /> : <IconLink size={14} />}
                        {copied ? 'Link copiado' : 'Copiar link'}
                    </button>
                </div>

                {/* Card 2: WhatsApp */}
                <div
                    className="flex flex-col gap-3 rounded-2xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#dcfce7' }}>
                        <IconBrandWhatsapp size={18} color="#16a34a" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>WhatsApp</p>
                        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                            Envía tu publicación directamente por WhatsApp.
                        </p>
                    </div>
                    <a
                        href={`https://wa.me/?text=${whatsappText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-opacity active:opacity-80"
                        style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }}
                    >
                        <IconBrandWhatsapp size={14} />
                        Compartir
                    </a>
                </div>

                {/* Card 3: Instagram */}
                <InstagramShareCard
                    listingId={listingId}
                    loading={igLoading}
                    eligible={igEligible}
                    connected={igConnected}
                    publishing={igPublishing}
                    result={igResult}
                    onPublish={handleInstagramPost}
                />
            </div>

            <button
                type="button"
                onClick={onPublishAnother}
                className="w-full rounded-2xl border-2 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--bg)' }}
            >
                <IconPlus size={16} />
                Publicar otro vehículo
            </button>
        </div>
    );
}

function InstagramShareCard({
    listingId,
    loading,
    eligible,
    connected,
    publishing,
    result,
    onPublish,
}: {
    listingId: string;
    loading: boolean;
    eligible: boolean;
    connected: boolean;
    publishing: boolean;
    result: { ok: boolean; message: string } | null;
    onPublish: () => void;
}) {
    const cardStyle = { borderColor: 'var(--border)', background: 'var(--bg-subtle)' };

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex flex-col gap-3 rounded-2xl border p-4 animate-pulse" style={cardStyle}>
                <div className="h-9 w-9 rounded-xl" style={{ background: 'var(--bg-muted)' }} />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded-full" style={{ background: 'var(--bg-muted)' }} />
                    <div className="h-3 w-32 rounded-full" style={{ background: 'var(--bg-muted)' }} />
                </div>
                <div className="h-9 rounded-xl" style={{ background: 'var(--bg-muted)' }} />
            </div>
        );
    }

    // Not eligible (free plan) — show locked upgrade card
    if (!eligible) {
        return (
            <div className="flex flex-col gap-3 rounded-2xl border p-4" style={{ ...cardStyle, opacity: 0.85 }}>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(232,121,249,0.15)' }}>
                        <IconBrandInstagram size={18} color="#c026d3" />
                    </div>
                    <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: 'rgba(232,121,249,0.15)', color: '#c026d3' }}
                    >
                        Pro
                    </span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Instagram</p>
                    <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                        Publicá directo en tu cuenta con un clic. Disponible en planes Pro y Empresa.
                    </p>
                </div>
                <Link
                    href="/panel/suscripciones"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-opacity active:opacity-80"
                    style={{ background: 'rgba(232,121,249,0.10)', color: '#c026d3', borderColor: 'rgba(232,121,249,0.3)' }}
                >
                    <IconLock size={13} />
                    Ver planes
                </Link>
            </div>
        );
    }

    // Eligible but not connected
    if (!connected) {
        return (
            <div className="flex flex-col gap-3 rounded-2xl border p-4" style={cardStyle}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(232,121,249,0.15)' }}>
                    <IconBrandInstagram size={18} color="#c026d3" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Instagram</p>
                    <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                        Conecta tu cuenta para publicar directo desde SimpleAutos.
                    </p>
                </div>
                <Link
                    href="/panel/instagram"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-opacity active:opacity-80"
                    style={{ background: 'rgba(232,121,249,0.10)', color: '#c026d3', borderColor: 'rgba(232,121,249,0.3)' }}
                >
                    <IconExternalLink size={13} />
                    Conectar cuenta
                </Link>
            </div>
        );
    }

    // Eligible and connected — show publish button
    return (
        <div className="flex flex-col gap-3 rounded-2xl border p-4" style={cardStyle}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(232,121,249,0.15)' }}>
                <IconBrandInstagram size={18} color="#c026d3" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Instagram</p>
                <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                    {result
                        ? result.message
                        : 'Publicá este auto directo en tu feed de Instagram.'}
                </p>
            </div>
            {result?.ok ? (
                <div
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold"
                    style={{ background: '#ecfdf5', color: '#059669', borderColor: '#6ee7b7' }}
                >
                    <IconCheck size={14} />
                    Publicado
                </div>
            ) : (
                <button
                    type="button"
                    disabled={publishing}
                    onClick={onPublish}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-opacity active:opacity-80 disabled:opacity-50"
                    style={{ background: 'rgba(232,121,249,0.10)', color: '#c026d3', borderColor: 'rgba(232,121,249,0.3)' }}
                >
                    {publishing
                        ? <IconLoader2 size={14} className="animate-spin" />
                        : <IconBrandInstagram size={14} />}
                    {publishing ? 'Publicando...' : 'Publicar en Instagram'}
                </button>
            )}
        </div>
    );
}
