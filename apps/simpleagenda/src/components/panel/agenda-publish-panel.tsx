'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    IconAlertCircle,
    IconCheck,
    IconChevronRight,
    IconCopy,
    IconDownload,
    IconEdit,
    IconExternalLink,
    IconEye,
    IconEyeOff,
    IconLoader2,
    IconQrcode,
    IconShare3,
    IconWorld,
    IconX,
} from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelField } from '@simple/ui/panel';
import { checkSlugAvailable, fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3004';
const SLUG_RE = /^[a-z0-9-]{3,50}$/;

export function AgendaPublishPanel() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [copied, setCopied] = useState(false);
    const [editingSlug, setEditingSlug] = useState(false);
    const [slugDraft, setSlugDraft] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [savingSlug, setSavingSlug] = useState(false);
    const [slugError, setSlugError] = useState('');
    const [showQr, setShowQr] = useState(false);
    const [shared, setShared] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void fetchAgendaProfile().then((loaded) => {
            setProfile(loaded);
            setLoading(false);
        });
    }, []);

    const publicUrl = profile?.slug ? `${APP_URL}/${profile.slug}` : null;

    const startEditSlug = () => {
        setSlugDraft(profile?.slug ?? '');
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
        const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setSlugDraft(clean);
        setSlugAvailable(null);
        setSlugError('');
        if (!SLUG_RE.test(clean)) return;
        if (clean === profile?.slug) {
            setSlugAvailable(true);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setCheckingSlug(true);
        debounceRef.current = setTimeout(async () => {
            const res = await checkSlugAvailable(clean);
            setCheckingSlug(false);
            setSlugAvailable(res.available);
        }, 500);
    }, [profile?.slug]);

    const handleSaveSlug = async () => {
        if (!SLUG_RE.test(slugDraft)) {
            setSlugError('El link debe tener entre 3 y 50 caracteres (solo letras, números y guiones).');
            return;
        }
        if (slugAvailable === false) {
            setSlugError('Ese link ya está en uso.');
            return;
        }
        setSavingSlug(true);
        const res = await saveAgendaProfile({ slug: slugDraft } as Partial<AgendaProfile>);
        setSavingSlug(false);
        if (!res.ok) {
            setSlugError(res.error ?? 'No se pudo guardar.');
            return;
        }
        setProfile((prev) => (prev ? { ...prev, slug: slugDraft } : prev));
        setEditingSlug(false);
    };

    const handleCopy = async () => {
        if (!publicUrl) return;
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!publicUrl) return;
        const title = profile?.displayName ? `Reserva con ${profile.displayName}` : 'Reserva tu cita';
        const text = 'Reserva tu cita en línea:';
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, text, url: publicUrl });
                setShared(true);
                setTimeout(() => setShared(false), 2000);
                return;
            } catch {
                // cancelación o fallo del share nativo
            }
        }
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const qrSrc = publicUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicUrl)}`
        : null;

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando perfil público…</p>;
    }

    if (!profile?.slug) {
        return (
            <div className="grid w-full min-w-0 gap-5">
                <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center">
                    <IconAlertCircle size={32} className="text-fg-muted" />
                    <p className="text-sm font-medium text-fg">Primero completa tu perfil público</p>
                    <p className="text-xs text-fg-muted">
                        Define tu nombre visible en Perfil público para obtener tu link de reservas y aparecer en el directorio.
                    </p>
                    <Link
                        href="/panel/mi-negocio"
                        className="mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        Ir a Perfil público
                    </Link>
                </PanelCard>
            </div>
        );
    }

    return (
        <div className="grid w-full min-w-0 gap-5">
            <PanelCard size="md">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                        Tu link público
                    </p>
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                            background: profile.isPublished ? 'rgba(13,148,136,0.1)' : 'rgba(100,116,139,0.1)',
                            color: profile.isPublished ? 'var(--accent)' : 'var(--fg-muted)',
                        }}
                    >
                        {profile.isPublished ? <IconEye size={11} /> : <IconEyeOff size={11} />}
                        {profile.isPublished ? 'Publicado' : 'No publicado'}
                    </span>
                </div>

                {!editingSlug ? (
                    <>
                        <div
                            className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                        >
                            <span className="flex-1 truncate text-sm text-fg">{publicUrl}</span>
                            <button
                                type="button"
                                onClick={startEditSlug}
                                className="shrink-0 rounded-lg p-1.5 transition-colors hover:opacity-70"
                                style={{ color: 'var(--fg-secondary)' }}
                                title="Editar link"
                            >
                                <IconEdit size={14} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <PanelButton
                                variant="accent"
                                onClick={() => void handleCopy()}
                                className="min-w-35 flex-1 justify-center"
                            >
                                {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                                {copied ? 'Copiado' : 'Copiar link'}
                            </PanelButton>
                            <button
                                type="button"
                                onClick={() => void handleShare()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                title="Compartir"
                            >
                                <IconShare3 size={15} />
                                {shared ? 'Compartido' : 'Compartir'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQr((v) => !v)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:opacity-80"
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
                            <a
                                href={publicUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                <IconExternalLink size={15} />
                                Ver
                            </a>
                        </div>

                        {showQr && qrSrc && (
                            <div
                                className="mt-4 flex flex-col items-center gap-4 rounded-xl p-4 sm:flex-row"
                                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                            >
                                <img
                                    src={qrSrc}
                                    alt={`QR de ${publicUrl}`}
                                    width={140}
                                    height={140}
                                    className="shrink-0 rounded-lg border bg-white"
                                    style={{ borderColor: 'var(--border)' }}
                                />
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <p className="mb-1 text-sm font-semibold text-fg">Escanear para reservar</p>
                                    <p className="mb-3 text-xs text-fg-muted">
                                        Imprímelo para tu consulta o pégalo en redes sociales.
                                    </p>
                                    <a
                                        href={`${qrSrc}&download=1`}
                                        download={`reservas-${profile.slug}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--bg-subtle)"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        <IconDownload size={13} />
                                        Descargar PNG
                                    </a>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mb-1">
                        <PanelField label="Personaliza tu link" hint={`${APP_URL}/`}>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="form-input pr-8"
                                    value={slugDraft}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="tu-nombre"
                                    autoFocus
                                    spellCheck={false}
                                />
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    {checkingSlug && <IconLoader2 size={14} className="animate-spin text-fg-muted" />}
                                    {!checkingSlug && slugAvailable === true && slugDraft !== profile?.slug && (
                                        <IconCheck size={14} className="text-accent" />
                                    )}
                                    {!checkingSlug && slugAvailable === false && (
                                        <IconX size={14} style={{ color: 'var(--color-error)' }} />
                                    )}
                                </div>
                            </div>
                        </PanelField>
                        {slugError && (
                            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                <IconAlertCircle size={12} /> {slugError}
                            </p>
                        )}
                        {slugDraft && !SLUG_RE.test(slugDraft) && (
                            <p className="mt-1 text-xs text-fg-muted">
                                Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.
                            </p>
                        )}
                        {slugAvailable === false && !slugError && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                Ese link ya está en uso, prueba otro.
                            </p>
                        )}
                        {slugDraft !== profile?.slug && slugAvailable === true && (
                            <p className="mt-1 text-xs text-fg-muted">
                                Si cambias el link, tus links anteriores dejarán de funcionar.
                            </p>
                        )}
                        <div className="mt-3 flex gap-2">
                            <PanelButton
                                variant="accent"
                                onClick={() => void handleSaveSlug()}
                                disabled={savingSlug || checkingSlug || !SLUG_RE.test(slugDraft) || slugAvailable === false}
                            >
                                {savingSlug ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                {savingSlug ? 'Guardando…' : 'Guardar link'}
                            </PanelButton>
                            <PanelButton variant="secondary" onClick={cancelEditSlug}>
                                Cancelar
                            </PanelButton>
                        </div>
                    </div>
                )}
            </PanelCard>

            <PanelCard size="sm">
                <p className="mb-2 text-xs font-semibold text-fg">Cómo compartir</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        'Agrega el link a tu bio de Instagram',
                        'Inclúyelo en tu firma de correo',
                        'Compártelo directamente por WhatsApp',
                        'Agrégalo a tu sitio web',
                    ].map((tip) => (
                        <li key={tip} className="flex items-center gap-2 text-xs text-fg-muted">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {tip}
                        </li>
                    ))}
                </ul>
            </PanelCard>

            <Link
                href="/panel/mi-negocio/dominio"
                className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:border-[--accent-border]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                >
                    <IconWorld size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-fg">Dominio personalizado</p>
                        <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                        >
                            Próximamente
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        Usa tu propio dominio (ej. reservas.tu-consulta.cl).
                    </p>
                </div>
                <IconChevronRight size={16} className="text-fg-muted" />
            </Link>
        </div>
    );
}
