import { submitServiceLead as submitServiceLeadShared } from '@simple/utils';

export type ServiceLeadInput = {
    vertical: 'propiedades';
    serviceType: 'gestion_inmobiliaria';
    planId: 'basico' | 'premium';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    locationLabel?: string | null;
    assetType?: string | null;
    assetArea?: string | null;
    expectedPrice?: string | null;
    notes?: string | null;
    sourcePage?: string | null;
    acceptedTerms: true;
};

export function submitServiceLead(input: ServiceLeadInput): Promise<{ ok: boolean; error?: string }> {
    return submitServiceLeadShared(input);
}
