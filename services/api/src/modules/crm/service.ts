import { eq, and, or, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerticalType = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'verified' | 'suspended';
export type LeadPriority = 'low' | 'medium' | 'high';
export type LeadAttentionLevel = 'fresh' | 'attention' | 'urgent';
export type LeadSlaSignalKey = 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
export type LeadSlaSignal = { key: LeadSlaSignalKey; label: string; tone: Exclude<LeadAttentionLevel, 'fresh'> };
export type LeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
export type PipelineColumnScope = 'listing';
export type ServiceLeadType = 'venta_asistida' | 'gestion_inmobiliaria';
export type ServiceLeadPlanId = 'basico' | 'premium';
export type ServiceLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ServiceLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'contact';
export type ListingLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ListingLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'message' | 'contact';
export type ListingLeadSource = 'internal_form' | 'direct_message' | 'whatsapp' | 'phone_call' | 'email' | 'instagram' | 'facebook' | 'mercadolibre' | 'yapo' | 'chileautos' | 'portal';
export type ListingLeadChannel = 'lead' | 'message' | 'social' | 'portal';

export type AppUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    primaryVertical?: VerticalType | null;
    avatar?: string;
    primaryAccountId?: string | null;
};

export type PipelineColumnRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    scope: PipelineColumnScope;
    name: string;
    status: ListingLeadStatus;
    position: number;
    createdAt: number;
    updatedAt: number;
};

export type ServiceLeadRecord = {
    id: string;
    accountId?: string | null;
    userId: string | null;
    entityType: 'service';
    entityId: string;
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
    assetYear: number | null;
    assetMileage: number | null;
    assetArea: number | null;
    expectedPrice: number | null;
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
};

export type ServiceLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ServiceLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

export type ListingLeadRecord = {
    id: string;
    accountId?: string | null;
    listingId: string;
    entityType: 'listing';
    entityId: string;
    ownerUserId: string;
    buyerUserId: string | null;
    vertical: VerticalType;
    source: ListingLeadSource;
    channel: ListingLeadChannel;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    contactWhatsapp: string | null;
    message: string | null;
    status: ListingLeadStatus;
    priority: LeadPriority;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
    pipelineColumnId: string | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    sourcePage: string | null;
    externalSourceId: string | null;
    lastActivityAt: number;
    createdAt: number;
    updatedAt: number;
};

export type ListingLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ListingLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

export type CrmAssigneeResponse = {
    id: string;
    kind: 'user' | 'team_member';
    value: string;
    name: string;
    email: string | null;
    phone: string | null;
};

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const serviceLeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'closed']);
export const listingLeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'closed']);
const leadPrioritySchema = z.enum(['low', 'medium', 'high']);

export const serviceLeadUpdateSchema = z.object({
    status: serviceLeadStatusSchema.optional(),
    priority: leadPrioritySchema.optional(),
    closeReason: z.string().trim().max(255).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
    nextTaskTitle: z.string().trim().max(255).nullable().optional(),
    nextTaskAt: z.union([z.string().trim().min(1), z.null()]).optional(),
});

export const serviceLeadNoteSchema = z.object({
    body: z.string().trim().min(2).max(4000),
});

export const leadQuickActionSchema = z.object({
    action: z.enum(['call', 'whatsapp', 'email', 'follow_up']),
});

export const listingLeadUpdateSchema = z.object({
    status: listingLeadStatusSchema.optional(),
    priority: leadPrioritySchema.optional(),
    closeReason: z.string().trim().max(255).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
    assignedToTeamMemberId: z.string().uuid().nullable().optional(),
    pipelineColumnId: z.string().uuid().nullable().optional(),
    nextTaskTitle: z.string().trim().max(255).nullable().optional(),
    nextTaskAt: z.union([z.string().trim().min(1), z.null()]).optional(),
});

export const listingLeadNoteSchema = z.object({
    body: z.string().trim().min(2).max(4000),
});

export const pipelineColumnCreateSchema = z.object({
    name: z.string().trim().min(2).max(80),
    status: listingLeadStatusSchema,
});

export const pipelineColumnUpdateSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    status: listingLeadStatusSchema.optional(),
});

export const pipelineColumnReorderSchema = z.object({
    columnIds: z.array(z.string().uuid()).min(1),
});

// ─── Deps interface ───────────────────────────────────────────────────────────

export type CrmServiceDeps = {
    db: any;
    tables: {
        crmPipelineColumns: any;
        serviceLeads: any;
        serviceLeadActivities: any;
        listingLeads: any;
        listingLeadActivities: any;
        users: any;
    };
    eq: typeof eq;
    and: typeof and;
    or: typeof or;
    desc: typeof desc;
    asc: typeof asc;
    usersById: Map<string, AppUser>;
    listingsById: Map<string, any>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getEditablePublicProfileTeamMembers: (userId: string, vertical: any) => any[];
    isAdminRole: (role: any) => boolean;
    formatAgo: (ts: number) => string;
    formatRelativeTimestamp: (ts: number) => string;
    publicSectionLabel: (section: any) => string;
};

// ─── Pure label helpers ───────────────────────────────────────────────────────

export function serviceLeadStatusLabel(status: ServiceLeadStatus): string {
    if (status === 'contacted') return 'Contactado';
    if (status === 'qualified') return 'Calificado';
    if (status === 'closed') return 'Cerrado';
    return 'Nuevo';
}

export function listingLeadStatusLabel(status: ListingLeadStatus): string {
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

export function listingLeadActivityLabel(type: ListingLeadActivityType): string {
    if (type === 'assignment') return 'Asignacion';
    if (type === 'status') return 'Estado';
    if (type === 'task') return 'Proxima tarea';
    if (type === 'contact') return 'Contacto';
    if (type === 'note') return 'Nota interna';
    if (type === 'message') return 'Mensaje';
    return 'Creacion';
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

export function getLeadQuickActionLabel(action: LeadQuickAction): string {
    if (action === 'call') return 'Llamada';
    if (action === 'whatsapp') return 'WhatsApp';
    if (action === 'email') return 'Correo';
    return 'Seguimiento';
}

export function crmAssigneeValue(input: { kind: 'user' | 'team_member'; id: string }): string {
    return `${input.kind}:${input.id}`;
}

export function normalizeLeadTags(tags: string[] | undefined): string[] {
    if (!tags) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of tags) {
        const t = tag.trim().toLowerCase();
        if (t && !seen.has(t)) {
            seen.add(t);
            result.push(t);
        }
    }
    return result;
}

export function parseServiceLeadTaskAt(value: string | null | undefined): number | null {
    if (value == null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatServiceLeadTimestamp(timestamp: number): string {
    return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(timestamp));
}

export function buildLeadQuickFollowUpAt(now = Date.now()): number {
    const target = new Date(now);
    if (target.getHours() >= 18) {
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
    } else {
        const nextHour = target.getHours() + 2;
        target.setHours(nextHour, 0, 0, 0);
    }
    return target.getTime();
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function buildLeadSlaSignals(input: {
    status: ServiceLeadStatus | ListingLeadStatus;
    priority: LeadPriority;
    nextTaskAt: number | null;
    lastActivityAt: number;
}): LeadSlaSignal[] {
    if (input.status === 'closed') return [];
    const now = Date.now();
    const signals: LeadSlaSignal[] = [];

    const sinceLastActivity = now - input.lastActivityAt;
    const idleThresholdMs = input.priority === 'high' ? 24 * 60 * 60 * 1000 : 72 * 60 * 60 * 1000;

    if (input.status === 'new' && sinceLastActivity > 4 * 60 * 60 * 1000) {
        signals.push({ key: 'response_overdue', label: 'Sin respuesta inicial', tone: 'urgent' });
    }

    if (input.nextTaskAt) {
        const taskDate = new Date(input.nextTaskAt);
        const today = new Date(now);
        if (input.nextTaskAt < now) {
            signals.push({ key: 'task_overdue', label: 'Tarea vencida', tone: 'urgent' });
        } else if (isSameDay(taskDate, today)) {
            signals.push({ key: 'task_due_today', label: 'Tarea para hoy', tone: 'attention' });
        }
    }

    if (input.priority === 'high' && input.status !== 'new') {
        signals.push({ key: 'hot_lead', label: 'Lead caliente', tone: 'attention' });
    }

    if (!input.nextTaskAt && sinceLastActivity > idleThresholdMs && input.status !== 'new') {
        signals.push({ key: 'idle_follow_up', label: 'Sin actividad reciente', tone: 'attention' });
    }

    return signals.sort((a, b) => leadSignalSeverity(b) - leadSignalSeverity(a));
}

function leadSignalSeverity(signal: LeadSlaSignal): number {
    if (signal.tone === 'urgent') return 2;
    if (signal.tone === 'attention') return 1;
    return 0;
}

export function getLeadAttentionLevel(input: {
    status: ServiceLeadStatus | ListingLeadStatus;
    priority: LeadPriority;
    nextTaskAt: number | null;
    lastActivityAt: number;
}): LeadAttentionLevel {
    if (input.status === 'closed') return 'fresh';
    const signals = buildLeadSlaSignals(input);
    if (signals.some((s) => s.tone === 'urgent')) return 'urgent';
    if (signals.some((s) => s.tone === 'attention')) return 'attention';
    return 'fresh';
}

export function leadAttentionLabel(level: LeadAttentionLevel, signals: LeadSlaSignal[]): string | null {
    if (level === 'fresh') return null;
    return signals[0]?.label ?? null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

export function mapPipelineColumnRow(deps: CrmServiceDeps, column: any): PipelineColumnRecord {
    return {
        id: column.id,
        accountId: column.accountId ?? null,
        userId: column.userId,
        vertical: column.vertical as VerticalType,
        scope: column.scope as PipelineColumnScope,
        name: column.name,
        status: column.status as ListingLeadStatus,
        position: column.position,
        createdAt: column.createdAt.getTime(),
        updatedAt: column.updatedAt.getTime(),
    };
}

export function mapServiceLeadRow(deps: CrmServiceDeps, lead: any): ServiceLeadRecord {
    return {
        id: lead.id,
        accountId: lead.accountId ?? null,
        userId: lead.userId ?? null,
        entityType: 'service',
        entityId: lead.id,
        vertical: lead.vertical as VerticalType,
        serviceType: lead.serviceType as ServiceLeadType,
        planId: lead.planId as ServiceLeadPlanId,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        contactWhatsapp: lead.contactWhatsapp ?? null,
        locationLabel: lead.locationLabel ?? null,
        assetType: lead.assetType ?? null,
        assetBrand: lead.assetBrand ?? null,
        assetModel: lead.assetModel ?? null,
        assetYear: lead.assetYear ?? null,
        assetMileage: lead.assetMileage ?? null,
        assetArea: lead.assetArea ?? null,
        expectedPrice: lead.expectedPrice ?? null,
        notes: lead.notes ?? null,
        status: lead.status as ServiceLeadStatus,
        priority: lead.priority as LeadPriority,
        closeReason: lead.closeReason ?? null,
        tags: Array.isArray(lead.tags) ? lead.tags.filter((t: any): t is string => typeof t === 'string') : [],
        assignedToUserId: lead.assignedToUserId ?? null,
        nextTaskTitle: lead.nextTaskTitle ?? null,
        nextTaskAt: lead.nextTaskAt?.getTime() ?? null,
        sourcePage: lead.sourcePage ?? null,
        lastActivityAt: lead.lastActivityAt?.getTime() ?? lead.updatedAt.getTime(),
        createdAt: lead.createdAt.getTime(),
        updatedAt: lead.updatedAt.getTime(),
    };
}

export function mapServiceLeadActivityRow(deps: CrmServiceDeps, activity: any): ServiceLeadActivityRecord {
    return {
        id: activity.id,
        leadId: activity.leadId,
        actorUserId: activity.actorUserId ?? null,
        type: activity.type as ServiceLeadActivityType,
        body: activity.body,
        meta: (activity.meta as Record<string, unknown> | null) ?? null,
        createdAt: activity.createdAt.getTime(),
    };
}

export function mapListingLeadRow(deps: CrmServiceDeps, lead: any): ListingLeadRecord {
    return {
        id: lead.id,
        accountId: lead.accountId ?? null,
        listingId: lead.listingId,
        entityType: 'listing',
        entityId: lead.listingId,
        ownerUserId: lead.ownerUserId,
        buyerUserId: lead.buyerUserId ?? null,
        vertical: lead.vertical as VerticalType,
        source: lead.source as ListingLeadSource,
        channel: lead.channel as ListingLeadChannel,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone ?? null,
        contactWhatsapp: lead.contactWhatsapp ?? null,
        message: lead.message ?? null,
        status: lead.status as ListingLeadStatus,
        priority: lead.priority as LeadPriority,
        closeReason: lead.closeReason ?? null,
        tags: Array.isArray(lead.tags) ? lead.tags.filter((t: any): t is string => typeof t === 'string') : [],
        assignedToUserId: lead.assignedToUserId ?? null,
        assignedToTeamMemberId: lead.assignedToTeamMemberId ?? null,
        pipelineColumnId: lead.pipelineColumnId ?? null,
        nextTaskTitle: lead.nextTaskTitle ?? null,
        nextTaskAt: lead.nextTaskAt?.getTime() ?? null,
        sourcePage: lead.sourcePage ?? null,
        externalSourceId: lead.externalSourceId ?? null,
        lastActivityAt: lead.lastActivityAt?.getTime() ?? lead.updatedAt.getTime(),
        createdAt: lead.createdAt.getTime(),
        updatedAt: lead.updatedAt.getTime(),
    };
}

export function mapListingLeadActivityRow(deps: CrmServiceDeps, activity: any): ListingLeadActivityRecord {
    return {
        id: activity.id,
        leadId: activity.leadId,
        actorUserId: activity.actorUserId ?? null,
        type: activity.type as ListingLeadActivityType,
        body: activity.body,
        meta: (activity.meta as Record<string, unknown> | null) ?? null,
        createdAt: activity.createdAt.getTime(),
    };
}

// ─── Assignee helpers ─────────────────────────────────────────────────────────

export function serviceLeadAssigneeToResponse(user: AppUser | null | undefined): CrmAssigneeResponse | null {
    if (!user) return null;
    return {
        id: user.id,
        kind: 'user',
        value: crmAssigneeValue({ kind: 'user', id: user.id }),
        name: user.name,
        email: user.email ?? null,
        phone: user.phone ?? null,
    };
}

function teamMemberAssigneeToResponse(member: any): CrmAssigneeResponse {
    return {
        id: member.id,
        kind: 'team_member',
        value: crmAssigneeValue({ kind: 'team_member', id: member.id }),
        name: member.name,
        email: member.email,
        phone: member.whatsapp || member.phone,
    };
}

export function listingLeadAssigneeToResponse(deps: CrmServiceDeps, record: ListingLeadRecord): CrmAssigneeResponse | null {
    if (record.assignedToTeamMemberId) {
        const teamMember = deps.getEditablePublicProfileTeamMembers(record.ownerUserId, record.vertical)
            .find((m: any) => m.id === record.assignedToTeamMemberId) ?? null;
        if (teamMember) return teamMemberAssigneeToResponse(teamMember);
    }
    if (record.assignedToUserId) {
        return serviceLeadAssigneeToResponse(deps.usersById.get(record.assignedToUserId) ?? null);
    }
    return null;
}

export function listListingLeadAssignees(deps: CrmServiceDeps, ownerUserId: string, vertical: VerticalType): CrmAssigneeResponse[] {
    const owner = deps.usersById.get(ownerUserId) ?? null;
    const ownerAssignee = owner ? serviceLeadAssigneeToResponse(owner) : null;
    const team = deps.getEditablePublicProfileTeamMembers(ownerUserId, vertical).map(teamMemberAssigneeToResponse);
    const items = ownerAssignee ? [ownerAssignee, ...team] : team;
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
    });
}

// ─── Response builders ────────────────────────────────────────────────────────

export function pipelineColumnToResponse(column: PipelineColumnRecord) {
    return {
        id: column.id,
        accountId: column.accountId,
        userId: column.userId,
        vertical: column.vertical,
        scope: column.scope,
        name: column.name,
        status: column.status,
        statusLabel: listingLeadStatusLabel(column.status),
        position: column.position,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
    };
}

export function serviceLeadToResponse(deps: CrmServiceDeps, record: ServiceLeadRecord) {
    const assignedTo = record.assignedToUserId ? deps.usersById.get(record.assignedToUserId) ?? null : null;
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
        nextTaskAgo: record.nextTaskAt ? deps.formatRelativeTimestamp(record.nextTaskAt) : null,
        sourcePage: record.sourcePage,
        lastActivityAt: record.lastActivityAt,
        lastActivityAgo: deps.formatAgo(record.lastActivityAt),
        attentionLevel,
        attentionLabel: leadAttentionLabel(attentionLevel, slaSignals),
        slaSignals,
        createdAt: record.createdAt,
        createdAgo: deps.formatAgo(record.createdAt),
        updatedAt: record.updatedAt,
    };
}

export function serviceLeadActivityToResponse(deps: CrmServiceDeps, record: ServiceLeadActivityRecord) {
    const actor = record.actorUserId ? deps.usersById.get(record.actorUserId) ?? null : null;
    return {
        id: record.id,
        type: record.type,
        label: serviceLeadActivityLabel(record.type),
        body: record.body,
        meta: record.meta,
        createdAt: record.createdAt,
        createdAgo: deps.formatAgo(record.createdAt),
        actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : null,
    };
}

export function listingLeadToResponse(
    deps: CrmServiceDeps,
    record: ListingLeadRecord,
    options?: { threadId?: string | null; pipelineColumns?: PipelineColumnRecord[] },
) {
    const listing = deps.listingsById.get(record.listingId) ?? null;
    const owner = deps.usersById.get(record.ownerUserId) ?? null;
    const buyer = record.buyerUserId ? deps.usersById.get(record.buyerUserId) ?? null : null;
    const pipelineColumn = resolveListingLeadPipelineColumn(record, options?.pipelineColumns ?? []);
    const assignedTo = listingLeadAssigneeToResponse(deps, record);
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
        accountId: record.accountId,
        listingId: record.listingId,
        entityType: record.entityType,
        entityId: record.entityId,
        vertical: record.vertical,
        source: record.source,
        sourceLabel: listingLeadSourceLabel(record.source, record.vertical),
        channel: record.channel,
        channelLabel: listingLeadChannelLabel(record.channel),
        contactName: record.contactName,
        contactEmail: record.contactEmail,
        contactPhone: record.contactPhone,
        contactWhatsapp: record.contactWhatsapp,
        message: record.message,
        status: record.status,
        statusLabel: listingLeadStatusLabel(record.status),
        priority: record.priority,
        priorityLabel: leadPriorityLabel(record.priority),
        closeReason: record.closeReason,
        tags: record.tags,
        assignedToUserId: record.assignedToUserId,
        assignedToTeamMemberId: record.assignedToTeamMemberId,
        assignedToValue: assignedTo?.value ?? null,
        assignedTo,
        pipelineColumnId: pipelineColumn?.id ?? record.pipelineColumnId ?? null,
        pipelineColumnName: pipelineColumn?.name ?? null,
        nextTaskTitle: record.nextTaskTitle,
        nextTaskAt: record.nextTaskAt,
        nextTaskAgo: record.nextTaskAt ? deps.formatRelativeTimestamp(record.nextTaskAt) : null,
        sourcePage: record.sourcePage,
        externalSourceId: record.externalSourceId,
        lastActivityAt: record.lastActivityAt,
        lastActivityAgo: deps.formatAgo(record.lastActivityAt),
        attentionLevel,
        attentionLabel: leadAttentionLabel(attentionLevel, slaSignals),
        slaSignals,
        createdAt: record.createdAt,
        createdAgo: deps.formatAgo(record.createdAt),
        updatedAt: record.updatedAt,
        listing: listing ? {
            id: listing.id,
            title: listing.title,
            href: listing.href,
            section: listing.section,
            sectionLabel: deps.publicSectionLabel(listing.section),
            price: listing.price,
            location: listing.location ?? '',
        } : null,
        owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
        buyer: buyer ? { id: buyer.id, name: buyer.name, email: buyer.email } : null,
        threadId: options?.threadId ?? null,
    };
}

export function listingLeadActivityToResponse(deps: CrmServiceDeps, record: ListingLeadActivityRecord) {
    const actor = record.actorUserId ? deps.usersById.get(record.actorUserId) ?? null : null;
    return {
        id: record.id,
        type: record.type,
        label: listingLeadActivityLabel(record.type),
        body: record.body,
        meta: record.meta,
        createdAt: record.createdAt,
        createdAgo: deps.formatAgo(record.createdAt),
        actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : null,
    };
}

// ─── Pipeline helpers ─────────────────────────────────────────────────────────

export const DEFAULT_LISTING_PIPELINE_COLUMNS: Array<{ name: string; status: ListingLeadStatus }> = [
    { name: 'Nuevos', status: 'new' },
    { name: 'Contactados', status: 'contacted' },
    { name: 'Calificados', status: 'qualified' },
    { name: 'Cerrados', status: 'closed' },
];

export function resolveListingLeadPipelineColumn(lead: ListingLeadRecord, columns: PipelineColumnRecord[]): PipelineColumnRecord | null {
    if (columns.length === 0) return null;
    const explicit = lead.pipelineColumnId ? columns.find((c) => c.id === lead.pipelineColumnId) ?? null : null;
    if (explicit) return explicit;
    return columns.find((c) => c.status === lead.status) ?? columns[0] ?? null;
}

// ─── DB queries ───────────────────────────────────────────────────────────────

export async function listPipelineColumns(
    deps: CrmServiceDeps,
    userId: string,
    vertical: VerticalType,
    scope: PipelineColumnScope = 'listing',
): Promise<PipelineColumnRecord[]> {
    const rows = await deps.db
        .select()
        .from(deps.tables.crmPipelineColumns)
        .where(deps.and(
            deps.eq(deps.tables.crmPipelineColumns.userId, userId),
            deps.eq(deps.tables.crmPipelineColumns.vertical, vertical),
            deps.eq(deps.tables.crmPipelineColumns.scope, scope),
        ))
        .orderBy(deps.asc(deps.tables.crmPipelineColumns.position), deps.asc(deps.tables.crmPipelineColumns.createdAt));
    return rows.map((row: any) => mapPipelineColumnRow(deps, row));
}

export async function ensureListingPipelineColumns(
    deps: CrmServiceDeps,
    userId: string,
    vertical: VerticalType,
): Promise<PipelineColumnRecord[]> {
    const existing = await listPipelineColumns(deps, userId, vertical, 'listing');
    if (existing.length > 0) return existing;

    const accountId = await deps.getPrimaryAccountIdForUser(userId);
    const rows = await deps.db.insert(deps.tables.crmPipelineColumns).values(
        DEFAULT_LISTING_PIPELINE_COLUMNS.map((col, index) => ({
            accountId,
            userId,
            vertical,
            scope: 'listing',
            name: col.name,
            status: col.status,
            position: index,
        }))
    ).returning();

    return rows.map((row: any) => mapPipelineColumnRow(deps, row)).sort((a: PipelineColumnRecord, b: PipelineColumnRecord) => a.position - b.position);
}

export async function getListingPipelineColumnById(
    deps: CrmServiceDeps,
    id: string,
): Promise<PipelineColumnRecord | null> {
    const rows = await deps.db
        .select()
        .from(deps.tables.crmPipelineColumns)
        .where(deps.eq(deps.tables.crmPipelineColumns.id, id))
        .limit(1);
    if (rows.length === 0) return null;
    return mapPipelineColumnRow(deps, rows[0]);
}

export async function reorderPipelineColumns(
    deps: CrmServiceDeps,
    userId: string,
    vertical: VerticalType,
    columnIds: string[],
) {
    const columns = await ensureListingPipelineColumns(deps, userId, vertical);
    if (columns.length !== columnIds.length) {
        return { ok: false as const, error: 'El orden de columnas es inválido.' };
    }
    const knownIds = new Set(columns.map((c) => c.id));
    if (columnIds.some((id) => !knownIds.has(id))) {
        return { ok: false as const, error: 'El orden de columnas es inválido.' };
    }
    for (let i = 0; i < columnIds.length; i++) {
        await deps.db.update(deps.tables.crmPipelineColumns).set({
            position: i,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.crmPipelineColumns.id, columnIds[i]!));
    }
    return {
        ok: true as const,
        items: await listPipelineColumns(deps, userId, vertical, 'listing'),
    };
}

export async function listServiceLeadRecords(
    deps: CrmServiceDeps,
    options: { vertical?: VerticalType; status?: ServiceLeadStatus; limit?: number } = {},
): Promise<ServiceLeadRecord[]> {
    const conditions: any[] = [];
    if (options.vertical) conditions.push(deps.eq(deps.tables.serviceLeads.vertical, options.vertical));
    if (options.status) conditions.push(deps.eq(deps.tables.serviceLeads.status, options.status));

    let query = deps.db.select().from(deps.tables.serviceLeads).$dynamic();
    if (conditions.length === 1) query = query.where(conditions[0]);
    else if (conditions.length > 1) query = query.where(deps.and(...conditions));
    query = query.orderBy(deps.desc(deps.tables.serviceLeads.createdAt));
    if (options.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map((row: any) => mapServiceLeadRow(deps, row));
}

export async function getServiceLeadById(deps: CrmServiceDeps, id: string): Promise<ServiceLeadRecord | null> {
    const rows = await deps.db
        .select()
        .from(deps.tables.serviceLeads)
        .where(deps.eq(deps.tables.serviceLeads.id, id))
        .limit(1);
    if (rows.length === 0) return null;
    return mapServiceLeadRow(deps, rows[0]);
}

export async function listServiceLeadActivities(deps: CrmServiceDeps, leadId: string): Promise<ServiceLeadActivityRecord[]> {
    const rows = await deps.db
        .select()
        .from(deps.tables.serviceLeadActivities)
        .where(deps.eq(deps.tables.serviceLeadActivities.leadId, leadId))
        .orderBy(deps.desc(deps.tables.serviceLeadActivities.createdAt));
    return rows.map((row: any) => mapServiceLeadActivityRow(deps, row));
}

export async function createServiceLeadActivity(
    deps: CrmServiceDeps,
    input: { leadId: string; actorUserId?: string | null; type: ServiceLeadActivityType; body: string; meta?: Record<string, unknown> | null; createdAt?: number },
): Promise<ServiceLeadActivityRecord> {
    const activityTime = new Date(input.createdAt ?? Date.now());
    const rows = await deps.db.insert(deps.tables.serviceLeadActivities).values({
        leadId: input.leadId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        body: input.body,
        meta: input.meta ?? null,
        createdAt: activityTime,
    }).returning();
    await deps.db.update(deps.tables.serviceLeads).set({
        lastActivityAt: activityTime,
        updatedAt: activityTime,
    }).where(deps.eq(deps.tables.serviceLeads.id, input.leadId));
    return mapServiceLeadActivityRow(deps, rows[0]);
}

export async function listCrmAssignableUsers(deps: CrmServiceDeps) {
    const rows = await deps.db
        .select({
            id: deps.tables.users.id,
            name: deps.tables.users.name,
            email: deps.tables.users.email,
            role: deps.tables.users.role,
        })
        .from(deps.tables.users)
        .where(deps.or(deps.eq(deps.tables.users.role, 'admin'), deps.eq(deps.tables.users.role, 'superadmin')))
        .orderBy(deps.asc(deps.tables.users.name));
    return rows.map((row: any) => ({ id: row.id, name: row.name, email: row.email, role: row.role }));
}

export async function buildServiceLeadDetailPayload(deps: CrmServiceDeps, record: ServiceLeadRecord) {
    const [activities, assignees] = await Promise.all([
        listServiceLeadActivities(deps, record.id),
        listCrmAssignableUsers(deps),
    ]);
    return {
        item: serviceLeadToResponse(deps, record),
        activities: activities.map((a) => serviceLeadActivityToResponse(deps, a)),
        assignees,
    };
}

export async function updateServiceLeadRecord(
    deps: CrmServiceDeps,
    input: { actor: AppUser; lead: ServiceLeadRecord; changes: z.infer<typeof serviceLeadUpdateSchema> },
) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const activities: Array<{ type: ServiceLeadActivityType; body: string; meta?: Record<string, unknown> | null }> = [];

    if (input.changes.status && input.changes.status !== input.lead.status) {
        updates.status = input.changes.status;
        activities.push({
            type: 'status',
            body: `Estado cambiado de ${serviceLeadStatusLabel(input.lead.status)} a ${serviceLeadStatusLabel(input.changes.status)}.`,
            meta: { from: input.lead.status, to: input.changes.status },
        });
    }

    if (input.changes.priority && input.changes.priority !== input.lead.priority) {
        updates.priority = input.changes.priority;
        activities.push({
            type: 'note',
            body: `Prioridad cambiada de ${leadPriorityLabel(input.lead.priority)} a ${leadPriorityLabel(input.changes.priority)}.`,
            meta: { kind: 'priority', from: input.lead.priority, to: input.changes.priority },
        });
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'closeReason')) {
        const closeReason = input.changes.closeReason?.trim() || null;
        if (closeReason !== input.lead.closeReason) {
            updates.closeReason = closeReason;
            activities.push({
                type: 'note',
                body: closeReason ? `Motivo de cierre actualizado: ${closeReason}.` : 'Motivo de cierre eliminado.',
                meta: { kind: 'close_reason', value: closeReason },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'tags')) {
        const nextTags = normalizeLeadTags(input.changes.tags);
        if (JSON.stringify(nextTags) !== JSON.stringify(input.lead.tags)) {
            updates.tags = nextTags;
            activities.push({
                type: 'note',
                body: nextTags.length > 0 ? `Etiquetas actualizadas: ${nextTags.join(', ')}.` : 'Etiquetas eliminadas.',
                meta: { kind: 'tags', value: nextTags },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'assignedToUserId')) {
        const nextAssignedId: string | null = input.changes.assignedToUserId ?? null;
        if (nextAssignedId) {
            const nextAssignedUser = deps.usersById.get(nextAssignedId);
            if (!nextAssignedUser || !deps.isAdminRole(nextAssignedUser.role)) {
                return { ok: false as const, error: 'El usuario asignado no es válido.' };
            }
        }
        if (nextAssignedId !== input.lead.assignedToUserId) {
            updates.assignedToUserId = nextAssignedId;
            const previous = input.lead.assignedToUserId ? deps.usersById.get(input.lead.assignedToUserId) ?? null : null;
            const next = nextAssignedId ? deps.usersById.get(nextAssignedId) ?? null : null;
            const body = next
                ? previous ? `Lead reasignado de ${previous.name} a ${next.name}.` : `Lead asignado a ${next.name}.`
                : 'Asignación eliminada.';
            activities.push({ type: 'assignment', body, meta: { from: previous?.id ?? null, to: next?.id ?? null } });
        }
    }

    const hasNextTaskChange =
        Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
        || Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt');

    if (hasNextTaskChange) {
        const nextTaskTitle = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
            ? input.changes.nextTaskTitle?.trim() || null
            : input.lead.nextTaskTitle;
        const nextTaskAt = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt')
            ? parseServiceLeadTaskAt(input.changes.nextTaskAt ?? null)
            : input.lead.nextTaskAt;

        if (Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt') && input.changes.nextTaskAt && nextTaskAt == null) {
            return { ok: false as const, error: 'La fecha de la próxima tarea no es válida.' };
        }

        const changed = nextTaskTitle !== input.lead.nextTaskTitle || nextTaskAt !== input.lead.nextTaskAt;
        if (changed) {
            updates.nextTaskTitle = nextTaskTitle;
            updates.nextTaskAt = nextTaskAt != null ? new Date(nextTaskAt) : null;
            activities.push({
                type: 'task',
                body: nextTaskTitle || nextTaskAt
                    ? `Próxima tarea actualizada${nextTaskTitle ? `: ${nextTaskTitle}` : ''}${nextTaskAt ? ` · ${formatServiceLeadTimestamp(nextTaskAt)}` : ''}.`
                    : 'Próxima tarea eliminada.',
                meta: { title: nextTaskTitle, at: nextTaskAt },
            });
        }
    }

    if (activities.length === 0) return { ok: true as const, item: input.lead };

    const rows = await deps.db.update(deps.tables.serviceLeads).set(updates).where(deps.eq(deps.tables.serviceLeads.id, input.lead.id)).returning();
    const updated = mapServiceLeadRow(deps, rows[0]);

    for (const activity of activities) {
        await createServiceLeadActivity(deps, {
            leadId: updated.id,
            actorUserId: input.actor.id,
            type: activity.type,
            body: activity.body,
            meta: activity.meta ?? null,
        });
    }

    return { ok: true as const, item: updated };
}

export async function runServiceLeadQuickAction(
    deps: CrmServiceDeps,
    input: { actor: AppUser; lead: ServiceLeadRecord; action: LeadQuickAction },
) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let activityType: ServiceLeadActivityType = 'contact';
    let activityBody = '';
    const meta: Record<string, unknown> = { action: input.action };

    if (input.action === 'call') {
        if (!input.lead.contactPhone?.trim()) return { ok: false as const, error: 'Este lead no tiene teléfono disponible.' };
        activityBody = 'Llamada iniciada desde el CRM.';
        meta.target = input.lead.contactPhone.trim();
    } else if (input.action === 'whatsapp') {
        const target = input.lead.contactWhatsapp?.trim() || input.lead.contactPhone?.trim() || null;
        if (!target) return { ok: false as const, error: 'Este lead no tiene WhatsApp disponible.' };
        activityBody = 'WhatsApp iniciado desde el CRM.';
        meta.target = target;
    } else if (input.action === 'email') {
        if (!input.lead.contactEmail?.trim()) return { ok: false as const, error: 'Este lead no tiene correo disponible.' };
        activityBody = 'Correo iniciado desde el CRM.';
        meta.target = input.lead.contactEmail.trim();
    } else {
        activityType = 'task';
        const nextTaskAt = buildLeadQuickFollowUpAt();
        const nextTaskTitle = input.lead.nextTaskTitle?.trim() || 'Seguimiento comercial';
        updates.nextTaskTitle = nextTaskTitle;
        updates.nextTaskAt = new Date(nextTaskAt);
        activityBody = `Seguimiento rápido programado: ${nextTaskTitle} · ${formatServiceLeadTimestamp(nextTaskAt)}.`;
        meta.title = nextTaskTitle;
        meta.at = nextTaskAt;
    }

    if (input.action !== 'follow_up' && input.lead.status === 'new') {
        updates.status = 'contacted';
        meta.status = 'contacted';
        activityBody += ' Lead movido a Contactado.';
    }

    await deps.db.update(deps.tables.serviceLeads).set(updates).where(deps.eq(deps.tables.serviceLeads.id, input.lead.id));
    const activity = await createServiceLeadActivity(deps, {
        leadId: input.lead.id,
        actorUserId: input.actor.id,
        type: activityType,
        body: activityBody,
        meta,
    });
    const refreshed = await getServiceLeadById(deps, input.lead.id);
    if (!refreshed) return { ok: false as const, error: 'No pudimos recargar el lead.' };
    return { ok: true as const, item: refreshed, activity };
}

export async function listListingLeadRecords(
    deps: CrmServiceDeps,
    options: { vertical?: VerticalType; ownerUserId?: string; status?: ListingLeadStatus; limit?: number } = {},
): Promise<ListingLeadRecord[]> {
    const conditions: any[] = [];
    if (options.vertical) conditions.push(deps.eq(deps.tables.listingLeads.vertical, options.vertical));
    if (options.ownerUserId) conditions.push(deps.eq(deps.tables.listingLeads.ownerUserId, options.ownerUserId));
    if (options.status) conditions.push(deps.eq(deps.tables.listingLeads.status, options.status));

    let query = deps.db.select().from(deps.tables.listingLeads).$dynamic();
    if (conditions.length === 1) query = query.where(conditions[0]);
    else if (conditions.length > 1) query = query.where(deps.and(...conditions));
    query = query.orderBy(deps.desc(deps.tables.listingLeads.createdAt));
    if (options.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map((row: any) => mapListingLeadRow(deps, row));
}

export async function getListingLeadById(deps: CrmServiceDeps, id: string): Promise<ListingLeadRecord | null> {
    const rows = await deps.db
        .select()
        .from(deps.tables.listingLeads)
        .where(deps.eq(deps.tables.listingLeads.id, id))
        .limit(1);
    if (rows.length === 0) return null;
    return mapListingLeadRow(deps, rows[0]);
}

export async function listListingLeadActivities(deps: CrmServiceDeps, leadId: string): Promise<ListingLeadActivityRecord[]> {
    const rows = await deps.db
        .select()
        .from(deps.tables.listingLeadActivities)
        .where(deps.eq(deps.tables.listingLeadActivities.leadId, leadId))
        .orderBy(deps.desc(deps.tables.listingLeadActivities.createdAt));
    return rows.map((row: any) => mapListingLeadActivityRow(deps, row));
}

export async function createListingLeadActivity(
    deps: CrmServiceDeps,
    input: { leadId: string; actorUserId?: string | null; type: ListingLeadActivityType; body: string; meta?: Record<string, unknown> | null; createdAt?: number },
): Promise<ListingLeadActivityRecord> {
    const activityTime = new Date(input.createdAt ?? Date.now());
    const rows = await deps.db.insert(deps.tables.listingLeadActivities).values({
        leadId: input.leadId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        body: input.body,
        meta: input.meta ?? null,
        createdAt: activityTime,
    }).returning();
    await deps.db.update(deps.tables.listingLeads).set({
        lastActivityAt: activityTime,
        updatedAt: activityTime,
    }).where(deps.eq(deps.tables.listingLeads.id, input.leadId));
    return mapListingLeadActivityRow(deps, rows[0]);
}

export async function buildListingLeadDetailPayload(
    deps: CrmServiceDeps,
    record: ListingLeadRecord,
    viewerUserId?: string | null,
) {
    const pipelineColumns = await ensureListingPipelineColumns(deps, record.ownerUserId, record.vertical);
    const [activities, assignees] = await Promise.all([
        listListingLeadActivities(deps, record.id),
        Promise.resolve(listListingLeadAssignees(deps, record.ownerUserId, record.vertical)),
    ]);

    return {
        item: listingLeadToResponse(deps, record, { pipelineColumns }),
        activities: activities.map((a) => listingLeadActivityToResponse(deps, a)),
        assignees,
        thread: null,
    };
}

export function canUserAccessListingLead(user: AppUser, lead: ListingLeadRecord): boolean {
    if (user.role === 'superadmin') return true;
    return lead.ownerUserId === user.id;
}

export async function updateListingLeadRecord(
    deps: CrmServiceDeps,
    input: { actor: AppUser; lead: ListingLeadRecord; changes: z.infer<typeof listingLeadUpdateSchema> },
) {
    const pipelineColumns = await ensureListingPipelineColumns(deps, input.lead.ownerUserId, input.lead.vertical);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const activities: Array<{ type: ListingLeadActivityType; body: string; meta?: Record<string, unknown> | null }> = [];

    const hasPipelineColumnChange = Object.prototype.hasOwnProperty.call(input.changes, 'pipelineColumnId');
    let nextPipelineColumn = resolveListingLeadPipelineColumn(input.lead, pipelineColumns);

    if (hasPipelineColumnChange) {
        const nextPipelineColumnId = input.changes.pipelineColumnId ?? null;
        if (nextPipelineColumnId) {
            nextPipelineColumn = pipelineColumns.find((c) => c.id === nextPipelineColumnId) ?? null;
            if (!nextPipelineColumn) return { ok: false as const, error: 'La columna del pipeline no es válida.' };
        } else {
            nextPipelineColumn = pipelineColumns.find((c) => c.status === input.lead.status) ?? pipelineColumns[0] ?? null;
        }
    } else if (input.changes.status) {
        nextPipelineColumn = pipelineColumns.find((c) => c.status === input.changes.status) ?? pipelineColumns[0] ?? null;
    }

    if (nextPipelineColumn && nextPipelineColumn.id !== (input.lead.pipelineColumnId ?? null)) {
        updates.pipelineColumnId = nextPipelineColumn.id;
        activities.push({
            type: 'status',
            body: `Lead movido a ${nextPipelineColumn.name}.`,
            meta: { kind: 'pipeline_column', from: input.lead.pipelineColumnId, to: nextPipelineColumn.id, status: nextPipelineColumn.status },
        });
    }

    const nextStatus = input.changes.status ?? nextPipelineColumn?.status ?? input.lead.status;
    if (nextStatus !== input.lead.status) {
        updates.status = nextStatus;
        activities.push({
            type: 'status',
            body: `Estado cambiado de ${listingLeadStatusLabel(input.lead.status)} a ${listingLeadStatusLabel(nextStatus)}.`,
            meta: { from: input.lead.status, to: nextStatus },
        });
    }

    if (input.changes.priority && input.changes.priority !== input.lead.priority) {
        updates.priority = input.changes.priority;
        activities.push({
            type: 'note',
            body: `Prioridad cambiada de ${leadPriorityLabel(input.lead.priority)} a ${leadPriorityLabel(input.changes.priority)}.`,
            meta: { kind: 'priority', from: input.lead.priority, to: input.changes.priority },
        });
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'closeReason')) {
        const closeReason = input.changes.closeReason?.trim() || null;
        if (closeReason !== input.lead.closeReason) {
            updates.closeReason = closeReason;
            activities.push({
                type: 'note',
                body: closeReason ? `Motivo de cierre actualizado: ${closeReason}.` : 'Motivo de cierre eliminado.',
                meta: { kind: 'close_reason', value: closeReason },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'tags')) {
        const nextTags = normalizeLeadTags(input.changes.tags);
        if (JSON.stringify(nextTags) !== JSON.stringify(input.lead.tags)) {
            updates.tags = nextTags;
            activities.push({
                type: 'note',
                body: nextTags.length > 0 ? `Etiquetas actualizadas: ${nextTags.join(', ')}.` : 'Etiquetas eliminadas.',
                meta: { kind: 'tags', value: nextTags },
            });
        }
    }

    const hasAssignedUserChange = Object.prototype.hasOwnProperty.call(input.changes, 'assignedToUserId');
    const hasAssignedTeamMemberChange = Object.prototype.hasOwnProperty.call(input.changes, 'assignedToTeamMemberId');

    if (hasAssignedUserChange || hasAssignedTeamMemberChange) {
        const nextAssignedUserId = hasAssignedUserChange ? input.changes.assignedToUserId ?? null : input.lead.assignedToUserId;
        const nextAssignedTeamMemberId = hasAssignedTeamMemberChange ? input.changes.assignedToTeamMemberId ?? null : input.lead.assignedToTeamMemberId;

        if (nextAssignedUserId && nextAssignedTeamMemberId) {
            return { ok: false as const, error: 'El lead no puede quedar asignado a una cuenta y a un asesor al mismo tiempo.' };
        }

        const validAssignees = listListingLeadAssignees(deps, input.lead.ownerUserId, input.lead.vertical);

        if (nextAssignedUserId) {
            const expectedValue = crmAssigneeValue({ kind: 'user', id: nextAssignedUserId });
            const matched = validAssignees.find((item) => item.value === expectedValue) ?? null;
            if (!matched || matched.kind !== 'user') return { ok: false as const, error: 'La cuenta asignada no es válida para este lead.' };
        }

        if (nextAssignedTeamMemberId) {
            const expectedValue = crmAssigneeValue({ kind: 'team_member', id: nextAssignedTeamMemberId });
            const matched = validAssignees.find((item) => item.value === expectedValue) ?? null;
            if (!matched || matched.kind !== 'team_member') return { ok: false as const, error: 'El asesor asignado no es válido para este lead.' };
        }

        if (nextAssignedUserId !== input.lead.assignedToUserId || nextAssignedTeamMemberId !== input.lead.assignedToTeamMemberId) {
            updates.assignedToUserId = nextAssignedUserId;
            updates.assignedToTeamMemberId = nextAssignedTeamMemberId;

            const previous = listingLeadAssigneeToResponse(deps, input.lead);
            const next = nextAssignedTeamMemberId
                ? validAssignees.find((item) => item.value === crmAssigneeValue({ kind: 'team_member', id: nextAssignedTeamMemberId })) ?? null
                : nextAssignedUserId
                    ? validAssignees.find((item) => item.value === crmAssigneeValue({ kind: 'user', id: nextAssignedUserId })) ?? null
                    : null;

            const body = next
                ? previous ? `Lead reasignado de ${previous.name} a ${next.name}.` : `Lead asignado a ${next.name}.`
                : 'Asignación eliminada.';

            activities.push({
                type: 'assignment',
                body,
                meta: { from: previous?.value ?? null, to: next?.value ?? null, fromKind: previous?.kind ?? null, toKind: next?.kind ?? null },
            });
        }
    }

    const hasNextTaskChange =
        Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
        || Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt');

    if (hasNextTaskChange) {
        const nextTaskTitle = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
            ? input.changes.nextTaskTitle?.trim() || null
            : input.lead.nextTaskTitle;
        const nextTaskAt = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt')
            ? parseServiceLeadTaskAt(input.changes.nextTaskAt ?? null)
            : input.lead.nextTaskAt;

        if (Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt') && input.changes.nextTaskAt && nextTaskAt == null) {
            return { ok: false as const, error: 'La fecha de la próxima tarea no es válida.' };
        }

        const changed = nextTaskTitle !== input.lead.nextTaskTitle || nextTaskAt !== input.lead.nextTaskAt;
        if (changed) {
            updates.nextTaskTitle = nextTaskTitle;
            updates.nextTaskAt = nextTaskAt != null ? new Date(nextTaskAt) : null;
            activities.push({
                type: 'task',
                body: nextTaskTitle || nextTaskAt
                    ? `Próxima tarea actualizada${nextTaskTitle ? `: ${nextTaskTitle}` : ''}${nextTaskAt ? ` · ${formatServiceLeadTimestamp(nextTaskAt)}` : ''}.`
                    : 'Próxima tarea eliminada.',
                meta: { title: nextTaskTitle, at: nextTaskAt },
            });
        }
    }

    if (activities.length === 0) return { ok: true as const, item: input.lead };

    const rows = await deps.db.update(deps.tables.listingLeads).set(updates).where(deps.eq(deps.tables.listingLeads.id, input.lead.id)).returning();
    const updated = mapListingLeadRow(deps, rows[0]);

    for (const activity of activities) {
        await createListingLeadActivity(deps, {
            leadId: updated.id,
            actorUserId: input.actor.id,
            type: activity.type,
            body: activity.body,
            meta: activity.meta ?? null,
        });
    }

    return { ok: true as const, item: updated };
}

export async function runListingLeadQuickAction(
    deps: CrmServiceDeps,
    input: { actor: AppUser; lead: ListingLeadRecord; action: LeadQuickAction },
) {
    const pipelineColumns = await ensureListingPipelineColumns(deps, input.lead.ownerUserId, input.lead.vertical);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let activityType: ListingLeadActivityType = 'contact';
    let activityBody = '';
    const meta: Record<string, unknown> = { action: input.action };

    if (input.action === 'call') {
        if (!input.lead.contactPhone?.trim()) return { ok: false as const, error: 'Este lead no tiene teléfono disponible.' };
        activityBody = 'Llamada iniciada desde el CRM.';
        meta.target = input.lead.contactPhone.trim();
    } else if (input.action === 'whatsapp') {
        const target = input.lead.contactWhatsapp?.trim() || input.lead.contactPhone?.trim() || null;
        if (!target) return { ok: false as const, error: 'Este lead no tiene WhatsApp disponible.' };
        activityBody = 'WhatsApp iniciado desde el CRM.';
        meta.target = target;
    } else if (input.action === 'email') {
        if (!input.lead.contactEmail?.trim()) return { ok: false as const, error: 'Este lead no tiene correo disponible.' };
        activityBody = 'Correo iniciado desde el CRM.';
        meta.target = input.lead.contactEmail.trim();
    } else {
        activityType = 'task';
        const nextTaskAt = buildLeadQuickFollowUpAt();
        const nextTaskTitle = input.lead.nextTaskTitle?.trim() || 'Seguimiento comercial';
        updates.nextTaskTitle = nextTaskTitle;
        updates.nextTaskAt = new Date(nextTaskAt);
        activityBody = `Seguimiento rápido programado: ${nextTaskTitle} · ${formatServiceLeadTimestamp(nextTaskAt)}.`;
        meta.title = nextTaskTitle;
        meta.at = nextTaskAt;
    }

    if (input.action !== 'follow_up' && input.lead.status === 'new') {
        updates.status = 'contacted';
        const nextColumn = pipelineColumns.find((c) => c.status === 'contacted') ?? null;
        if (nextColumn) updates.pipelineColumnId = nextColumn.id;
        meta.status = 'contacted';
        activityBody += ' Lead movido a Contactado.';
    }

    await deps.db.update(deps.tables.listingLeads).set(updates).where(deps.eq(deps.tables.listingLeads.id, input.lead.id));
    const activity = await createListingLeadActivity(deps, {
        leadId: input.lead.id,
        actorUserId: input.actor.id,
        type: activityType,
        body: activityBody,
        meta,
    });
    const refreshed = await getListingLeadById(deps, input.lead.id);
    if (!refreshed) return { ok: false as const, error: 'No pudimos recargar el lead.' };
    return { ok: true as const, item: refreshed, activity };
}
