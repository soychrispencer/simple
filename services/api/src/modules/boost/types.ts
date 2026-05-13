// Boost types and constants
export type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostPlan = 'boost_starter' | 'boost_pro' | 'boost_max';

export type BoostOrder = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    listingId: string;
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

export type BoostListingRecord = {
    id: string;
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

export type VerticalType = 'propiedades' | 'autos' | 'serenatas' | 'plataforma' | 'agenda';

// Constants
export const BOOST_PLAN_TEMPLATES: BoostPlanTemplate[] = [
    { id: 'boost_starter', name: 'Starter', days: 7, visibilityLift: '2x' },
    { id: 'boost_pro', name: 'Pro', days: 14, visibilityLift: '5x' },
    { id: 'boost_max', name: 'Max', days: 30, visibilityLift: '10x' },
];

export const BOOST_PRICE_BY_VERTICAL_SECTION: Record<VerticalType, Record<BoostSection, Record<BoostPlan, number>>> = {
    propiedades: {
        sale: { boost_starter: 5000, boost_pro: 10000, boost_max: 20000 },
        rent: { boost_starter: 3000, boost_pro: 6000, boost_max: 12000 },
        project: { boost_starter: 15000, boost_pro: 30000, boost_max: 60000 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 }, // Not used
    },
    autos: {
        sale: { boost_starter: 15000, boost_pro: 30000, boost_max: 60000 },
        rent: { boost_starter: 10000, boost_pro: 20000, boost_max: 40000 },
        auction: { boost_starter: 25000, boost_pro: 50000, boost_max: 100000 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 }, // Not used
    },
    serenatas: {
        sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    },
    plataforma: {
        sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    },
    agenda: {
        sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    },
};

// Constants
export const MAX_BOOST_SLOTS_PER_SECTION = 10;