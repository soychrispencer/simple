'use client';

import Link from 'next/link';
import { nextBusinessSetupStep, PanelNotice } from '@simple/ui/panel';
import { useAgendaBusinessSetup } from '@/hooks/use-agenda-business-setup';

type SetupStepId = 'perfil' | 'servicios' | 'horarios' | 'publicar';

type Props = {
    /**
     * Si se indica, solo se muestra cuando el siguiente paso incompleto es uno de estos
     * (útil en la página donde se completa ese paso).
     */
    focusStepId?: SetupStepId | SetupStepId[];
    className?: string;
};

function tipCopy(stepId: string): string {
    switch (stepId) {
        case 'perfil':
            return 'Completa tu nombre y profesión para que tu perfil público tenga cara.';
        case 'servicios':
            return 'Todavía no pueden reservarte online. Crea tu primer servicio (nombre, duración y precio).';
        case 'horarios':
            return 'Define cuándo pueden reservarte. Sin horario activo no hay cupos en tu link público.';
        case 'publicar':
            return 'Ya casi: publica tu perfil y comparte el link para recibir reservas.';
        default:
            return 'Completa este paso para que puedan reservarte.';
    }
}

/**
 * Tip contextual cuando falta un paso del camino corto.
 * Sin modales: lleva a la página real del siguiente paso.
 */
export function AgendaSetupTip({ focusStepId, className = '' }: Props) {
    const { steps, billing, loading, setupComplete } = useAgendaBusinessSetup();

    if (loading || !billing || setupComplete || billing.status === 'expired') {
        return null;
    }

    const next = nextBusinessSetupStep(steps);
    if (!next) return null;

    if (focusStepId) {
        const allowed = Array.isArray(focusStepId) ? focusStepId : [focusStepId];
        if (!allowed.includes(next.id as SetupStepId)) {
            return null;
        }
    }

    const onThisPage = Boolean(focusStepId);

    return (
        <PanelNotice tone="info" className={className}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p>{tipCopy(next.id)}</p>
                <Link
                    href={next.href}
                    className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
                >
                    {onThisPage ? 'Continuar aquí ↓' : 'Ir ahora'}
                </Link>
            </div>
        </PanelNotice>
    );
}
