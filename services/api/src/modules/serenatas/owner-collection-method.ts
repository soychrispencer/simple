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

export function isOwnerCollectionMethod(value: string): value is OwnerCollectionMethod {
    return (OWNER_COLLECTION_METHODS as readonly string[]).includes(value);
}

export function validateOwnerCollectionMethod(
    method: string | null | undefined,
): { ok: true; method: OwnerCollectionMethod } | { ok: false; error: string } {
    if (!method) return { ok: false, error: 'Indica cómo pagó el cliente.' };
    if (!isOwnerCollectionMethod(method)) return { ok: false, error: 'Forma de pago inválida.' };
    return { ok: true, method };
}
