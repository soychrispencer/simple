// Boost types and constants
import { MARKETPLACE_BOOST_PRICING } from '@simple/utils';

export type BoostTargetType = 'listing' | 'serenata_group' | 'operator_profile' | 'operator_product' | 'operator_service';
export type BoostSection = 'sale' | 'rent' | 'auction' | 'project' | 'marketplace' | 'landing' | 'products' | 'services';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostPlan = 'boost_starter' | 'boost_pro' | 'boost_max';

export type BoostOrder = {
    id: string;
    accountId?: string | null;
    userId: string;
    targetType: BoostTargetType;
    targetId: string;
    /** @deprecated Alias de targetId para compatibilidad. */
    listingId: string;
    vertical: VerticalType;
    section: BoostSection;
    planId: BoostPlanId;
    planName: string;
    days: number;
    price: number;
    startAt: number;
    endAt: number;
    status: BoostOrderStatus;
    createdAt: number;
    updatedAt: number;
};

export type BoostPlanTemplate = {
    id: BoostPlan;
    name: string;
    days: number;
    visibilityLift: string;
};

export type BoostPlanRecord = {
    id: BoostPlanId;
    name: string;
    days: number;
    visibilityLift: string;
    price: number;
};

export type BoostTargetRecord = {
    id: string;
    targetType: BoostTargetType;
    vertical: VerticalType;
    section: BoostSection;
    ownerId: string;
    href: string;
    title: string;
    subtitle: string;
    price: string;
    location: string;
    imageUrl?: string;
    imageUrls?: string[];
};

/** @deprecated Usar BoostTargetRecord */
export type BoostListingRecord = BoostTargetRecord;

export type VerticalType = 'propiedades' | 'autos' | 'serenatas' | 'plataforma' | 'agenda';

const ZERO_BOOST_SECTION = {
    sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    marketplace: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    landing: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    products: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    services: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
} as const;

export const BOOST_PLAN_TEMPLATES: BoostPlanTemplate[] = [
    { id: 'boost_starter', name: 'Starter', days: 7, visibilityLift: '2x' },
    { id: 'boost_pro', name: 'Pro', days: 14, visibilityLift: '5x' },
    { id: 'boost_max', name: 'Max', days: 30, visibilityLift: '10x' },
];

export const BOOST_PRICE_BY_VERTICAL_SECTION: Record<VerticalType, Record<BoostSection, Record<BoostPlan, number>>> = {
    propiedades: {
        ...ZERO_BOOST_SECTION,
        ...MARKETPLACE_BOOST_PRICING.propiedades,
    } as Record<BoostSection, Record<BoostPlan, number>>,
    autos: {
        ...ZERO_BOOST_SECTION,
        ...MARKETPLACE_BOOST_PRICING.autos,
    } as Record<BoostSection, Record<BoostPlan, number>>,
    serenatas: {
        ...ZERO_BOOST_SECTION,
        ...MARKETPLACE_BOOST_PRICING.serenatas,
    } as Record<BoostSection, Record<BoostPlan, number>>,
    agenda: {
        ...ZERO_BOOST_SECTION,
        ...MARKETPLACE_BOOST_PRICING.agenda,
    } as Record<BoostSection, Record<BoostPlan, number>>,
    plataforma: ZERO_BOOST_SECTION,
};

export const MAX_BOOST_SLOTS_PER_SECTION = 10;
