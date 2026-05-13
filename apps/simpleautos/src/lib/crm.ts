import {
    addCrmLeadNote as addCrmLeadNoteForVertical,
    addCrmListingLeadNote as addCrmListingLeadNoteForVertical,
    createCrmPipelineColumn as createCrmPipelineColumnForVertical,
    deleteCrmPipelineColumn as deleteCrmPipelineColumnForVertical,
    fetchCrmLeadDetail as fetchCrmLeadDetailForVertical,
    fetchCrmLeads as fetchCrmLeadsForVertical,
    fetchCrmListingLeadDetail as fetchCrmListingLeadDetailForVertical,
    fetchCrmListingLeads as fetchCrmListingLeadsForVertical,
    fetchCrmPipelineColumns as fetchCrmPipelineColumnsForVertical,
    reorderCrmPipelineColumns as reorderCrmPipelineColumnsForVertical,
    runCrmLeadQuickAction as runCrmLeadQuickActionForVertical,
    runCrmListingLeadQuickAction as runCrmListingLeadQuickActionForVertical,
    updateCrmLead as updateCrmLeadForVertical,
    updateCrmListingLead as updateCrmListingLeadForVertical,
    updateCrmPipelineColumn as updateCrmPipelineColumnForVertical,
    type CrmLead,
    type CrmLeadActivity,
    type CrmLeadDetail,
    type CrmLeadQuickAction,
    type CrmListingLead,
    type CrmListingLeadActivity,
    type CrmListingLeadDetail,
    type CrmPipelineColumn,
} from '@simple/utils';

const VERTICAL = 'autos';

export type {
    CrmLead,
    CrmLeadActivity,
    CrmLeadDetail,
    CrmLeadQuickAction,
    CrmListingLead,
    CrmListingLeadActivity,
    CrmListingLeadDetail,
    CrmPipelineColumn,
};

export function fetchCrmLeads(): Promise<CrmLead[]> {
    return fetchCrmLeadsForVertical(VERTICAL);
}

export function fetchCrmLeadDetail(leadId: string): Promise<CrmLeadDetail | null> {
    return fetchCrmLeadDetailForVertical(leadId, VERTICAL);
}

export function updateCrmLead(
    leadId: string,
    changes: Parameters<typeof updateCrmLeadForVertical>[2]
): ReturnType<typeof updateCrmLeadForVertical> {
    return updateCrmLeadForVertical(leadId, VERTICAL, changes);
}

export function addCrmLeadNote(leadId: string, body: string): Promise<{
    ok: boolean;
    item?: CrmLead;
    activity?: CrmLeadActivity;
    error?: string;
}> {
    return addCrmLeadNoteForVertical(leadId, VERTICAL, body);
}

export function runCrmLeadQuickAction(
    leadId: string,
    action: CrmLeadQuickAction
): ReturnType<typeof runCrmLeadQuickActionForVertical> {
    return runCrmLeadQuickActionForVertical(leadId, VERTICAL, action);
}

export function fetchCrmListingLeads(): Promise<CrmListingLead[]> {
    return fetchCrmListingLeadsForVertical(VERTICAL);
}

export function fetchCrmPipelineColumns(): Promise<CrmPipelineColumn[]> {
    return fetchCrmPipelineColumnsForVertical(VERTICAL);
}

export function fetchCrmListingLeadDetail(leadId: string): Promise<CrmListingLeadDetail | null> {
    return fetchCrmListingLeadDetailForVertical(leadId, VERTICAL);
}

export function updateCrmListingLead(
    leadId: string,
    changes: Parameters<typeof updateCrmListingLeadForVertical>[2]
): ReturnType<typeof updateCrmListingLeadForVertical> {
    return updateCrmListingLeadForVertical(leadId, VERTICAL, changes);
}

export function createCrmPipelineColumn(
    input: Parameters<typeof createCrmPipelineColumnForVertical>[1]
): ReturnType<typeof createCrmPipelineColumnForVertical> {
    return createCrmPipelineColumnForVertical(VERTICAL, input);
}

export function updateCrmPipelineColumn(
    columnId: string,
    input: Parameters<typeof updateCrmPipelineColumnForVertical>[2]
): ReturnType<typeof updateCrmPipelineColumnForVertical> {
    return updateCrmPipelineColumnForVertical(columnId, VERTICAL, input);
}

export function deleteCrmPipelineColumn(columnId: string): ReturnType<typeof deleteCrmPipelineColumnForVertical> {
    return deleteCrmPipelineColumnForVertical(columnId, VERTICAL);
}

export function reorderCrmPipelineColumns(columnIds: string[]): ReturnType<typeof reorderCrmPipelineColumnsForVertical> {
    return reorderCrmPipelineColumnsForVertical(VERTICAL, columnIds);
}

export function addCrmListingLeadNote(
    leadId: string,
    body: string
): ReturnType<typeof addCrmListingLeadNoteForVertical> {
    return addCrmListingLeadNoteForVertical(leadId, VERTICAL, body);
}

export function runCrmListingLeadQuickAction(
    leadId: string,
    action: CrmLeadQuickAction
): ReturnType<typeof runCrmListingLeadQuickActionForVertical> {
    return runCrmListingLeadQuickActionForVertical(leadId, VERTICAL, action);
}
