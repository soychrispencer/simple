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
import {
    PanelCard,
    PanelButton,
    PanelSwitch,
    PanelPageHeader,
} from '@simple/ui';
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
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        );
    }

    if (!profile?.slug) {
        return (
            <div className="container-app panel-page py-8 max-w-lg">
                <PanelPageHeader
                    backHref="/panel/configuracion"
                    title="Link de reservas"
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
        <div className="container-app panel-page py-8 max-w-lg">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Link de reservas"
                description="Comparte este link con tus pacientes para que reserven directamente."
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
                        <PanelButton
                            variant="accent"
                            onClick={() => void handleCopy()}
                            className="flex-1 justify-center"
                        >
                            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                            {copied ? 'Copiado' : 'Copiar link'}
                        </PanelButton>
                        <a
                            href={publicUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle)"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconExternalLink size={15} />
                            Ver página
                        </a>
                    </div>
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

            </div>
        </div>
    );
}
