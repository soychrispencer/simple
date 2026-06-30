import type { MusicianPayout, Serenata, SerenataMePlan } from '@/lib/serenatas-api';
import { computeSerenataAppDeduction } from '@/components/panel/shared';
import { formatSerenataCollectionMethod } from '@/lib/owner-collection-method';

export type FinancePeriodRange = { from: string; to: string };

export function currentMonthRange(): FinancePeriodRange {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}

function eventYmd(item: Serenata): string | null {
    const raw = item.eventDate;
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function inRange(item: Serenata, range: FinancePeriodRange): boolean {
    const ymd = eventYmd(item);
    if (!ymd) return false;
    return ymd >= range.from && ymd <= range.to;
}

const REVENUE_STATUSES = new Set<Serenata['status']>(['scheduled', 'completed', 'accepted_pending_group']);

export type OwnerFinanceSummary = {
    serenataCount: number;
    ownCount: number;
    platformCount: number;
    grossClp: number;
    commissionClp: number;
    netEstimatedClp: number;
    pendingMusicianPayoutsClp: number;
    paidMusicianPayoutsClp: number;
    netAfterMusiciansClp: number;
};

export function buildOwnerFinanceSummary(
    serenatas: Serenata[],
    plan: SerenataMePlan | null,
    range: FinancePeriodRange,
    payouts: MusicianPayout[] = [],
): OwnerFinanceSummary {
    void plan;
    const commissionBps = 0;
    const commissionVatBps = 0;

    const items = serenatas.filter((item) => inRange(item, range) && REVENUE_STATUSES.has(item.status));

    let grossClp = 0;
    let commissionClp = 0;
    let netEstimatedClp = 0;
    let ownCount = 0;
    let platformCount = 0;

    for (const item of items) {
        const price = item.price ?? 0;
        if (price <= 0) continue;
        grossClp += price;
        if (item.source === 'platform_lead') {
            platformCount += 1;
            const { commissionClp: fee, netClp } = computeSerenataAppDeduction(price, commissionBps, commissionVatBps);
            commissionClp += fee;
            netEstimatedClp += netClp;
        } else {
            ownCount += 1;
            netEstimatedClp += price;
        }
    }

    const pendingMusicianPayoutsClp = payouts
        .filter((item) => item.status === 'pending' && item.eventDate && item.eventDate >= range.from && item.eventDate <= range.to)
        .reduce((sum, item) => sum + item.amount, 0);
    const paidMusicianPayoutsClp = payouts
        .filter((item) => item.status === 'paid' && item.eventDate && item.eventDate >= range.from && item.eventDate <= range.to)
        .reduce((sum, item) => sum + item.amount, 0);
    return {
        serenataCount: items.length,
        ownCount,
        platformCount,
        grossClp,
        commissionClp,
        netEstimatedClp,
        pendingMusicianPayoutsClp,
        paidMusicianPayoutsClp,
        netAfterMusiciansClp: netEstimatedClp - paidMusicianPayoutsClp,
    };
}

export type FinanceMovementRow = {
    id: string;
    eventDate: string;
    eventTime: string | null;
    recipientName: string;
    source: Serenata['source'];
    status: Serenata['status'];
    price: number | null;
    commissionClp: number | null;
    netClp: number | null;
    collectionMethod: string | null;
    ownerPayoutStatus: Serenata['ownerPayoutStatus'];
    ownerPayoutAt: Serenata['ownerPayoutAt'];
    ownerPayoutAmount: Serenata['ownerPayoutAmount'];
    ownerPayoutReference: Serenata['ownerPayoutReference'];
};

export function buildFinanceMovements(
    serenatas: Serenata[],
    plan: SerenataMePlan | null,
    range: FinancePeriodRange,
): FinanceMovementRow[] {
    void plan;
    const commissionBps = 0;
    const commissionVatBps = 0;

    return serenatas
        .filter((item) => inRange(item, range))
        .sort((a, b) => {
            const dateDiff = (eventYmd(b) ?? '').localeCompare(eventYmd(a) ?? '');
            if (dateDiff !== 0) return dateDiff;
            return (b.eventTime ?? '').localeCompare(a.eventTime ?? '');
        })
        .map((item) => {
            const price = item.price;
            let commission: number | null = null;
            let net: number | null = price;
            if (price != null && item.source === 'platform_lead') {
                const deduction = computeSerenataAppDeduction(price, commissionBps, commissionVatBps);
                commission = deduction.commissionClp;
                net = deduction.netClp;
            }
            return {
                id: item.id,
                eventDate: eventYmd(item) ?? item.eventDate,
                eventTime: item.eventTime,
                recipientName: item.recipientName,
                source: item.source,
                status: item.status,
                price,
                commissionClp: commission,
                netClp: net,
                collectionMethod: formatSerenataCollectionMethod(item),
                ownerPayoutStatus: item.ownerPayoutStatus ?? null,
                ownerPayoutAt: item.ownerPayoutAt ?? null,
                ownerPayoutAmount: item.ownerPayoutAmount ?? null,
                ownerPayoutReference: item.ownerPayoutReference ?? null,
            };
        });
}
