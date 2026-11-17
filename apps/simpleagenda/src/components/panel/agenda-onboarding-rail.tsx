'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react';
import { PanelBusinessSetupCard, PanelButton, PanelCard, PanelNotice } from '@simple/ui/panel';
import { WhatsAppClickButton } from '@/components/whatsapp-click-button';
import { useAgendaBusinessSetup } from '@/hooks/use-agenda-business-setup';

type Props = {
    className?: string;
};

export function AgendaOnboardingRail({ className = '' }: Props) {
    const {
        steps,
        billing,
        propertyVisitsEnabled,
        loading,
        setupComplete,
        isPublished,
        publicUrl,
        displayName,
        error,
        reload,
    } = useAgendaBusinessSetup();
    const [copied, setCopied] = useState(false);

    if (error) {
        return <PanelNotice tone="info" className={className}>
            <p>{error}</p>
            <PanelButton onClick={() => void reload()}>Reintentar</PanelButton>
        </PanelNotice>;
    }

    if (loading || !billing) {
        return null;
    }

    if (propertyVisitsEnabled) {
        if (setupComplete) return null;
        return (
            <PanelCard size="md" className={className}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-(--fg)">Coordina visitas desde SimpleAgenda</h2>
                        <p className="mt-1 text-sm leading-6 text-fg-muted">
                            Tu espacio de SimplePropiedades está conectado. Agenda visitas o reuniones desde su cartera, sin configurar una agenda pública.
                        </p>
                    </div>
                    <Link href="/panel/visitas-equipo?nueva=1" className="shrink-0">
                        <PanelButton type="button" className="w-full sm:w-auto">Agendar primera visita</PanelButton>
                    </Link>
                </div>
            </PanelCard>
        );
    }

    if (!setupComplete) {
        return (
            <div className={className}>
                <PanelBusinessSetupCard
                    steps={steps}
                    billing={billing}
                    title="Pon tu agenda en marcha"
                />
            </div>
        );
    }

    if (!isPublished || !publicUrl) {
        return null;
    }

    const shareMessage = [
        displayName ? `Reserva con ${displayName}` : 'Reserva tu cita',
        publicUrl,
    ].join('\n');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <div className={className}>
            <PanelCard size="md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-ink)' }}
                            >
                                <IconCheck size={14} />
                            </span>
                            <h2 className="text-base font-semibold text-(--fg)">
                                Tu link ya puede recibir citas
                            </h2>
                        </div>
                        <p className="text-sm text-fg-muted">
                            Compártelo por WhatsApp o redes. Los recordatorios automáticos van por email.
                        </p>
                        <p
                            className="truncate rounded-lg border px-3 py-2 font-mono text-xs text-(--fg)"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                        >
                            {publicUrl}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <PanelButton type="button" variant="secondary" size="sm" onClick={() => void handleCopy()}>
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            {copied ? 'Copiado' : 'Copiar link'}
                        </PanelButton>
                        <WhatsAppClickButton
                            phone={null}
                            message={shareMessage}
                            label="WhatsApp"
                            className="px-3 py-2"
                        />
                        <Link href={publicUrl} target="_blank" rel="noreferrer">
                            <PanelButton type="button" variant="secondary" size="sm">
                                <IconExternalLink size={14} />
                                Ver perfil
                            </PanelButton>
                        </Link>
                    </div>
                </div>
            </PanelCard>
        </div>
    );
}
