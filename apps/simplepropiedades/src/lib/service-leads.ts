import { API_BASE } from '@simple/config';

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

type ServiceLeadResponse = {
    ok: boolean;
    error?: string;
};

export async function submitServiceLead(input: ServiceLeadInput): Promise<{ ok: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/api/service-leads`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });
        const data = (await response.json().catch(() => null)) as ServiceLeadResponse | null;
        if (!response.ok || !data?.ok) {
            return { ok: false, error: data?.error || 'No pudimos enviar tu solicitud.' };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
