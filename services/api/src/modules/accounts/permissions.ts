/** Shared account membership rules for API authorization. */
export function canManageAccountRole(role: unknown): boolean {
    return role === 'owner' || role === 'admin';
}

export function isAccountOwnerRole(role: unknown): boolean {
    return role === 'owner';
}

export function isAccountMemberRole(role: unknown): boolean {
    return canManageAccountRole(role) || role === 'agent';
}
