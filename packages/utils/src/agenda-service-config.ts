export const AGENDA_SERVICE_KINDS = ['appointment', 'group_event'] as const;
export type AgendaServiceKind = (typeof AGENDA_SERVICE_KINDS)[number];

export const AGENDA_GROUP_SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type AgendaGroupSessionStatus = (typeof AGENDA_GROUP_SESSION_STATUSES)[number];

export const AGENDA_GROUP_ATTENDEE_STATUSES = ['registered', 'attended', 'no_show', 'cancelled'] as const;
export type AgendaGroupAttendeeStatus = (typeof AGENDA_GROUP_ATTENDEE_STATUSES)[number];

export const AGENDA_SERVICE_KIND_LABELS: Record<AgendaServiceKind, string> = {
    appointment: 'Cita individual',
    group_event: 'Sesión grupal',
};

export function isAgendaGroupService(kind: string | null | undefined): kind is 'group_event' {
    return kind === 'group_event';
}
