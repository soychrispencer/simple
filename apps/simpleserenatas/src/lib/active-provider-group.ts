/** Grupo operativo seleccionado en Mi Negocio (plantel / formaciones). */
export const ACTIVE_PROVIDER_GROUP_KEY = 'serenatas-active-provider-group-id';

/** Nombre del mariachi capturado en `/para-duenos` antes del alta. */
export const SIGNUP_GROUP_NAME_KEY = 'serenatas-signup-group-name';

/** Nombre del dueño capturado en `/para-duenos` (p. ej. registro con Google). */
export const SIGNUP_OWNER_NAME_KEY = 'serenatas-signup-owner-name';

export function persistSignupDrafts(groupName: string, ownerName: string) {
    if (typeof window === 'undefined') return;
    const trimmedGroup = groupName.trim();
    const trimmedOwner = ownerName.trim();
    if (trimmedGroup) {
        window.sessionStorage.setItem(SIGNUP_GROUP_NAME_KEY, trimmedGroup);
    }
    if (trimmedOwner) {
        window.sessionStorage.setItem(SIGNUP_OWNER_NAME_KEY, trimmedOwner);
    }
}

export function readSignupOwnerName(): string | null {
    if (typeof window === 'undefined') return null;
    const value = window.sessionStorage.getItem(SIGNUP_OWNER_NAME_KEY)?.trim();
    return value || null;
}

export function consumeSignupOwnerName(): string | null {
    const value = readSignupOwnerName();
    if (value && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(SIGNUP_OWNER_NAME_KEY);
    }
    return value;
}

export function readSignupGroupName(): string | null {
    if (typeof window === 'undefined') return null;
    const value = window.sessionStorage.getItem(SIGNUP_GROUP_NAME_KEY)?.trim();
    return value || null;
}

export function consumeSignupGroupName(): string | null {
    const value = readSignupGroupName();
    if (value && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(SIGNUP_GROUP_NAME_KEY);
    }
    return value;
}

export function readActiveProviderGroupId(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACTIVE_PROVIDER_GROUP_KEY);
}

export function persistActiveProviderGroupId(id: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_PROVIDER_GROUP_KEY, id);
}

export function resolveActiveProviderGroupId<T extends { id: string }>(groups: T[]): string | null {
    if (groups.length === 0) return null;
    const stored = readActiveProviderGroupId();
    if (stored && groups.some((g) => g.id === stored)) return stored;
    return groups[0]?.id ?? null;
}
