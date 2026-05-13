import {
    submitListingLead as submitListingLeadForVertical,
    submitListingLeadAction as submitListingLeadActionForVertical,
    type ListingLeadSubmissionResult,
} from '@simple/utils';

const VERTICAL = 'autos';

export type { ListingLeadSubmissionResult };

export async function submitListingLead(input: {
    listingId: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message: string;
    sourcePage?: string | null;
}): Promise<ListingLeadSubmissionResult> {
    return submitListingLeadForVertical(VERTICAL, input);
}

export async function submitListingLeadAction(input: {
    listingId: string;
    source: 'whatsapp' | 'phone_call' | 'email';
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message?: string | null;
    sourcePage?: string | null;
}): Promise<ListingLeadSubmissionResult> {
    return submitListingLeadActionForVertical(VERTICAL, input);
}
