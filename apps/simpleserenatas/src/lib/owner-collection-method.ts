import type { Serenata } from '@/lib/serenatas-api';

export const OWNER_COLLECTION_METHODS = ['cash', 'card', 'transfer', 'other'] as const;

export type OwnerCollectionMethod = (typeof OWNER_COLLECTION_METHODS)[number];

const LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    other: 'Otro',
    payment_link: 'Link de pago',
};

export function ownerCollectionMethodLabel(method: string): string {
    return LABELS[method] ?? method;
}

export const OWNER_COLLECTION_METHOD_OPTIONS = [
    { value: '', label: 'Seleccionar…' },
    ...OWNER_COLLECTION_METHODS.map((method) => ({
        value: method,
        label: ownerCollectionMethodLabel(method),
    })),
];

export function formatSerenataCollectionMethod(item: Pick<Serenata, 'source' | 'ownerCollectionMethod'>): string | null {
    if (item.source !== 'own_lead' || !item.ownerCollectionMethod) return null;
    return ownerCollectionMethodLabel(item.ownerCollectionMethod);
}
