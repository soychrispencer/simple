'use client';

import { useMemo, useState } from 'react';
import {
    IconCheck, IconCopy, IconDownload, IconExternalLink, IconQrcode, IconShare3, } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard } from '@simple/ui/panel';
import type { ProviderGroup } from '@/lib/serenatas-api';
import { publicMariachiProfileUrl } from '@/lib/public-mariachi-routes';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function ProviderPublishQrPanel({
    group,
    url,
    className = '',
}: {
    group: ProviderGroup;
    url: string;
    className?: string;
}) {
    const qrSrc = url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(url)}`
        : null;

    if (!qrSrc) return null;

    return (
        <PanelCard size="md" className={className}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Código QR</p>
            <div className="mt-4 flex flex-col items-center gap-4 lg:items-stretch">
                <img
                    src={qrSrc}
                    alt={`QR de ${url}`}
                    width={200}
                    height={200}
                    className="mx-auto rounded-xl border border-border bg-white p-2 lg:mx-0 lg:w-full lg:max-w-[220px]"
                />
                <div className="min-w-0 text-center lg:text-left">
                    <p className="text-sm font-semibold text-fg">Escanear para contratar</p>
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                        Imprímelo en volantes, tarjetas o publícalo en redes.
                    </p>
                    <a
                        href={`${qrSrc}&download=1`}
                        download={`serenata-${group.slug}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:bg-bg-subtle"
                    >
                        <IconDownload size={14} />
                        Descargar PNG
                    </a>
                </div>
            </div>
        </PanelCard>
    );
}

export function ProviderPublicProfileLink({
    group,
    published,
    showMobileQrToggle = true,
}: {
    group: ProviderGroup;
    published: boolean;
    /** En desktop el QR va en la columna lateral; en móvil puede mostrarse bajo el link. */
    showMobileQrToggle?: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);
    const [showQr, setShowQr] = useState(false);

    const url = useMemo(() => publicMariachiProfileUrl(group.slug, APP_URL || undefined), [group.slug]);

    const qrSrc = url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(url)}`
        : null;

    async function copyUrl() {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    async function shareUrl() {
        if (!url) return;
        const title = group.name ? `Contrata ${group.name}` : 'Simple Serenatas';
        const text = 'Reserva tu serenata en línea:';
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, text, url });
                setShared(true);
                window.setTimeout(() => setShared(false), 2000);
                return;
            } catch {
                // cancelación o sin soporte
            }
        }
        await copyUrl();
    }

    return (
        <PanelCard size="md" className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Tu link público</p>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
                <div
                    className="flex min-w-0 flex-1 items-center rounded-xl border border-border bg-bg px-4 py-3 lg:py-3.5"
                >
                    <span className="min-w-0 flex-1 break-all text-sm text-fg lg:font-mono lg:text-[0.8125rem] lg:leading-relaxed">
                        {url}
                    </span>
                </div>
                <PanelButton
                    variant="accent"
                    size="sm"
                    onClick={() => void copyUrl()}
                    disabled={!url}
                    className="w-full shrink-0 justify-center lg:w-auto lg:min-w-[8.5rem] lg:px-5"
                >
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    {copied ? 'Copiado' : 'Copiar link'}
                </PanelButton>
            </div>

            {!published ? (
                <p className="mt-3 text-xs text-fg-muted">
                    Activa <strong>Visible en marketplace</strong> para que los clientes puedan abrir esta página.
                </p>
            ) : null}
            <p className="mt-2 text-xs text-fg-muted lg:max-w-2xl">
                Si cambias el nombre en Datos comerciales, el link puede actualizarse al guardar.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:gap-3">
                <button
                    type="button"
                    onClick={() => void shareUrl()}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-fg-secondary transition-colors hover:bg-bg-subtle sm:min-w-[9rem] sm:flex-none lg:min-h-10"
                    title="Compartir"
                >
                    <IconShare3 size={15} />
                    {shared ? 'Compartido' : 'Compartir'}
                </button>
                {showMobileQrToggle ? (
                    <button
                        type="button"
                        onClick={() => setShowQr((v) => !v)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:bg-bg-subtle sm:min-w-[9rem] sm:flex-none lg:hidden lg:min-h-10"
                        style={{
                            borderColor: showQr ? 'var(--accent)' : 'var(--border)',
                            color: showQr ? 'var(--accent)' : 'var(--fg-secondary)',
                        }}
                        aria-expanded={showQr}
                        title="Mostrar código QR"
                    >
                        <IconQrcode size={15} />
                        {showQr ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                ) : null}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-fg-secondary transition-colors hover:bg-bg-subtle sm:min-w-[9rem] sm:flex-none lg:min-h-10"
                >
                    <IconExternalLink size={15} />
                    Ver página
                </a>
            </div>

            {showMobileQrToggle && showQr && qrSrc ? (
                <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-center lg:hidden">
                    <img
                        src={qrSrc}
                        alt={`QR de ${url}`}
                        width={140}
                        height={140}
                        className="shrink-0 rounded-lg border border-border bg-white"
                    />
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-sm font-semibold text-fg">Escanear para contratar</p>
                        <p className="mt-1 text-xs text-fg-muted">Imprímelo en volantes o compártelo en redes.</p>
                        <a
                            href={`${qrSrc}&download=1`}
                            download={`serenata-${group.slug}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-bg-subtle"
                        >
                            <IconDownload size={13} />
                            Descargar PNG
                        </a>
                    </div>
                </div>
            ) : null}
        </PanelCard>
    );
}
