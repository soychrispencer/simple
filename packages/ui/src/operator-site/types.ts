import type { ReactNode } from 'react';
import type { OperatorSiteColorMode, OperatorSiteLayout } from '@simple/utils';

export type { OperatorSiteLayout } from '@simple/utils';

export type OperatorSiteSocialLink = {
    href: string;
    label: string;
    kind: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';
};

export type OperatorSiteLocation = {
    id: string;
    name: string;
    addressLine: string;
    city: string | null;
    region: string | null;
    notes?: string | null;
    googleMapsUrl: string | null;
};

export type OperatorSitePaymentMethods = {
    requiresAdvancePayment: boolean;
    acceptsMp?: boolean;
    acceptsTransfer?: boolean;
    acceptsPaymentLink?: boolean;
    mpConnected: boolean;
    paymentLinkUrl: string | null;
    bankTransferData: {
        bank: string;
        accountType: string;
        accountNumber: string;
        holderName: string;
        holderRut: string;
        holderEmail: string;
        alias?: string;
    } | null;
};

export type AgendaOperatorSiteProfile = {
    slug: string;
    displayName: string;
    profession: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    city: string | null;
    region?: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    websiteUrl: string | null;
    servesOnline?: boolean;
    servesPresential?: boolean;
    paymentMethods: OperatorSitePaymentMethods;
    locations: OperatorSiteLocation[];
};

export type OperatorSiteSchedule = {
    alwaysOpen: boolean;
    scheduleNote: string | null;
    days: Array<{
        dayOfWeek: number;
        dayLabel: string;
        isActive: boolean;
        startTime: string;
        endTime: string;
        breakStart: string | null;
        breakEnd: string | null;
    }>;
};

export type OperatorSiteServiceItem = {
    id: string;
    name: string;
    description?: string | null;
    durationMinutes: number;
    price: string | null;
    currency: string;
    isOnline: boolean;
    isPresential: boolean;
    imageUrl?: string | null;
};

export type OperatorSitePackItem = {
    id: string;
    name: string;
    description?: string | null;
    sessionsCount: number;
    price: string;
    currency: string;
    validityDays?: number | null;
};

export type OperatorSitePromotionItem = {
    id: string;
    label: string;
    description?: string | null;
    discountType: 'percent' | 'fixed';
    discountValue: string;
    code?: string | null;
};

export type OperatorSiteCatalog = {
    services: OperatorSiteServiceItem[];
    packs: OperatorSitePackItem[];
    promotions: OperatorSitePromotionItem[];
};

export type AgendaOperatorSiteProps = {
    profile: AgendaOperatorSiteProfile;
    typeLabel: string;
    businessLabel: string;
    socialLinks: OperatorSiteSocialLink[];
    booking: ReactNode;
    schedule?: OperatorSiteSchedule | null;
    catalog?: OperatorSiteCatalog | null;
    onServiceBook?: (serviceId: string) => void;
    appearance?: {
        layout: OperatorSiteLayout;
        colorMode: OperatorSiteColorMode;
        accentColor?: string;
    };
    brandName?: string;
    brandHref?: string;
};
