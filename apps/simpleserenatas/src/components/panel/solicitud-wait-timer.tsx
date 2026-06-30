'use client';

import { useEffect, useState } from 'react';
import type { Serenata } from '@/lib/serenatas-api';
import { getSolicitudWaitState, type SolicitudWaitUrgency } from '@/lib/solicitud-wait-time';

const urgencyClass: Record<SolicitudWaitUrgency, string> = {
    ok: 'solicitud-wait solicitud-wait--ok',
    warning: 'solicitud-wait solicitud-wait--warning',
    danger: 'solicitud-wait solicitud-wait--danger',
};

export function SolicitudWaitTimer({ item }: { item: Serenata }) {
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setTick((value: number) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const state = getSolicitudWaitState(item);
    if (!state) return null;

    const suffix =
        state.urgency === 'danger'
            ? ' · plazo vencido'
            : state.urgency === 'warning' && state.remainingLabel
              ? ` · ${state.remainingLabel}`
              : null;

    return (
        <span
            className={urgencyClass[state.urgency]}
            role="timer"
            aria-live="polite"
            aria-label={`Esperando ${state.elapsedLabel}${suffix ?? ''}`}
        >
            <span className="solicitud-wait-dot" aria-hidden />
            Esperando <span className="solicitud-wait-time">{state.elapsedLabel}</span>
            {suffix ? <span className="solicitud-wait-suffix">{suffix}</span> : null}
        </span>
    );
}
