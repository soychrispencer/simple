'use client';

import { useEffect, useState } from 'react';
import {
    IconLoader2,
    IconCopy,
    IconCheck,
    IconExternalLink,
    IconAlertCircle,
    IconEye,
    IconEyeOff,
} from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3004';

export default function LinkReservasPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [copied, setCopied] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [publishSaved, setPublishSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const p = await fetchAgendaProfile();
            setProfile(p);
            setLoading(false);
        };
        void load();
    }, []);

    const publicUrl = profile?.slug ? `${APP_URL}/${profile.slug}` : null;

    const handleCopy = async () => {
        if (!publicUrl) return;
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTogglePublish = async () => {
        if (!profile) return;
        setTogglingPublish(true);
        setPublishSaved(false);
        const next = !profile.isPublished;
        await saveAgendaProfile({ isPublished: next } as Partial<AgendaProfile>);
        setProfile((prev) => prev ? { ...prev, isPublished: next } : prev);
        setTogglingPublish(false);
        setPublishSaved(true);
        setTimeout(() => setPublishSaved(false), 2500);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        );
    }

    if (!profile?.slug) {
        return (
            <div className="container-app panel-page py-8 max-w-lg">
                <a href="/panel/configuracion" className="inline-flex items-center gap-1 text-xs font-medium mb-3 transition-colors" style={{ color: 'var(--fg-muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    Configuracion
                </a>
                <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Link de reservas</h1>
                <div className="mt-8 rounded-2xl border p-6 flex flex-col items-center gap-3 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <IconAlertCircle size={32} style={{ color: 'var(--fg-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Primero configura tu perfil</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Define tu nombre y slug en Perfil profesional para obtener tu link público.
                    </p>
                    <a
                        href="/panel/configuracion/perfil"
                        className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        Configurar perfil
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-8 max-w-lg">
            <a href="/panel/configuracion" className="inline-flex items-center gap-1 text-xs font-medium mb-3 transition-colors" style={{ color: 'var(--fg-muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                Configuracion
            </a>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Link de reservas</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Comparte este link con tus pacientes para que reserven directamente.
            </p>

            <div className="flex flex-col gap-4">

                {/* URL card */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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

                    {/* URL display */}
                    <div
                        className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    >
                        <span className="flex-1 text-sm truncate" style={{ color: 'var(--fg)' }}>
                            {publicUrl}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => void handleCopy()}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                            {copied ? 'Copiado' : 'Copiar link'}
                        </button>
                        <a
                            href={publicUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconExternalLink size={15} />
                            Ver página
                        </a>
                    </div>
                </div>

                {/* Publish toggle */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
                                {profile.isPublished ? 'Página activa' : 'Página inactiva'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {profile.isPublished
                                    ? 'Los pacientes pueden ver tu perfil y hacer reservas.'
                                    : 'Tu página no es visible para nadie. Actívala cuando estés listo.'}
                            </p>
                        </div>
                        <button
                            onClick={() => void handleTogglePublish()}
                            disabled={togglingPublish}
                            className="relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60"
                            style={{ background: profile.isPublished ? 'var(--accent)' : 'var(--border)' }}
                        >
                            {togglingPublish
                                ? <IconLoader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />
                                : (
                                    <span
                                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                                        style={{ transform: profile.isPublished ? 'translateX(20px)' : 'translateX(0)' }}
                                    />
                                )}
                        </button>
                    </div>
                    {publishSaved && (
                        <p className="mt-3 text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <IconCheck size={12} /> Guardado
                        </p>
                    )}
                </div>

                {/* How to share hint */}
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                </div>

            </div>
        </div>
    );
}
