'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    IconWorld,
    IconLoader2,
    IconCheck,
    IconLock,
    IconCopy,
    IconAlertCircle,
    IconBell,
} from '@tabler/icons-react';
import { PanelCard, PanelButton, PanelPageHeader } from '@simple/ui';
import {
    fetchAgendaProfile,
    isPlanActive,
    type AgendaProfile,
} from '@/lib/agenda-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app';

const APP_HOST = (() => {
    try {
        return new URL(APP_URL).host;
    } catch {
        return 'simpleagenda.app';
    }
})();

export default function DominioPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [copied, setCopied] = useState(false);
    const [interest, setInterest] = useState(false);

    useEffect(() => {
        void (async () => {
            const p = await fetchAgendaProfile();
            if (p) {
                setProfile(p);
                setIsPro(isPlanActive(p));
            }
            setLoading(false);
        })();
    }, []);

    const currentUrl = profile?.slug ? `${APP_URL}/${profile.slug}` : null;

    const handleCopyCname = async () => {
        await navigator.clipboard.writeText(APP_HOST);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleInterest = () => {
        setInterest(true);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem('simpleagenda:domain-interest', new Date().toISOString());
            } catch {
                // ignorar storage bloqueado
            }
        }
    };

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion/link"
                title="Dominio personalizado"
                description="Usa tu propio dominio para la página de reservas."
            />

            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : !profile?.slug ? (
                <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center">
                    <IconAlertCircle size={32} style={{ color: 'var(--fg-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                        Primero publica tu link
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Configura tu link de reservas antes de conectar un dominio propio.
                    </p>
                    <Link
                        href="/panel/configuracion/link"
                        className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        Configurar link
                    </Link>
                </PanelCard>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Link actual */}
                    <PanelCard size="md">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconWorld size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Tu dominio actual</h2>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Activo
                                    </span>
                                </div>
                                <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                    Todas tus reservas hoy pasan por este link.
                                </p>
                                <div
                                    className="px-3 py-2 rounded-lg text-sm font-mono truncate"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                >
                                    {currentUrl}
                                </div>
                            </div>
                        </div>
                    </PanelCard>

                    {/* Dominio personalizado — próximamente */}
                    <PanelCard size="md">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                <IconWorld size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Conectar tu dominio</h2>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                        Próximamente
                                    </span>
                                    {!isPro && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309' }}>
                                            Pro
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                    Apunta un dominio propio (ej. <strong>reservas.tu-consulta.cl</strong>) a SimpleAgenda sin perder tus links anteriores.
                                </p>

                                {/* Preview paso a paso */}
                                <ol className="flex flex-col gap-3 mb-4">
                                    {[
                                        {
                                            title: 'Compra un dominio',
                                            body: 'En NIC.cl, Namecheap, GoDaddy o el proveedor que prefieras.',
                                        },
                                            {
                                            title: 'Agrega un registro CNAME',
                                            body: (
                                                <span>
                                                    Apunta <code style={{ background: 'var(--bg-muted)', padding: '1px 4px', borderRadius: 4 }}>reservas</code> a{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleCopyCname()}
                                                        className="inline-flex items-center gap-1 align-baseline text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
                                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                                                    >
                                                        <code>{APP_HOST}</code>
                                                        {copied ? <IconCheck size={11} style={{ color: 'var(--accent)' }} /> : <IconCopy size={11} />}
                                                    </button>
                                                </span>
                                            ),
                                        },
                                        {
                                            title: 'Verifica desde SimpleAgenda',
                                            body: 'Generaremos el certificado HTTPS automáticamente en minutos.',
                                        },
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold"
                                                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                            >
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{step.title}</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{step.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>

                                <div
                                    className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4"
                                    style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border, var(--border))' }}
                                >
                                    <IconLock size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Cuando esté disponible, <strong style={{ color: 'var(--fg)' }}>Dominio personalizado</strong> será parte del plan Pro o Empresa.
                                    </p>
                                </div>

                                <PanelButton
                                    variant={interest ? 'secondary' : 'accent'}
                                    size="sm"
                                    onClick={handleInterest}
                                    disabled={interest}
                                >
                                    {interest ? <IconCheck size={13} /> : <IconBell size={13} />}
                                    {interest ? 'Te avisaremos' : 'Avísame cuando esté listo'}
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            )}
        </div>
    );
}
