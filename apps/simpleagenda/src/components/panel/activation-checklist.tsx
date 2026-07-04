'use client';

import { useState } from 'react';
import { IconCheck, IconCircleCheck, IconCircleDashed, IconLink, IconExternalLink, IconClipboard, IconBrandWhatsapp } from '@tabler/icons-react';
import Link from 'next/link';
import type { AgendaStats, AgendaProfile } from '@/lib/agenda-api';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

type ActivationChecklistProps = {
    stats: AgendaStats;
    profile: AgendaProfile | null;
};

type Step = {
    key: string;
    label: string;
    done: boolean;
    href?: string;
    action?: 'copy-link' | 'whatsapp';
};

export function ActivationChecklist({ stats, profile }: ActivationChecklistProps) {
    const [copied, setCopied] = useState(false);

    const slug = profile?.slug ?? '';
    const publicUrl = slug ? `${APP_URL}/${slug}` : null;
    const isPublished = profile?.isPublished ?? false;
    const hasProfile = Boolean(profile?.displayName);

    const steps: Step[] = [
        {
            key: 'profile',
            label: 'Completa tu perfil público',
            done: hasProfile && isPublished,
            href: '/panel/mi-negocio/apariencia',
        },
        {
            key: 'services',
            label: 'Agrega al menos un servicio',
            done: stats.hasServices,
            href: '/panel/mi-negocio/servicios',
        },
        {
            key: 'schedule',
            label: 'Configura tus horarios',
            done: stats.hasRules,
            href: '/panel/mi-negocio/horarios',
        },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    const allDone = completedCount === steps.length;

    if (allDone) return null;

    const handleCopyLink = async () => {
        if (!publicUrl) return;
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const whatsAppUrl = publicUrl
        ? `https://wa.me/?text=${encodeURIComponent(`Agenda tu cita conmigo: ${publicUrl}`)}`
        : null;

    return (
        <div className="rounded-2xl border border-[var(--accent-border)] p-5 sm:p-6 activation-checklist">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                    <IconLink size={20} />
                </div>
                <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                        Te faltan {steps.length - completedCount} {steps.length - completedCount === 1 ? 'paso' : 'pasos'} para recibir tu primera reserva
                    </h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Configura lo básico y comparte tu link para que tus clientes puedan agendar.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {/* Cuenta creada — always done */}
                <div className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <IconCircleCheck size={20} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cuenta creada</span>
                </div>

                {steps.map((step) => (
                    <div
                        key={step.key}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl transition-colors"
                        style={{ background: step.done ? 'var(--bg-subtle)' : 'transparent' }}
                    >
                        {step.done ? (
                            <IconCircleCheck size={20} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                        ) : (
                            <IconCircleDashed size={20} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                        )}
                        <span className="text-sm flex-1" style={{ color: step.done ? 'var(--fg-muted)' : 'var(--fg)' }}>
                            {step.label}
                        </span>
                        {!step.done && step.href && (
                            <Link
                                href={step.href}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                            >
                                Configurar
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* Link de reservas — visible siempre que exista el slug */}
            {publicUrl && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                        Tu link de reservas
                    </p>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex-1 min-w-0 h-10 px-3 rounded-xl border text-sm flex items-center gap-2 truncate"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        >
                            <IconLink size={14} className="shrink-0" style={{ color: 'var(--fg-muted)' }} />
                            <span className="truncate">{publicUrl}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0"
                            style={{
                                borderColor: copied ? 'var(--color-success)' : 'var(--border)',
                                background: copied ? 'var(--color-success)' : 'var(--surface)',
                                color: copied ? '#fff' : 'var(--fg)',
                            }}
                        >
                            {copied ? <IconCheck size={14} /> : <IconClipboard size={14} />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                        {whatsAppUrl && (
                            <a
                                href={whatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-10 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0"
                                style={{ background: '#25D366', color: '#fff' }}
                            >
                                <IconBrandWhatsapp size={14} />
                                Enviar
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
