'use client';

import { useMemo, useState } from 'react';
import {
    IconAlertCircle,
    IconCheck,
    IconCopy,
    IconDownload,
    IconEdit,
    IconExternalLink,
    IconLoader2,
    IconQrcode,
    IconShare3,
    IconX,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard } from '@simple/ui/panel';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { publicMariachiProfileUrl } from '@/lib/public-mariachi-routes';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';
const SLUG_RE = /^[a-z0-9-]{3,50}$/;

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
                    className="mx-auto rounded-xl border border-border bg-white p-2 lg:mx-0 lg:w-full lg:max-w-55"
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
    canPublish = true,
    showMobileQrToggle = true,
    onSaved,
}: {
    group: ProviderGroup;
    published: boolean;
    /** Si false, la página aún no puede activarse (faltan datos). */
    canPublish?: boolean;
    /** En desktop el QR va en la columna lateral; en móvil puede mostrarse bajo el link. */
    showMobileQrToggle?: boolean;
    onSaved?: () => Promise<void>;
}) {
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [editingSlug, setEditingSlug] = useState(false);
    const [slugDraft, setSlugDraft] = useState(group.slug);
    const [savingSlug, setSavingSlug] = useState(false);
    const [slugError, setSlugError] = useState('');

    const url = useMemo(() => publicMariachiProfileUrl(group.slug, APP_URL || undefined), [group.slug]);

    const qrSrc = url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(url)}`
        : null;

    function startEditSlug() {
        setSlugDraft(group.slug);
        setSlugError('');
        setEditingSlug(true);
    }

    function cancelEditSlug() {
        setEditingSlug(false);
        setSlugDraft(group.slug);
        setSlugError('');
    }

    function handleSlugChange(value: string) {
        setSlugDraft(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        setSlugError('');
    }

    async function saveSlug() {
        if (!SLUG_RE.test(slugDraft)) {
            setSlugError('Usa entre 3 y 50 caracteres: letras minúsculas, números y guiones.');
            return;
        }
        if (slugDraft === group.slug) {
            setEditingSlug(false);
            return;
        }
        setSavingSlug(true);
        setSlugError('');
        const response = await serenatasApi.updateProviderGroup(group.id, { slug: slugDraft } as Partial<ProviderGroup>);
        setSavingSlug(false);
        if (!response.ok) {
            setSlugError(response.error ?? 'No se pudo guardar el link.');
            return;
        }
        setEditingSlug(false);
        await onSaved?.();
    }

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
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Tu link público</p>
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        published ? 'bg-accent-soft text-accent' : 'bg-(--bg-subtle) text-fg-muted'
                    }`}
                >
                    {published ? 'Publicado' : 'No publicado'}
                </span>
            </div>

            {!editingSlug ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{url}</span>
                    <button
                        type="button"
                        onClick={startEditSlug}
                        className="shrink-0 rounded-lg p-1.5 text-fg-secondary transition-colors hover:bg-bg-subtle hover:text-fg"
                        title="Editar link"
                    >
                        <IconEdit size={14} />
                    </button>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-bg p-3">
                    <label className="block text-xs font-medium text-fg-muted" htmlFor="provider-public-slug">
                        Personaliza tu link
                    </label>
                    <div className="mt-2 flex min-w-0 items-center rounded-lg border border-border bg-surface px-3 py-2">
                        <span className="shrink-0 text-sm text-fg-muted">{APP_URL || 'https://simpleserenatas.app'}/</span>
                        <input
                            id="provider-public-slug"
                            value={slugDraft}
                            onChange={(event) => handleSlugChange(event.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none"
                            placeholder="mi-mariachi"
                            autoFocus
                            spellCheck={false}
                        />
                    </div>
                    {slugError ? (
                        <p className="mt-2 flex items-center gap-1 text-xs text-(--color-error,#dc2626)">
                            <IconAlertCircle size={12} />
                            {slugError}
                        </p>
                    ) : (
                        <p className="mt-2 text-xs text-fg-muted">
                            Si cambias el link, el anterior dejará de funcionar.
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <PanelButton
                            variant="accent"
                            size="sm"
                            onClick={() => void saveSlug()}
                            disabled={savingSlug || !SLUG_RE.test(slugDraft)}
                        >
                            {savingSlug ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                            {savingSlug ? 'Guardando...' : 'Guardar link'}
                        </PanelButton>
                        <PanelButton variant="secondary" size="sm" onClick={cancelEditSlug}>
                            <IconX size={14} />
                            Cancelar
                        </PanelButton>
                    </div>
                </div>
            )}

            {!published ? (
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                    {canPublish ? (
                        <>
                            Para activar tu página y compartir el link, activa{' '}
                            <strong className="font-medium text-fg">Visible en marketplace</strong> en el interruptor de arriba.
                        </>
                    ) : (
                        <>
                            Para activar tu página y compartir el link, completa primero los requisitos del recuadro de arriba y
                            luego activa <strong className="font-medium text-fg">Visible en marketplace</strong>.
                        </>
                    )}
                </p>
            ) : null}
            <p className="mt-2 text-xs text-fg-muted">Puedes editar este link desde esta misma tarjeta.</p>

            <div className="mt-4 flex flex-wrap gap-2">
                <PanelButton
                    variant="accent"
                    onClick={() => void copyUrl()}
                    disabled={!url}
                    className="min-w-35 flex-1 justify-center"
                >
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    {copied ? 'Copiado' : 'Copiar link'}
                </PanelButton>
                <button
                    type="button"
                    onClick={() => void shareUrl()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-fg-secondary transition-colors hover:bg-bg-subtle"
                    title="Compartir"
                >
                    <IconShare3 size={15} />
                    {shared ? 'Compartido' : 'Compartir'}
                </button>
                {showMobileQrToggle ? (
                    <button
                        type="button"
                        onClick={() => setShowQr((v) => !v)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:bg-bg-subtle"
                        style={{
                            borderColor: showQr ? 'var(--accent)' : 'var(--border)',
                            color: showQr ? 'var(--accent)' : 'var(--fg-secondary)',
                        }}
                        aria-expanded={showQr}
                        title="Mostrar código QR"
                    >
                        <IconQrcode size={15} />
                        QR
                    </button>
                ) : null}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-fg-secondary transition-colors hover:bg-bg-subtle"
                >
                    <IconExternalLink size={15} />
                    Ver
                </a>
            </div>

            {showMobileQrToggle && showQr && qrSrc ? (
                <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-center">
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
