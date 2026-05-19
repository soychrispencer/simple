import type {
    AppUser,
    LeadAttentionLevel,
    LeadPriority,
    LeadSlaSignal,
    ListingLeadActivityType,
    ListingLeadChannel,
    ListingLeadSource,
    ListingLeadStatus,
    ServiceLeadActivityRecord,
    ServiceLeadActivityType,
    ServiceLeadPlanId,
    ServiceLeadStatus,
    ServiceLeadType,
    VerticalType,
} from './service.js';

export type CrmAssigneeResponse = {
    id: string;
    kind: 'user' | 'team_member';
    value: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    roleTitle: string;
    isLeadContact: boolean;
};

export type PublicProfileTeamMemberRecord = {
    id: string;
    name: string;
    roleTitle: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    receivesLeads: boolean;
    isLeadContact: boolean;
};

export type LeadPresentationDeps = {
    usersById: Map<string, AppUser>;
    getEditablePublicProfileTeamMembers: (ownerUserId: string, vertical: VerticalType) => PublicProfileTeamMemberRecord[];
    serviceLeadStatusLabel: (status: ServiceLeadStatus) => string;
    leadPriorityLabel: (priority: LeadPriority) => string;
    buildLeadSlaSignals: (input: {
        status: ServiceLeadStatus | ListingLeadStatus;
        priority: LeadPriority;
        nextTaskAt: number | null;
        lastActivityAt: number;
    }) => LeadSlaSignal[];
    getLeadAttentionLevel: (input: {
        status: ServiceLeadStatus | ListingLeadStatus;
        priority: LeadPriority;
        nextTaskAt: number | null;
        lastActivityAt: number;
    }) => LeadAttentionLevel;
    leadAttentionLabel: (level: LeadAttentionLevel, signals: LeadSlaSignal[]) => string | null;
    formatRelativeTimestamp: (ts: number) => string;
    formatAgo: (ts: number) => string;
};

export function buildLeadQuickFollowUpAt(now = Date.now()): number {
    const target = new Date(now);
    if (target.getHours() >= 18) {
        target.setDate(target.getDate() + 1);
        target.setHours(10, 0, 0, 0);
        return target.getTime();
    }

    target.setHours(18, 0, 0, 0);
    if (target.getTime() <= now) {
        target.setHours(target.getHours() + 2);
    }
    return target.getTime();
}

export function serviceLeadServiceLabel(type: ServiceLeadType): string {
    return type === 'gestion_inmobiliaria' ? 'Gestion inmobiliaria' : 'Venta asistida';
}

export function serviceLeadActivityLabel(type: ServiceLeadActivityType): string {
    if (type === 'assignment') return 'Asignacion';
    if (type === 'status') return 'Estado';
    if (type === 'task') return 'Proxima tarea';
    if (type === 'contact') return 'Contacto';
    if (type === 'note') return 'Nota interna';
    return 'Creacion';
}

export function crmAssigneeValue(input: { kind: 'user' | 'team_member'; id: string }): string {
    return `${input.kind}:${input.id}`;
}

export function listingLeadStatusLabel(status: ListingLeadStatus): string {
    if (status === 'contacted') return 'Contactado';
    if (status === 'qualified') return 'Calificado';
    if (status === 'closed') return 'Cerrado';
    return 'Nuevo';
}

export function listingLeadSourceLabel(source: ListingLeadSource, vertical?: VerticalType): string {
    if (source === 'direct_message') return 'Mensaje directo';
    if (source === 'whatsapp') return 'WhatsApp';
    if (source === 'phone_call') return 'Llamada';
    if (source === 'email') return 'Correo';
    if (source === 'instagram') return 'Instagram';
    if (source === 'facebook') return 'Facebook';
    if (source === 'mercadolibre') return vertical === 'propiedades' ? 'Portal Inmobiliario' : 'MercadoLibre';
    if (source === 'yapo') return 'Yapo';
    if (source === 'chileautos') return 'Chileautos';
    if (source === 'portal') return 'Portal externo';
    return 'Formulario interno';
}

export function listingLeadChannelLabel(channel: ListingLeadChannel): string {
    if (channel === 'message') return 'Mensaje';
    if (channel === 'social') return 'Red social';
    if (channel === 'portal') return 'Portal';
    return 'Lead';
}

export function listingLeadActivityLabel(type: ListingLeadActivityType): string {
    if (type === 'assignment') return 'Asignacion';
    if (type === 'status') return 'Estado';
    if (type === 'task') return 'Proxima tarea';
    if (type === 'contact') return 'Contacto';
    if (type === 'note') return 'Nota interna';
    if (type === 'message') return 'Mensaje';
    return 'Creacion';
}

export function createLeadPresentation(deps: LeadPresentationDeps) {
    const {
        usersById,
        getEditablePublicProfileTeamMembers,
        serviceLeadStatusLabel,
        leadPriorityLabel,
        buildLeadSlaSignals,
        getLeadAttentionLevel,
        leadAttentionLabel,
        formatRelativeTimestamp,
        formatAgo,
    } = deps;

    function serviceLeadAssigneeToResponse(user: AppUser | null | undefined): CrmAssigneeResponse | null {
        if (!user) return null;
        return {
            id: user.id,
            kind: 'user',
            value: crmAssigneeValue({ kind: 'user', id: user.id }),
            name: user.name,
            email: user.email ?? null,
            phone: user.phone ?? null,
            role: user.role,
            roleTitle: user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Admin' : 'Cuenta principal',
            isLeadContact: true,
        };
    }

    function teamMemberAssigneeToResponse(member: PublicProfileTeamMemberRecord): CrmAssigneeResponse {
        return {
            id: member.id,
            kind: 'team_member',
            value: crmAssigneeValue({ kind: 'team_member', id: member.id }),
            name: member.name,
            email: member.email,
            phone: member.whatsapp || member.phone,
            role: null,
            roleTitle: member.roleTitle ?? 'Miembro del equipo',
            isLeadContact: member.isLeadContact,
        };
    }

    function getLeadRoutingCandidates(ownerUserId: string, vertical: VerticalType) {
        return getEditablePublicProfileTeamMembers(ownerUserId, vertical)
            .filter((item) => item.receivesLeads);
    }

    function listingLeadAssigneeToResponse(record: {
        ownerUserId: string;
        vertical: VerticalType;
        assignedToTeamMemberId: string | null;
        assignedToUserId: string | null;
    }): CrmAssigneeResponse | null {
        if (record.assignedToTeamMemberId) {
            const teamMember = getEditablePublicProfileTeamMembers(record.ownerUserId, record.vertical)
                .find((item) => item.id === record.assignedToTeamMemberId) ?? null;
            if (teamMember) return teamMemberAssigneeToResponse(teamMember);
        }
        if (record.assignedToUserId) {
            return serviceLeadAssigneeToResponse(usersById.get(record.assignedToUserId) ?? null);
        }
        return null;
    }

    function listListingLeadAssignees(ownerUserId: string, vertical: VerticalType): CrmAssigneeResponse[] {
        const owner = usersById.get(ownerUserId) ?? null;
        const ownerAssignee = owner ? serviceLeadAssigneeToResponse(owner) : null;
        const team = getEditablePublicProfileTeamMembers(ownerUserId, vertical).map(teamMemberAssigneeToResponse);
        const items = ownerAssignee ? [ownerAssignee, ...team] : team;
        const seen = new Set<string>();
        return items.filter((item) => {
            if (seen.has(item.value)) return false;
            seen.add(item.value);
            return true;
        });
    }

    function serviceLeadToResponse(record: {
        id: string;
        userId: string | null;
        vertical: VerticalType;
        serviceType: ServiceLeadType;
        planId: ServiceLeadPlanId;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        contactWhatsapp: string | null;
        locationLabel: string | null;
        assetType: string | null;
        assetBrand: string | null;
        assetModel: string | null;
        assetYear: number | string | null;
        assetMileage: number | string | null;
        assetArea: number | string | null;
        expectedPrice: number | string | null;
        notes: string | null;
        status: ServiceLeadStatus;
        priority: LeadPriority;
        closeReason: string | null;
        tags: string[];
        assignedToUserId: string | null;
        nextTaskTitle: string | null;
        nextTaskAt: number | null;
        sourcePage: string | null;
        lastActivityAt: number;
        createdAt: number;
        updatedAt: number;
    }) {
        const assignedTo = record.assignedToUserId ? usersById.get(record.assignedToUserId) ?? null : null;
        const slaSignals = buildLeadSlaSignals({
            status: record.status,
            priority: record.priority,
            nextTaskAt: record.nextTaskAt,
            lastActivityAt: record.lastActivityAt,
        });
        const attentionLevel = getLeadAttentionLevel({
            status: record.status,
            priority: record.priority,
            nextTaskAt: record.nextTaskAt,
            lastActivityAt: record.lastActivityAt,
        });
        return {
            id: record.id,
            userId: record.userId,
            vertical: record.vertical,
            serviceType: record.serviceType,
            serviceLabel: serviceLeadServiceLabel(record.serviceType),
            planId: record.planId,
            contactName: record.contactName,
            contactEmail: record.contactEmail,
            contactPhone: record.contactPhone,
            contactWhatsapp: record.contactWhatsapp,
            locationLabel: record.locationLabel,
            assetType: record.assetType,
            assetBrand: record.assetBrand,
            assetModel: record.assetModel,
            assetYear: record.assetYear,
            assetMileage: record.assetMileage,
            assetArea: record.assetArea,
            expectedPrice: record.expectedPrice,
            notes: record.notes,
            status: record.status,
            statusLabel: serviceLeadStatusLabel(record.status),
            priority: record.priority,
            priorityLabel: leadPriorityLabel(record.priority),
            closeReason: record.closeReason,
            tags: record.tags,
            assignedToUserId: record.assignedToUserId,
            assignedToValue: assignedTo ? crmAssigneeValue({ kind: 'user', id: assignedTo.id }) : null,
            assignedTo: serviceLeadAssigneeToResponse(assignedTo),
            nextTaskTitle: record.nextTaskTitle,
            nextTaskAt: record.nextTaskAt,
            nextTaskAgo: record.nextTaskAt ? formatRelativeTimestamp(record.nextTaskAt) : null,
            sourcePage: record.sourcePage,
            lastActivityAt: record.lastActivityAt,
            lastActivityAgo: formatAgo(record.lastActivityAt),
            attentionLevel,
            attentionLabel: leadAttentionLabel(attentionLevel, slaSignals),
            slaSignals,
            createdAt: record.createdAt,
            createdAgo: formatAgo(record.createdAt),
            updatedAt: record.updatedAt,
        };
    }

    function serviceLeadActivityToResponse(record: ServiceLeadActivityRecord) {
        const actor = record.actorUserId ? usersById.get(record.actorUserId) ?? null : null;
        return {
            id: record.id,
            type: record.type,
            label: serviceLeadActivityLabel(record.type),
            body: record.body,
            meta: record.meta,
            createdAt: record.createdAt,
            createdAgo: formatAgo(record.createdAt),
            actor: actor ? {
                id: actor.id,
                name: actor.name,
                email: actor.email,
            } : null,
        };
    }

    function listingLeadActivityToResponse(record: { actorUserId: string | null; id: string; type: ListingLeadActivityType; body: string; meta: unknown; createdAt: number }) {
        const actor = record.actorUserId ? usersById.get(record.actorUserId) ?? null : null;
        return {
            id: record.id,
            type: record.type,
            label: listingLeadActivityLabel(record.type),
            body: record.body,
            meta: record.meta,
            createdAt: record.createdAt,
            createdAgo: formatAgo(record.createdAt),
            actor: actor ? {
                id: actor.id,
                name: actor.name,
                email: actor.email,
            } : null,
        };
    }

    return {
        serviceLeadAssigneeToResponse,
        teamMemberAssigneeToResponse,
        getLeadRoutingCandidates,
        listingLeadAssigneeToResponse,
        listListingLeadAssignees,
        serviceLeadToResponse,
        serviceLeadActivityToResponse,
        listingLeadActivityToResponse,
    };
}
