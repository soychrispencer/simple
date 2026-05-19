import type { ListingLeadRecord, PipelineColumnRecord } from '../../lib/domain-types.js';
import {
    type CrmServiceDeps,
    createListingLeadActivity as createListingLeadActivityFromCrm,
    createServiceLeadActivity as createServiceLeadActivityFromCrm,
    getListingLeadById as getListingLeadByIdFromCrm,
    listListingLeadRecords as listListingLeadRecordsFromCrm,
    listServiceLeadRecords as listServiceLeadRecordsFromCrm,
    listingLeadToResponse as listingLeadToResponseFromCrm,
} from './service.js';

export function createCrmRuntimeBindings(deps: CrmServiceDeps) {
    return {
        listingLeadToResponse: (
            record: ListingLeadRecord,
            options?: { threadId?: string | null; pipelineColumns?: PipelineColumnRecord[] },
        ) => listingLeadToResponseFromCrm(deps, record as Parameters<typeof listingLeadToResponseFromCrm>[1], options),
        listListingLeadRecords: (options?: Parameters<typeof listListingLeadRecordsFromCrm>[1]) =>
            listListingLeadRecordsFromCrm(deps, options),
        listServiceLeadRecords: (options?: Parameters<typeof listServiceLeadRecordsFromCrm>[1]) =>
            listServiceLeadRecordsFromCrm(deps, options),
        getListingLeadById: (id: string) => getListingLeadByIdFromCrm(deps, id),
        createListingLeadActivity: (input: Parameters<typeof createListingLeadActivityFromCrm>[1]) =>
            createListingLeadActivityFromCrm(deps, input),
        createServiceLeadActivity: (input: Parameters<typeof createServiceLeadActivityFromCrm>[1]) =>
            createServiceLeadActivityFromCrm(deps, input),
    };
}
