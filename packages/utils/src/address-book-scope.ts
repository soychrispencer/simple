import type { AddressBookKind, AddressBookScope } from '@simple/types';

export const PERSONAL_ADDRESS_KINDS = ['personal', 'shipping', 'billing'] as const satisfies readonly AddressBookKind[];
export const PERSONAL_UI_ADDRESS_KINDS = ['personal', 'shipping'] as const satisfies readonly AddressBookKind[];
export const BUSINESS_ADDRESS_KINDS = [
    'office',
    'clinic',
    'store',
    'branch',
    'company',
    'warehouse',
    'pickup',
    'delivery',
    'other',
] as const satisfies readonly AddressBookKind[];

export function inferScopeFromKind(kind: AddressBookKind): AddressBookScope {
    return (PERSONAL_ADDRESS_KINDS as readonly string[]).includes(kind) ? 'personal' : 'business';
}

export function isKindValidForScope(kind: AddressBookKind, scope: AddressBookScope): boolean {
    const allowed = scope === 'personal' ? PERSONAL_ADDRESS_KINDS : BUSINESS_ADDRESS_KINDS;
    return (allowed as readonly string[]).includes(kind);
}

export function defaultKindForScope(scope: AddressBookScope): AddressBookKind {
    return scope === 'personal' ? 'personal' : 'office';
}

export function resolveAddressBookScope(
    scope: AddressBookScope | undefined,
    kind: AddressBookKind,
): AddressBookScope {
    if (scope) return scope;
    return inferScopeFromKind(kind);
}
