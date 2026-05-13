import { apiFetch } from './api-client.js';

export type ServiceLeadBaseInput = {
    vertical: 'autos' | 'propiedades';
    serviceType: string;
    planId: 'basico' | 'premium';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    locationLabel?: string | null;
    expectedPrice?: string | null;
    notes?: string | null;
    sourcePage?: string | null;
    acceptedTerms: true;
};

type ServiceLeadResponse = {
    ok: boolean;
    error?: string;
};

export async function submitServiceLead(input: ServiceLeadBaseInput & Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const { ok, data } = await apiFetch<ServiceLeadResponse>('/api/service-leads', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (!ok || !data?.ok) {
        return { ok: false, error: data?.error || 'No pudimos enviar tu solicitud.' };
    }
    return { ok: true };
}
