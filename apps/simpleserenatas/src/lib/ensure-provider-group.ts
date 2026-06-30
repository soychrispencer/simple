import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';

export const PROVIDER_GROUP_DRAFT_NAME = 'Mi mariachi';

export type EnsureProviderGroupResult =
    | { ok: true; item: ProviderGroup; created: boolean }
    | { ok: false; error: string };

/** Crea un borrador de mariachi solo si aún no existe (al guardar una sección). */
export async function ensureProviderGroupDraft(
    options?: { name?: string; refresh?: () => Promise<void> },
): Promise<EnsureProviderGroupResult> {
    const existing = await serenatasApi.myProviderGroups();
    if (existing.ok && existing.items[0]) {
        return { ok: true, item: existing.items[0], created: false };
    }

    const name = options?.name?.trim() || PROVIDER_GROUP_DRAFT_NAME;
    const created = await serenatasApi.createProviderGroup({
        name: name.length >= 2 ? name : PROVIDER_GROUP_DRAFT_NAME,
        status: 'draft',
        serviceComunas: [],
        countryCode: 'CL',
    });

    if (!created.ok || !created.item) {
        return { ok: false, error: created.error ?? 'No pudimos guardar los datos del mariachi.' };
    }

    await options?.refresh?.();
    return { ok: true, item: created.item, created: true };
}
