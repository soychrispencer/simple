'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    IconAlertCircle,
    IconCheck,
    IconCopy,
    IconDownload,
    IconEdit,
    IconExternalLink,
    IconEye,
    IconEyeOff,
    IconLoader2,
    IconQrcode,
    IconShare3,
    IconX,
} from '@tabler/icons-react';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';

export type BusinessPublicLinkState = {
    displayName: string | null;
    slug: string;
    isPublished: boolean;
};

export type BusinessPublicLinkAdapter = {
    load: () => Promise<BusinessPublicLinkState | null>;
    checkSlugAvailable?: (slug: string, currentSlug: string) => Promise<boolean | null>;
    saveSlug: (slug: string) => Promise<{ ok: boolean; error?: string; slug?: string }>;
    normalizeSlug: (value: string) => string;
    slugMinLength?: number;
    appBaseUrl: string;
    profilePathPrefix: string;
    profileEditHref: string;
    refreshEvents?: string[];
    shareTitle?: (state: BusinessPublicLinkState) => string;
    qrDownloadName?: (slug: string) => string;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
};

export type BusinessPublicLinkPanelProps = {
    adapter: BusinessPublicLinkAdapter;
    /** `minimal` — una tarjeta compacta para Perfil público. */
    variant?: 'default' | 'minimal';
};

function IconAction({
    title,
    onClick,
    href,
    disabled,
    children,
}: {
    title: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
    children: ReactNode;
}) {
    const className = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--fg-secondary) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) disabled:opacity-40';
    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={title}>
                {children}
            </a>
        );
    }
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={className} title={title}>
            {children}
        </button>
    );
}

export function BusinessPublicLinkPanel({ adapter, variant = 'default' }: BusinessPublicLinkPanelProps) {
    const slugMinLength = adapter.slugMinLength ?? 3;
    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<BusinessPublicLinkState | null>(null);
    const [copied, setCopied] = useState(false);
    const [editingSlug, setEditingSlug] = useState(false);
    const [slugDraft, setSlugDraft] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [savingSlug, setSavingSlug] = useState(false);
    const [slugError, setSlugError] = useState('');
    const [shared, setShared] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const next = await adapter.load();
        setState(next);
        setLoading(false);
    }, [adapter]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const events = adapter.refreshEvents ?? [];
        if (events.length === 0) return undefined;
        const handler = () => {
            void load();
        };
        for (const eventName of events) {
            window.addEventListener(eventName, handler);
        }
        return () => {
            for (const eventName of events) {
                window.removeEventListener(eventName, handler);
            }
        };
    }, [adapter.refreshEvents, load]);

    const slug = state?.slug ? adapter.normalizeSlug(state.slug) : '';
    const publicPath = slug ? `${adapter.profilePathPrefix}${slug}` : null;
    const publicUrl = publicPath ? `${adapter.appBaseUrl.replace(/\/$/, '')}${publicPath}` : null;

    const startEditSlug = () => {
        setSlugDraft(slug);
        setSlugAvailable(null);
        setSlugError('');
        setEditingSlug(true);
    };

    const cancelEditSlug = () => {
        setEditingSlug(false);
        setSlugDraft('');
        setSlugError('');
        setSlugAvailable(null);
    };

    const handleSlugChange = useCallback((val: string) => {
        const clean = adapter.normalizeSlug(val);
        setSlugDraft(clean);
        setSlugAvailable(null);
        setSlugError('');
        if (clean.length < slugMinLength) return;
        if (clean === slug) {
            setSlugAvailable(true);
            return;
        }
        if (!adapter.checkSlugAvailable) {
            setSlugAvailable(true);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setCheckingSlug(true);
        debounceRef.current = setTimeout(async () => {
            const available = await adapter.checkSlugAvailable!(clean, slug);
            setCheckingSlug(false);
            setSlugAvailable(available);
        }, 500);
    }, [adapter, slug, slugMinLength]);

    const handleSaveSlug = async () => {
        if (!state) return;
        const nextSlug = adapter.normalizeSlug(slugDraft);
        if (nextSlug.length < slugMinLength) {
            setSlugError(`El enlace debe tener al menos ${slugMinLength} caracteres.`);
            return;
        }
        if (slugAvailable === false) {
            setSlugError('Ese enlace ya está en uso.');
            return;
        }
        setSavingSlug(true);
        const response = await adapter.saveSlug(nextSlug);
        setSavingSlug(false);
        if (!response.ok) {
            setSlugError(response.error ?? 'No se pudo guardar.');
            return;
        }
        setState((prev) => (prev ? { ...prev, slug: response.slug ?? nextSlug } : prev));
        setEditingSlug(false);
    };

    const handleCopy = async () => {
        if (!publicUrl) return;
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!publicUrl || !state) return;
        const title = adapter.shareTitle?.(state) ?? (state.displayName ? `Perfil de ${state.displayName}` : 'Mi perfil público');
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, text: 'Mira mi perfil:', url: publicUrl });
                setShared(true);
                setTimeout(() => setShared(false), 2000);
                return;
            } catch {
                // cancelado
            }
        }
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const qrSrc = publicUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(publicUrl)}`
        : null;

    const slugEditForm = (
        <div className="space-y-2">
            <PanelField
                label={variant === 'minimal' ? 'Personaliza tu enlace' : 'Personaliza tu enlace'}
                hint={`${adapter.appBaseUrl.replace(/\/$/, '')}${adapter.profilePathPrefix}`}
            >
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-8"
                        value={slugDraft}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="mi-negocio"
                        autoFocus
                        spellCheck={false}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {checkingSlug && <IconLoader2 size={14} className="animate-spin text-(--fg-muted)" />}
                        {!checkingSlug && slugAvailable === true && slugDraft !== slug && (
                            <IconCheck size={14} className="text-accent" />
                        )}
                        {!checkingSlug && slugAvailable === false && (
                            <IconX size={14} style={{ color: 'var(--color-error)' }} />
                        )}
                    </div>
                </div>
            </PanelField>
            {slugError ? (
                <p className="flex items-center gap-1 text-xs text-(--color-error,#dc2626)">
                    <IconAlertCircle size={12} /> {slugError}
                </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
                <PanelButton
                    variant="accent"
                    size={variant === 'minimal' ? 'sm' : undefined}
                    onClick={() => void handleSaveSlug()}
                    disabled={savingSlug || checkingSlug || slugDraft.length < slugMinLength || slugAvailable === false}
                >
                    {savingSlug ? 'Guardando…' : 'Guardar enlace'}
                </PanelButton>
                <PanelButton variant="secondary" size={variant === 'minimal' ? 'sm' : undefined} onClick={cancelEditSlug}>
                    Cancelar
                </PanelButton>
            </div>
        </div>
    );

    if (loading) {
        return variant === 'minimal'
            ? null
            : <p className="text-sm text-(--fg-muted)">Cargando link público…</p>;
    }

    if (!state?.displayName?.trim()) {
        if (variant === 'minimal') {
            return (
                <p className="text-xs leading-relaxed text-(--fg-muted)">
                    {adapter.emptyStateDescription ?? 'Completa tu nombre público abajo para generar tu link.'}
                </p>
            );
        }
        return (
            <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center">
                <IconAlertCircle size={32} className="text-(--fg-muted)" />
                <p className="text-sm font-medium text-(--fg)">
                    {adapter.emptyStateTitle ?? 'Primero completa tu perfil público'}
                </p>
                <p className="text-xs text-(--fg-muted)">
                    {adapter.emptyStateDescription ?? 'Define tu nombre visible en Perfil público para obtener tu enlace y código QR.'}
                </p>
                <Link href={adapter.profileEditHref}>
                    <PanelButton type="button">Ir a Perfil público</PanelButton>
                </Link>
            </PanelCard>
        );
    }

    if (variant === 'minimal') {
        return (
            <PanelCard size="sm" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-(--fg)">Link público</p>
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                            background: state.isPublished ? 'rgba(13,148,136,0.1)' : 'rgba(100,116,139,0.1)',
                            color: state.isPublished ? 'var(--accent)' : 'var(--fg-muted)',
                        }}
                    >
                        {state.isPublished ? <IconEye size={10} /> : <IconEyeOff size={10} />}
                        {state.isPublished ? 'Publicado' : 'Borrador'}
                    </span>
                </div>

                {editingSlug ? slugEditForm : (
                    <>
                        <div className="flex items-center gap-1 rounded-xl border border-(--border) bg-(--bg-subtle) px-2 py-1.5">
                            <span className="min-w-0 flex-1 truncate px-1 text-xs sm:text-sm text-(--fg)">
                                {publicUrl ?? 'Define tu enlace'}
                            </span>
                            <IconAction title={copied ? 'Copiado' : 'Copiar link'} onClick={() => void handleCopy()} disabled={!publicUrl}>
                                {copied ? <IconCheck size={15} className="text-accent" /> : <IconCopy size={15} />}
                            </IconAction>
                            <IconAction title="Compartir" onClick={() => void handleShare()} disabled={!publicUrl}>
                                <IconShare3 size={15} />
                            </IconAction>
                            <IconAction title="Editar enlace" onClick={startEditSlug}>
                                <IconEdit size={15} />
                            </IconAction>
                            {publicUrl ? (
                                <IconAction title="Abrir perfil" href={publicUrl}>
                                    <IconExternalLink size={15} />
                                </IconAction>
                            ) : null}
                        </div>

                        {publicUrl ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowQr((value) => !value)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-(--fg-secondary) transition-colors hover:text-(--fg)"
                                >
                                    <IconQrcode size={14} />
                                    {showQr ? 'Ocultar QR' : 'Ver código QR'}
                                </button>
                                {shared ? <span className="text-xs text-accent">Compartido</span> : null}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={startEditSlug}
                                className="text-left text-xs font-medium text-accent hover:underline"
                            >
                                Personalizar enlace
                            </button>
                        )}

                        {showQr && qrSrc ? (
                            <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-3">
                                <img
                                    src={qrSrc}
                                    alt={`QR de ${publicUrl}`}
                                    width={88}
                                    height={88}
                                    className="shrink-0 rounded-lg border border-(--border) bg-white p-1"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-(--fg)">Código QR</p>
                                    <p className="mt-0.5 text-[11px] leading-relaxed text-(--fg-muted)">
                                        Para tarjetas, avisos o redes.
                                    </p>
                                    <a
                                        href={`${qrSrc}&download=1`}
                                        download={`${adapter.qrDownloadName?.(slug || 'publico') ?? `perfil-${slug || 'publico'}`}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-(--fg-secondary) hover:text-(--fg)"
                                    >
                                        <IconDownload size={12} />
                                        Descargar PNG
                                    </a>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </PanelCard>
        );
    }

    return (
        <div className="grid w-full min-w-0 gap-5">
            <PanelCard size="md">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
                        Tu link público
                    </p>
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                            background: state.isPublished ? 'rgba(13,148,136,0.1)' : 'rgba(100,116,139,0.1)',
                            color: state.isPublished ? 'var(--accent)' : 'var(--fg-muted)',
                        }}
                    >
                        {state.isPublished ? <IconEye size={11} /> : <IconEyeOff size={11} />}
                        {state.isPublished ? 'Publicado' : 'No publicado'}
                    </span>
                </div>

                {!editingSlug ? (
                    <>
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg) px-4 py-3">
                            <span className="flex-1 truncate text-sm text-(--fg)">
                                {publicUrl ?? 'Define tu enlace para generar el link'}
                            </span>
                            <button
                                type="button"
                                onClick={startEditSlug}
                                className="shrink-0 rounded-lg p-1.5 text-(--fg-secondary) transition-colors hover:opacity-70"
                                title="Editar enlace"
                            >
                                <IconEdit size={14} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <PanelButton
                                variant="accent"
                                onClick={() => void handleCopy()}
                                disabled={!publicUrl}
                                className="min-w-[140px] flex-1 justify-center"
                            >
                                {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                                {copied ? 'Copiado' : 'Copiar link'}
                            </PanelButton>
                            <button
                                type="button"
                                onClick={() => void handleShare()}
                                disabled={!publicUrl}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-(--border) px-4 py-2.5 text-sm text-(--fg-secondary) transition-colors hover:opacity-80 disabled:opacity-50"
                            >
                                <IconShare3 size={15} />
                                {shared ? 'Compartido' : 'Compartir'}
                            </button>
                            {publicUrl ? (
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-(--border) px-4 py-2.5 text-sm text-(--fg-secondary) transition-colors hover:opacity-80"
                                >
                                    <IconExternalLink size={15} />
                                    Ver
                                </a>
                            ) : null}
                        </div>
                    </>
                ) : slugEditForm}
            </PanelCard>

            {qrSrc ? (
                <PanelCard size="md" className="flex min-w-0 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">
                        Código QR
                    </p>
                    <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                        <img
                            src={qrSrc}
                            alt={`QR de ${publicUrl}`}
                            width={200}
                            height={200}
                            className="shrink-0 rounded-xl border border-(--border) bg-white p-2"
                        />
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                            <p className="text-sm font-semibold text-(--fg)">Escanear para ver tu perfil</p>
                            <p className="mt-1 text-xs leading-relaxed text-(--fg-muted)">
                                Imprímelo en tarjetas, avisos o publícalo en redes sociales.
                            </p>
                            <a
                                href={`${qrSrc}&download=1`}
                                download={`${adapter.qrDownloadName?.(slug || 'publico') ?? `perfil-${slug || 'publico'}`}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-(--border) px-3 py-2 text-xs font-medium text-(--fg-secondary) transition-colors hover:opacity-80"
                            >
                                <IconDownload size={14} />
                                Descargar PNG
                            </a>
                        </div>
                    </div>
                </PanelCard>
            ) : null}
        </div>
    );
}

export function normalizeBusinessPublicSlug(value: string, maxLength = 80): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, maxLength);
}

export function normalizeBusinessPublicSlugStrict(value: string, maxLength = 50): string {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, maxLength);
}
