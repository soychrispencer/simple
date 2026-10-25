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
            return 'Completa tu nombre y actividad. La descripción, ubicación y contacto pueden esperar.';
        case 'servicios':
            return 'Crea un servicio con nombre y duración. El precio, la imagen y las preguntas previas son opcionales.';
        case 'horarios':
            return 'Define los días y horas en que atiendes. Puedes partir con un horario típico.';
        case 'publicar':
            return 'Tu servicio y horario ya están listos. Revisa los requisitos y activa tu perfil público.';
        default:
            return 'Completa este paso para que puedan reservarte.';
    }
}

function actionLabel(stepId: string): string {
    switch (stepId) {
        case 'perfil': return 'Completar perfil';
        case 'servicios': return 'Crear servicio';
        case 'horarios': return 'Definir horario';
        case 'publicar': return 'Revisar publicación';
        default: return 'Continuar';
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

    return (
        <PanelNotice tone="info" className={className}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p>{tipCopy(next.id)}</p>
                <Link
                    href={next.href}
                    className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
                >
                    {actionLabel(next.id)}
                </Link>
            </div>
        </PanelNotice>
    );
}
