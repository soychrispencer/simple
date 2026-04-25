'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    IconLoader2,
    IconCopy,
    IconCheck,
    IconExternalLink,
    IconAlertCircle,
    IconEye,
    IconEyeOff,
    IconEdit,
    IconX,
    IconShare3,
    IconQrcode,
    IconDownload,
    IconWorld,
    IconChevronRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import {
    PanelCard,
    PanelButton,
    PanelSwitch,
    PanelPageHeader,
    PanelField,
} from '@simple/ui';
import { fetchAgendaProfile, saveAgendaProfile, checkSlugAvailable, type AgendaProfile } from '@/lib/agenda-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3004';

const SLUG_RE = /^[a-z0-9-]{3,50}$/;

export default function LinkReservasPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [copied, setCopied] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [publishSaved, setPublishSaved] = useState(false);

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
        const load = async () => {
            const p = await fetchAgendaProfile();
            setProfile(p);
            setLoading(false);
        };
        void load();
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
        if (clean === profile?.slug) { setSlugAvailable(true); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setCheckingSlug(true);
        debounceRef.current = setTimeout(async () => {
            const res = await checkSlugAvailable(clean);
            setCheckingSlug(false);
            setSlugAvailable(res.available);
        }, 500);
    }, [profile?.slug]);

    const handleSaveSlug = async () => {
        if (!SLUG_RE.test(slugDraft)) { setSlugError('El link debe tener entre 3 y 50 caracteres (solo letras, números y guiones).'); return; }
        if (slugAvailable === false) { setSlugError('Ese link ya está en uso.'); return; }
        setSavingSlug(true);
        const res = await saveAgendaProfile({ slug: slugDraft } as Partial<AgendaProfile>);
        setSavingSlug(false);
        if (!res.ok) { setSlugError(res.error ?? 'No se pudo guardar.'); return; }
        setProfile((prev) => prev ? { ...prev, slug: slugDraft } : prev);
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
                // silenciar cancelación o fallo; caer al fallback
            }
        }
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const qrSrc = publicUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicUrl)}`
        : null;

    const handleTogglePublish = async (next: boolean) => {
        if (!profile) return;
        setTogglingPublish(true);
        setPublishSaved(false);
        await saveAgendaProfile({ isPublished: next } as Partial<AgendaProfile>);
        setProfile((prev) => prev ? { ...prev, isPublished: next } : prev);
        setTogglingPublish(false);
        setPublishSaved(true);
        setTimeout(() => setPublishSaved(false), 2500);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-4 lg:py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        );
    }

    if (!profile?.slug) {
        return (
            <div className="container-app panel-page py-4 lg:py-8 max-w-lg">
                <PanelPageHeader
                    backHref="/panel/configuracion"
                    title="Página de reservas"
                />
                <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center">
                    <IconAlertCircle size={32} style={{ color: 'var(--fg-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Primero configura tu perfil</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Define tu nombre y slug en Perfil profesional para obtener tu link público.
                    </p>
                    <div className="mt-1">
                        <a
                            href="/panel/configuracion/perfil"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                            Configurar perfil
                        </a>
                    </div>
                </PanelCard>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-lg">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Página de reservas"
                description="Tu link público, QR y dominio para recibir reservas en línea."
            />

            <div className="flex flex-col gap-4">

                {/* URL card */}
                <PanelCard size="md">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                            Tu link público
                        </p>
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                                background: profile.isPublished ? 'rgba(13,148,136,0.1)' : 'rgba(100,116,139,0.1)',
                                color: profile.isPublished ? 'var(--accent)' : 'var(--fg-muted)',
                            }}
                        >
                            {profile.isPublished ? <IconEye size={11} /> : <IconEyeOff size={11} />}
                            {profile.isPublished ? 'Publicado' : 'No publicado'}
                        </span>
                    </div>

                    {/* URL display / edit */}
                    {!editingSlug ? (
                        <>
                            <div
                                className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
                                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                            >
                                <span className="flex-1 text-sm truncate" style={{ color: 'var(--fg)' }}>
                                    {publicUrl}
                                </span>
                                <button
                                    type="button"
                                    onClick={startEditSlug}
                                    className="shrink-0 p-1.5 rounded-lg transition-colors hover:opacity-70"
                                    style={{ color: 'var(--fg-secondary)' }}
                                    title="Editar link"
                                >
                                    <IconEdit size={14} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                                <PanelButton
                                    variant="accent"
                                    onClick={() => void handleCopy()}
                                    className="flex-1 justify-center min-w-35"
                                >
                                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                                    {copied ? 'Copiado' : 'Copiar link'}
                                </PanelButton>
                                <button
                                    type="button"
                                    onClick={() => void handleShare()}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors hover:opacity-80"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    title="Compartir"
                                >
                                    <IconShare3 size={15} />
                                    {shared ? 'Compartido' : 'Compartir'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowQr((v) => !v)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors hover:opacity-80"
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
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors hover:opacity-80"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    <IconExternalLink size={15} />
                                    Ver
                                </a>
                            </div>

                            {showQr && qrSrc && (
                                <div
                                    className="mt-4 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={qrSrc}
                                        alt={`QR de ${publicUrl}`}
                                        width={140}
                                        height={140}
                                        className="rounded-lg border bg-white shrink-0"
                                        style={{ borderColor: 'var(--border)' }}
                                    />
                                    <div className="flex-1 min-w-0 text-center sm:text-left">
                                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                                            Escanear para reservar
                                        </p>
                                        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                            Imprímelo para tu consulta o pégalo en redes sociales.
                                        </p>
                                        <a
                                            href={`${qrSrc}&download=1`}
                                            download={`reservas-${profile.slug}.png`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle)"
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
                                        {checkingSlug && <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />}
                                        {!checkingSlug && slugAvailable === true && slugDraft !== profile?.slug && <IconCheck size={14} style={{ color: 'var(--accent)' }} />}
                                        {!checkingSlug && slugAvailable === false && <IconX size={14} style={{ color: 'var(--color-error)' }} />}
                                    </div>
                                </div>
                            </PanelField>
                            {slugError && (
                                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                                    <IconAlertCircle size={12} /> {slugError}
                                </p>
                            )}
                            {slugDraft && !SLUG_RE.test(slugDraft) && (
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.</p>
                            )}
                            {slugAvailable === false && !slugError && (
                                <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>Ese link ya está en uso, prueba otro.</p>
                            )}
                            {slugDraft !== profile?.slug && slugAvailable === true && (
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>⚠️ Si cambias el link, tus links anteriores dejarán de funcionar.</p>
                            )}
                            <div className="flex gap-2 mt-3">
                                <PanelButton
                                    variant="accent"
                                    onClick={() => void handleSaveSlug()}
                                    disabled={savingSlug || checkingSlug || !SLUG_RE.test(slugDraft) || slugAvailable === false}
                                >
                                    {savingSlug ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                    {savingSlug ? 'Guardando...' : 'Guardar link'}
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={cancelEditSlug}>Cancelar</PanelButton>
                            </div>
                        </div>
                    )}
                </PanelCard>

                {/* Publish toggle */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
                                {profile.isPublished ? 'Página activa' : 'Página inactiva'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {profile.isPublished
                                    ? 'Los pacientes pueden ver tu perfil y hacer reservas.'
                                    : 'Tu página no es visible para nadie. Actívala cuando estés listo.'}
                            </p>
                        </div>
                        {togglingPublish ? (
                            <IconLoader2 size={20} className="animate-spin shrink-0" style={{ color: 'var(--fg-muted)' }} />
                        ) : (
                            <PanelSwitch
                                checked={profile.isPublished}
                                onChange={(next) => void handleTogglePublish(next)}
                                ariaLabel={profile.isPublished ? 'Despublicar página' : 'Publicar página'}
                            />
                        )}
                    </div>
                    {publishSaved && (
                        <p className="mt-3 text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <IconCheck size={12} /> Guardado
                        </p>
                    )}
                </PanelCard>

                {/* How to share hint */}
                <PanelCard size="sm">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Cómo compartir</p>
                    <ul className="flex flex-col gap-1.5">
                        {[
                            'Agrega el link a tu bio de Instagram',
                            'Inclúyelo en tu firma de correo',
                            'Compártelo directamente por WhatsApp',
                            'Agrégalo a tu sitio web',
                        ].map((tip) => (
                            <li key={tip} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </PanelCard>

                {/* Dominio personalizado */}
                <Link
                    href="/panel/configuracion/dominio"
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                    >
                        <IconWorld size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Dominio personalizado</p>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                Próximamente
                            </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            Usa tu propio dominio (ej. reservas.tu-consulta.cl).
                        </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />
                </Link>

            </div>
        </div>
    );
}
