export type AgendaPromotionLifecycleInput = {
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    maxUses?: number | null;
    usesCount?: number;
};

export type AgendaPromotionLifecycleStatus = {
    label: string;
    tone: 'success' | 'warning' | 'neutral';
};

function isExpired(endsAt: string | null | undefined): boolean {
    if (!endsAt) return false;
    const date = new Date(endsAt);
    return !Number.isNaN(date.getTime()) && date < new Date();
}

function isNotYetActive(startsAt: string | null | undefined): boolean {
    if (!startsAt) return false;
    const date = new Date(startsAt);
    return !Number.isNaN(date.getTime()) && date > new Date();
}

function usesReached(maxUses: number | null | undefined, usesCount: number | undefined): boolean {
    return maxUses != null && (usesCount ?? 0) >= maxUses;
}

export function resolveAgendaPromotionLifecycleStatus(
    promotion: AgendaPromotionLifecycleInput,
): AgendaPromotionLifecycleStatus {
    if (!promotion.isActive) return { label: 'Pausada', tone: 'neutral' };
    if (isExpired(promotion.endsAt)) return { label: 'Expirada', tone: 'neutral' };
    if (usesReached(promotion.maxUses, promotion.usesCount)) return { label: 'Agotada', tone: 'warning' };
    if (isNotYetActive(promotion.startsAt)) return { label: 'Programada', tone: 'warning' };
    return { label: 'Activa', tone: 'success' };
}

export function formatAgendaPromotionDiscount(promotion: {
    discountType: 'percent' | 'fixed';
    discountValue: string | number;
}): string {
    if (promotion.discountType === 'percent') {
        return `${Number(promotion.discountValue)}% off`;
    }
    const amount = Number(promotion.discountValue);
    return `-$${Number.isFinite(amount) ? amount.toLocaleString('es-CL') : promotion.discountValue}`;
}
