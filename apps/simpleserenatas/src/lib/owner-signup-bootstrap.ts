import { consumeSignupGroupName, consumeSignupOwnerName, readSignupGroupName } from '@/lib/active-provider-group';
import { clearLegacyAppModeStorage } from '@/lib/app-mode';
import { serenatasApi } from '@/lib/serenatas-api';
import { clearSignupProfile, hasOwnerSignupIntent } from '@/lib/signup-profile';

/**
 * Aplica borradores de `/registrar-mariachis` tras crear el perfil de dueño:
 * nombre del dueño → `users.name`; nombre del grupo → primer `provider_group` en borrador.
 */
export async function applyOwnerSignupDrafts(options?: {
    refreshSession?: () => Promise<unknown>;
}): Promise<void> {
    const ownerName = consumeSignupOwnerName();
    if (ownerName) {
        await serenatasApi.updateUser({ name: ownerName });
        await options?.refreshSession?.();
    }

    const groupsResponse = await serenatasApi.myProviderGroups();
    if (!groupsResponse.ok) return;

    if (groupsResponse.items.length > 0) {
        consumeSignupGroupName();
        return;
    }

    const groupName = readSignupGroupName();
    if (!groupName || groupName.trim().length < 2) return;

    await serenatasApi.createProviderGroup({
        name: groupName.trim(),
        status: 'draft',
    });
    consumeSignupGroupName();
}

/** Activa perfil de dueño tras verificar correo (p. ej. registro en `/registrar-mariachis`). */
export async function ensureOwnerProfileFromSignup(options?: {
    refreshSession?: () => Promise<unknown>;
}): Promise<boolean> {
    if (!hasOwnerSignupIntent()) return false;

    const response = await serenatasApi.profiles();
    if (!response.ok) return false;

    if (!response.profiles.owner) {
        const created = await serenatasApi.registerOwner();
        if (!created.ok) return false;
    }

    await applyOwnerSignupDrafts(options);
    clearLegacyAppModeStorage();
    clearSignupProfile();
    return true;
}
