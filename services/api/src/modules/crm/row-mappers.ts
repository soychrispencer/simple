import {
    crmPipelineColumns,
    listingLeadActivities,
    listingLeads,
    messageEntries,
    messageThreads,
    serviceLeadActivities,
    serviceLeads,
} from '../../db/schema.js';
import type {
    ListingLeadActivityType,
    ListingLeadChannel,
    ListingLeadSource,
    ListingLeadStatus,
    LeadPriority,
    PipelineColumnScope,
    ServiceLeadActivityType,
    ServiceLeadPlanId,
    ServiceLeadStatus,
    ServiceLeadType,
    VerticalType,
} from './service.js';

export type MessageSenderRole = 'buyer' | 'seller' | 'system';

export type MessageThreadRecord = {
    id: string;
    accountId?: string | null;
    vertical: VerticalType;
    listingId: string;
    ownerUserId: string;
    buyerUserId: string;
    leadId: string;
    ownerUnreadCount: number;
    buyerUnreadCount: number;
    ownerArchivedAt: number | null;
    buyerArchivedAt: number | null;
    ownerSpamAt: number | null;
    buyerSpamAt: number | null;
    lastMessageAt: number;
    createdAt: number;
    updatedAt: number;
};

export type MessageEntryRecord = {
    id: string;
    threadId: string;
    senderUserId: string;
    senderRole: MessageSenderRole;
    body: string;
    createdAt: number;
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
    assetYear: string | null;
    assetMileage: string | null;
    assetArea: string | null;
    expectedPrice: string | null;
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

export function mapPipelineColumnRow(column: typeof crmPipelineColumns.$inferSelect): PipelineColumnRecord {
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

export function mapServiceLeadRow(lead: typeof serviceLeads.$inferSelect): ServiceLeadRecord {
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
        tags: Array.isArray(lead.tags) ? lead.tags.filter((item): item is string => typeof item === 'string') : [],
        assignedToUserId: lead.assignedToUserId ?? null,
        nextTaskTitle: lead.nextTaskTitle ?? null,
        nextTaskAt: lead.nextTaskAt?.getTime() ?? null,
        sourcePage: lead.sourcePage ?? null,
        lastActivityAt: lead.lastActivityAt?.getTime() ?? lead.updatedAt.getTime(),
        createdAt: lead.createdAt.getTime(),
        updatedAt: lead.updatedAt.getTime(),
    };
}

export function mapServiceLeadActivityRow(activity: typeof serviceLeadActivities.$inferSelect): ServiceLeadActivityRecord {
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

export function mapListingLeadRow(lead: typeof listingLeads.$inferSelect): ListingLeadRecord {
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
        tags: Array.isArray(lead.tags) ? lead.tags.filter((item): item is string => typeof item === 'string') : [],
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

export function mapListingLeadActivityRow(activity: typeof listingLeadActivities.$inferSelect): ListingLeadActivityRecord {
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

export function mapMessageThreadRow(thread: typeof messageThreads.$inferSelect): MessageThreadRecord {
    return {
        id: thread.id,
        accountId: thread.accountId ?? null,
        vertical: thread.vertical as VerticalType,
        listingId: thread.listingId,
        ownerUserId: thread.ownerUserId,
        buyerUserId: thread.buyerUserId,
        leadId: thread.leadId,
        ownerUnreadCount: thread.ownerUnreadCount,
        buyerUnreadCount: thread.buyerUnreadCount,
        ownerArchivedAt: thread.ownerArchivedAt?.getTime() ?? null,
        buyerArchivedAt: thread.buyerArchivedAt?.getTime() ?? null,
        ownerSpamAt: thread.ownerSpamAt?.getTime() ?? null,
        buyerSpamAt: thread.buyerSpamAt?.getTime() ?? null,
        lastMessageAt: thread.lastMessageAt.getTime(),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime(),
    };
}

export function mapMessageEntryRow(entry: typeof messageEntries.$inferSelect): MessageEntryRecord {
    return {
        id: entry.id,
        threadId: entry.threadId,
        senderUserId: entry.senderUserId,
        senderRole: entry.senderRole as MessageSenderRole,
        body: entry.body,
        createdAt: entry.createdAt.getTime(),
    };
}
