'use client';

import { useRef } from 'react';
import {
    buildOperatorSiteScheduleDays,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    resolveAgendaOperatorFields,
    resolveOperatorDisplayLabel,
    resolveOperatorTierLabel,
    type OperatorSiteColorMode,
    type OperatorSiteLayout,
} from '@simple/utils';
import {
    AgendaOperatorSite,
    type AgendaOperatorSiteProfile,
    type OperatorSiteCatalog,
    type OperatorSiteSchedule,
    type OperatorSiteSocialLink,
} from '@simple/ui/operator-site';
import BookingFlow, { type BookingFlowHandle } from './BookingFlow';

export type AgendaPublicProfile = AgendaOperatorSiteProfile & {
    accountKind?: string | null;
    operatorSubtype?: string | null;
    operatorSubtypeCustom?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    linkedinUrl?: string | null;
    tiktokUrl?: string | null;
    youtubeUrl?: string | null;
    twitterUrl?: string | null;
    timezone: string;
    bookingWindowDays: number;
    allowsRecurrentBooking: boolean;
    encuadre?: string | null;
    bookingTermsText?: string | null;
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    schedule?: {
        alwaysOpen: boolean;
        scheduleNote: string | null;
        rules: Array<{
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            breakStart?: string | null;
            breakEnd?: string | null;
            isActive: boolean;
        }>;
    };
    packs?: Array<{
        id: string;
        name: string;
        description?: string | null;
        sessionsCount: number;
        price: string;
        currency: string;
        validityDays?: number | null;
    }>;
    promotions?: Array<{
        id: string;
        label: string;
        description?: string | null;
        discountType: 'percent' | 'fixed';
        discountValue: string;
        code?: string | null;
    }>;
    appearance?: {
        layout: OperatorSiteLayout | string;
        colorMode: OperatorSiteColorMode | string;
        accentColor?: string;
    };
    services: Array<{
        id: string;
        name: string;
        description?: string | null;
        durationMinutes: number;
        price: string | null;
        currency: string;
        isOnline: boolean;
        isPresential: boolean;
        imageUrl?: string | null;
        preconsultFields?: Array<{
            id: string;
            label: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
            required: boolean;
            placeholder?: string;
            options?: string[];
        }>;
    }>;
};

function buildSocialLinks(profile: AgendaPublicProfile): OperatorSiteSocialLink[] {
    return [
        profile.instagramUrl && { href: profile.instagramUrl, label: 'Instagram', kind: 'instagram' as const },
        profile.facebookUrl && { href: profile.facebookUrl, label: 'Facebook', kind: 'facebook' as const },
        profile.linkedinUrl && { href: profile.linkedinUrl, label: 'LinkedIn', kind: 'linkedin' as const },
        profile.tiktokUrl && { href: profile.tiktokUrl, label: 'TikTok', kind: 'tiktok' as const },
        profile.youtubeUrl && { href: profile.youtubeUrl, label: 'YouTube', kind: 'youtube' as const },
        profile.twitterUrl && { href: profile.twitterUrl, label: 'X', kind: 'x' as const },
    ].filter(Boolean) as OperatorSiteSocialLink[];
}

export function AgendaPublicSite({ profile }: { profile: AgendaPublicProfile }) {
    const bookingRef = useRef<BookingFlowHandle>(null);
    const operator = resolveAgendaOperatorFields(profile);
    const typeLabel = resolveOperatorTierLabel('agenda', operator.accountKind);
    const businessLabel = resolveOperatorDisplayLabel(
        'agenda',
        operator.accountKind,
        operator.operatorSubtype,
        operator.operatorSubtypeCustom,
    );

    const siteProfile: AgendaOperatorSiteProfile = {
        slug: profile.slug,
        displayName: profile.displayName,
        profession: profile.profession,
        headline: profile.headline,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        city: profile.city,
        region: profile.region,
        publicEmail: profile.publicEmail,
        publicPhone: profile.publicPhone,
        publicWhatsapp: profile.publicWhatsapp,
        websiteUrl: profile.websiteUrl,
        servesOnline: profile.servesOnline,
        servesPresential: profile.servesPresential,
        paymentMethods: profile.paymentMethods,
        locations: profile.locations,
    };

    const schedule: OperatorSiteSchedule | null = profile.schedule
        ? {
            alwaysOpen: profile.schedule.alwaysOpen,
            scheduleNote: profile.schedule.scheduleNote,
            days: buildOperatorSiteScheduleDays(profile.schedule.rules, {
                alwaysOpen: profile.schedule.alwaysOpen,
            }),
        }
        : null;

    const catalog: OperatorSiteCatalog = {
        services: profile.services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description ?? null,
            durationMinutes: service.durationMinutes,
            price: service.price,
            currency: service.currency,
            isOnline: service.isOnline,
            isPresential: service.isPresential,
            imageUrl: service.imageUrl ?? null,
        })),
        packs: (profile.packs ?? []).map((pack) => ({
            id: pack.id,
            name: pack.name,
            description: pack.description ?? null,
            sessionsCount: pack.sessionsCount,
            price: pack.price,
            currency: pack.currency,
            validityDays: pack.validityDays ?? null,
        })),
        promotions: (profile.promotions ?? []).map((promo) => ({
            id: promo.id,
            label: promo.label,
            description: promo.description ?? null,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            code: promo.code ?? null,
        })),
    };

    const appearance = profile.appearance
        ? {
            layout: normalizeOperatorSiteLayout(profile.appearance.layout),
            colorMode: normalizeOperatorSiteColorMode(profile.appearance.colorMode),
            accentColor: profile.appearance.accentColor,
        }
        : undefined;

    return (
        <AgendaOperatorSite
            profile={siteProfile}
            typeLabel={typeLabel}
            businessLabel={businessLabel}
            socialLinks={buildSocialLinks(profile)}
            schedule={schedule}
            catalog={catalog}
            onServiceBook={(serviceId) => bookingRef.current?.openService(serviceId)}
            appearance={appearance}
            booking={<BookingFlow ref={bookingRef} profile={profile} embedded />}
        />
    );
}
