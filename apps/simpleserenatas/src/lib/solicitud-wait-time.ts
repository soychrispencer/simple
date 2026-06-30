import type { Serenata } from '@/lib/serenatas-api';
import { isPendingSerenataAction } from '@/lib/serenata-pending';

export type SolicitudWaitUrgency = 'ok' | 'warning' | 'danger';

export type SolicitudWaitState = {
    startedAt: number;
    dueAt: number | null;
    elapsedMs: number;
    elapsedLabel: string;
    remainingMs: number | null;
    remainingLabel: string | null;
    urgency: SolicitudWaitUrgency;
};

function parseSerenataTimestamp(value: string | null | undefined): number | null {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
}

export function formatSolicitudDuration(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function solicitudWaitStartedAt(item: Serenata): number | null {
    return parseSerenataTimestamp(item.paidAt)
        ?? parseSerenataTimestamp(item.createdAt);
}

export function solicitudNeedsOwnerResponse(item: Serenata): boolean {
    return isPendingSerenataAction(item);
}

const URGENCY_RANK: Record<SolicitudWaitUrgency, number> = {
    danger: 0,
    warning: 1,
    ok: 2,
};

/** Menor = más urgente (para ordenar bandeja). */
export function solicitudUrgencySortKey(item: Serenata, now = Date.now()): number {
    const state = getSolicitudWaitState(item, now);
    if (!state) return Number.POSITIVE_INFINITY;
    const urgencyRank = URGENCY_RANK[state.urgency];
    const timeKey = state.remainingMs != null
        ? state.remainingMs
        : -state.elapsedMs;
    return urgencyRank * 1e15 + timeKey;
}

export function compareSolicitudesByUrgency(a: Serenata, b: Serenata, now = Date.now()): number {
    return solicitudUrgencySortKey(a, now) - solicitudUrgencySortKey(b, now);
}

export function pickMostUrgentSolicitudId(items: Serenata[], now = Date.now()): string | null {
    const pending = items.filter(solicitudNeedsOwnerResponse);
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => compareSolicitudesByUrgency(a, b, now))[0]?.id ?? null;
}

export function sortSolicitudesInbox(items: Serenata[], now = Date.now()): Serenata[] {
    return [...items].sort((a, b) => {
        const aPending = solicitudNeedsOwnerResponse(a);
        const bPending = solicitudNeedsOwnerResponse(b);
        if (aPending && bPending) return compareSolicitudesByUrgency(a, b, now);
        if (aPending) return -1;
        if (bPending) return 1;
        const aWhen = `${a.eventDate}T${a.eventTime}`;
        const bWhen = `${b.eventDate}T${b.eventTime}`;
        return aWhen.localeCompare(bWhen);
    });
}

export function getSolicitudWaitState(item: Serenata, now = Date.now()): SolicitudWaitState | null {
    if (!solicitudNeedsOwnerResponse(item)) return null;
    const startedAt = solicitudWaitStartedAt(item);
    if (startedAt == null) return null;

    const dueAt = parseSerenataTimestamp(item.responseDueAt);
    const elapsedMs = Math.max(0, now - startedAt);
    const remainingMs = dueAt != null ? dueAt - now : null;

    let urgency: SolicitudWaitUrgency = 'ok';
    if (remainingMs != null) {
        if (remainingMs <= 0) urgency = 'danger';
        else if (remainingMs <= 15 * 60 * 1000) urgency = 'warning';
    } else if (elapsedMs >= 60 * 60 * 1000) {
        urgency = 'warning';
    }

    return {
        startedAt,
        dueAt,
        elapsedMs,
        elapsedLabel: formatSolicitudDuration(elapsedMs),
        remainingMs,
        remainingLabel: remainingMs != null ? formatSolicitudDuration(Math.max(0, remainingMs)) : null,
        urgency,
    };
}
