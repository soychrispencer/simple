const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ServiceLeadInput = {
    vertical: 'autos';
    serviceType: 'venta_asistida';
    planId: 'basico' | 'premium';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    locationLabel?: string | null;
    assetType?: string | null;
    assetBrand?: string | null;
    assetModel?: string | null;
    assetYear?: string | null;
    assetMileage?: string | null;
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
