import { API_BASE } from '@simple/config';

export type AccountBusinessLegal = {
    businessLegalName: string | null;
    businessTaxId: string | null;
    billingAddressId: string | null;
};

export async function fetchAccountBusinessLegal(): Promise<AccountBusinessLegal | null> {
    const response = await fetch(`${API_BASE}/api/accounts/current`, {
        credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data?.ok || !data.account) return null;
    return {
        businessLegalName: data.account.businessLegalName ?? null,
        businessTaxId: data.account.businessTaxId ?? null,
        billingAddressId: data.account.billingAddressId ?? null,
    };
}

export async function updateAccountBusinessLegal(input: {
    businessLegalName: string;
    businessTaxId: string;
}): Promise<{ ok: boolean; error?: string; account?: AccountBusinessLegal }> {
    const response = await fetch(`${API_BASE}/api/accounts/current/business-legal`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error ?? 'No pudimos guardar los datos legales.' };
    }
    return {
        ok: true,
        account: {
            businessLegalName: data.account.businessLegalName ?? null,
            businessTaxId: data.account.businessTaxId ?? null,
            billingAddressId: data.account.billingAddressId ?? null,
        },
    };
}

export async function updateAccountBillingAddress(billingAddressId: string | null): Promise<{
    ok: boolean;
    error?: string;
    account?: AccountBusinessLegal;
}> {
    const response = await fetch(`${API_BASE}/api/accounts/current/billing-address`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingAddressId }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error ?? 'No pudimos guardar la dirección tributaria.' };
    }
    return {
        ok: true,
        account: {
            businessLegalName: data.account.businessLegalName ?? null,
            businessTaxId: data.account.businessTaxId ?? null,
            billingAddressId: data.account.billingAddressId ?? null,
        },
    };
}

export async function updateAccountBusinessBilling(input: {
    businessLegalName: string;
    businessTaxId: string;
    billingAddressId: string | null;
}): Promise<{ ok: boolean; error?: string; account?: AccountBusinessLegal }> {
    const legal = await updateAccountBusinessLegal({
        businessLegalName: input.businessLegalName,
        businessTaxId: input.businessTaxId,
    });
    if (!legal.ok) return legal;
    const billing = await updateAccountBillingAddress(input.billingAddressId);
    if (!billing.ok) return billing;
    return {
        ok: true,
        account: billing.account ?? legal.account,
    };
}
