import type {
    LeadAttentionLevel,
    LeadPriority,
    LeadQuickAction,
    LeadSlaSignal,
    ListingLeadStatus,
    ServiceLeadStatus,
} from './service.js';

export function serviceLeadStatusLabel(status: ServiceLeadStatus): string {
    if (status === 'contacted') return 'Contactado';
    if (status === 'qualified') return 'Calificado';
    if (status === 'closed') return 'Cerrado';
    return 'Nuevo';
}

export function leadPriorityLabel(priority: LeadPriority): string {
    if (priority === 'high') return 'Alta';
    if (priority === 'low') return 'Baja';
    return 'Media';
}

export function normalizeLeadTags(tags: string[] | undefined): string[] {
    if (!tags) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const rawTag of tags) {
        const tag = rawTag.trim().toLowerCase();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        result.push(tag);
        if (result.length >= 8) break;
    }
    return result;
}

export function getLeadQuickActionLabel(action: LeadQuickAction): string {
    if (action === 'call') return 'Llamada';
    if (action === 'whatsapp') return 'WhatsApp';
    if (action === 'email') return 'Correo';
    return 'Seguimiento';
}

function leadSignalSeverity(signal: LeadSlaSignal): number {
    return signal.tone === 'urgent' ? 2 : 1;
}

export function isSameCalendarDay(timestamp: number, reference = Date.now()): boolean {
    const left = new Date(timestamp);
    const right = new Date(reference);
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

export function createLeadSlaHelpers(deps: {
    formatAgo: (timestamp: number) => string;
    formatRelativeTimestamp: (timestamp: number) => string;
}) {
    const { formatAgo, formatRelativeTimestamp } = deps;

    function buildLeadSlaSignals(input: {
        status: ServiceLeadStatus | ListingLeadStatus;
        priority: LeadPriority;
        nextTaskAt: number | null;
        lastActivityAt: number;
    }): LeadSlaSignal[] {
        if (input.status === 'closed') return [];

        const now = Date.now();
        const idleHours = Math.max(0, Math.floor((now - input.lastActivityAt) / (1000 * 60 * 60)));
        const signals: LeadSlaSignal[] = [];

        if (input.nextTaskAt != null) {
            if (input.nextTaskAt <= now) {
                signals.push({
                    key: 'task_overdue',
                    label: `Tarea vencida ${formatAgo(input.nextTaskAt)}`,
                    tone: 'urgent',
                });
            } else if (isSameCalendarDay(input.nextTaskAt, now)) {
                signals.push({
                    key: 'task_due_today',
                    label: `Tarea ${formatRelativeTimestamp(input.nextTaskAt)}`,
                    tone: 'attention',
                });
            }
        }

        if (input.status === 'new' && idleHours >= 2) {
            signals.push({
                key: 'response_overdue',
                label: `Sin respuesta ${formatAgo(input.lastActivityAt)}`,
                tone: idleHours >= 12 ? 'urgent' : 'attention',
            });
        }

        if (input.priority === 'high') {
            signals.push({
                key: 'hot_lead',
                label: 'Lead caliente',
                tone: idleHours >= 4 ? 'urgent' : 'attention',
            });
        }

        if (signals.length === 0 && idleHours >= 24) {
            signals.push({
                key: 'idle_follow_up',
                label: `Sin gestión ${formatAgo(input.lastActivityAt)}`,
                tone: idleHours >= 72 ? 'urgent' : 'attention',
            });
        }

        return signals.sort((left, right) => leadSignalSeverity(right) - leadSignalSeverity(left));
    }

    function getLeadAttentionLevel(input: {
        status: ServiceLeadStatus | ListingLeadStatus;
        priority: LeadPriority;
        nextTaskAt: number | null;
        lastActivityAt: number;
    }): LeadAttentionLevel {
        if (input.status === 'closed') return 'fresh';
        const signals = buildLeadSlaSignals(input);
        if (signals.some((signal) => signal.tone === 'urgent')) return 'urgent';
        if (signals.some((signal) => signal.tone === 'attention')) return 'attention';
        return 'fresh';
    }

    function leadAttentionLabel(level: LeadAttentionLevel, signals: LeadSlaSignal[]): string | null {
        if (level === 'fresh') return null;
        return signals[0]?.label ?? null;
    }

    return {
        buildLeadSlaSignals,
        getLeadAttentionLevel,
        leadAttentionLabel,
    };
}
