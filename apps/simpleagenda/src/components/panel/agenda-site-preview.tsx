'use client';

import { useEffect, useState } from 'react';
import type { OperatorSiteColorMode, OperatorSiteLayout } from '@simple/utils';
import { AgendaPublicSite, type AgendaPublicProfile } from '@/app/[slug]/agenda-public-site';
import {
    fetchAgendaAvailability,
    fetchAgendaLocations,
    fetchAgendaPacks,
    fetchAgendaProfile,
    fetchAgendaPromotions,
    fetchAgendaServices,
    type AgendaProfile,
} from '@/lib/agenda-api';

type AgendaSitePreviewProps = {
    layout: OperatorSiteLayout;
    colorMode: OperatorSiteColorMode;
    accent: string;
    revision: string;
    draft: boolean;
};

function profileForPreview(
    profile: AgendaProfile,
    services: Awaited<ReturnType<typeof fetchAgendaServices>>,
    locations: Awaited<ReturnType<typeof fetchAgendaLocations>>,
    availability: Awaited<ReturnType<typeof fetchAgendaAvailability>>,
    packs: Awaited<ReturnType<typeof fetchAgendaPacks>>,
    promotions: Awaited<ReturnType<typeof fetchAgendaPromotions>>,
    appearance: Pick<AgendaSitePreviewProps, 'layout' | 'colorMode' | 'accent'>,
    showDraft: boolean,
): AgendaPublicProfile {
    const now = Date.now();
    return {
        slug: profile.slug || 'vista-previa',
        displayName: profile.displayName?.trim() || 'Tu negocio',
        profession: profile.profession,
        accountKind: profile.accountKind ?? null,
        operatorSubtype: profile.operatorSubtype ?? null,
        operatorSubtypeCustom: profile.profession,
        headline: profile.headline,
        bio: profile.bio,
        landingPage: showDraft
            ? profile.operatorSiteLandingConfig?.draft ?? profile.operatorSiteLandingConfig?.published ?? null
            : profile.operatorSiteLandingConfig?.published ?? null,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        city: profile.city,
        region: profile.region,
        publicEmail: profile.publicEmail,
        publicPhone: profile.publicPhone,
        publicWhatsapp: profile.publicWhatsapp,
        websiteUrl: profile.websiteUrl,
        instagramUrl: profile.instagramUrl,
        facebookUrl: profile.facebookUrl,
        linkedinUrl: profile.linkedinUrl,
        tiktokUrl: profile.tiktokUrl,
        youtubeUrl: profile.youtubeUrl,
        twitterUrl: profile.twitterUrl,
        servesOnline: profile.servesOnline,
        servesPresential: profile.servesPresential,
        paymentMethods: {
            requiresAdvancePayment: profile.requiresAdvancePayment,
            acceptsMp: profile.acceptsMp,
            acceptsTransfer: profile.acceptsTransfer,
            acceptsPaymentLink: profile.acceptsPaymentLink,
            mpConnected: Boolean(profile.acceptsMp && profile.mpAccessToken),
            paymentLinkUrl: profile.acceptsPaymentLink ? profile.paymentLinkUrl : null,
            bankTransferData: profile.acceptsTransfer ? profile.bankTransferData : null,
        },
        locations: locations.filter((location) => location.isActive).map((location) => ({
            id: location.id,
            name: location.name,
            addressLine: location.addressLine,
            city: location.city,
            region: location.region,
            notes: location.notes,
            googleMapsUrl: location.googleMapsUrl,
        })),
        timezone: profile.timezone || 'America/Santiago',
        bookingWindowDays: profile.bookingWindowDays,
        allowsRecurrentBooking: profile.allowsRecurrentBooking,
        encuadre: profile.encuadre,
        bookingTermsText: profile.bookingTermsText ?? null,
        requiresAdvancePayment: profile.requiresAdvancePayment,
        advancePaymentInstructions: profile.advancePaymentInstructions,
        schedule: {
            alwaysOpen: availability.alwaysOpen,
            scheduleNote: availability.scheduleNote,
            rules: availability.rules.map((rule) => ({
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
                breakStart: rule.breakStart,
                breakEnd: rule.breakEnd,
                isActive: rule.isActive,
            })),
        },
        services: services
            .filter((service) => service.isActive && (!service.kind || service.kind === 'appointment'))
            .map((service) => ({
                id: service.id,
                name: service.name,
                description: service.description,
                durationMinutes: service.durationMinutes,
                price: service.price,
                currency: service.currency,
                isOnline: service.isOnline,
                isPresential: service.isPresential,
                imageUrl: service.imageUrl,
                preconsultFields: service.preconsultFields,
            })),
        packs: packs.filter((pack) => pack.isActive).map((pack) => ({
            id: pack.id,
            name: pack.name,
            description: pack.description,
            sessionsCount: pack.sessionsCount,
            price: String(pack.price),
            currency: pack.currency,
            validityDays: pack.validityDays,
        })),
        promotions: promotions
            .filter((promotion) => (
                promotion.isActive
                && (!promotion.startsAt || new Date(promotion.startsAt).getTime() <= now)
                && (!promotion.endsAt || new Date(promotion.endsAt).getTime() >= now)
                && (promotion.maxUses === null || promotion.usesCount < promotion.maxUses)
            ))
            .map((promotion) => ({
                id: promotion.id,
                label: promotion.label,
                description: promotion.description,
                discountType: promotion.discountType,
                discountValue: String(promotion.discountValue),
                code: promotion.code ?? undefined,
            })),
        appearance: {
            layout: appearance.layout,
            colorMode: appearance.colorMode,
            accentColor: appearance.accent,
        },
    };
}

export function AgendaSitePreview({ layout, colorMode, accent, revision, draft }: AgendaSitePreviewProps) {
    const [preview, setPreview] = useState<AgendaPublicProfile | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        void Promise.all([
            fetchAgendaProfile(),
            fetchAgendaServices(),
            fetchAgendaLocations(),
            fetchAgendaAvailability(),
            fetchAgendaPacks(),
            fetchAgendaPromotions(),
        ]).then(([profile, services, locations, availability, packs, promotions]) => {
            if (!active) return;
            if (!profile) {
                setError('Completa los datos de tu negocio para ver la página.');
                setPreview(null);
                return;
            }
            setPreview(profileForPreview(profile, services, locations, availability, packs, promotions, { layout, colorMode, accent }, draft));
        }).catch((cause: unknown) => {
            if (!active) return;
            setError(cause instanceof Error ? cause.message : 'No pudimos cargar la vista previa.');
            setPreview(null);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [layout, colorMode, accent, revision, draft]);

    if (loading) {
        return <div className="grid min-h-screen place-items-center px-6 text-sm text-fg-muted">Cargando la página de tu negocio…</div>;
    }
    if (error || !preview) {
        return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-fg-muted">{error || 'No pudimos cargar la vista previa.'}</div>;
    }
    return <AgendaPublicSite profile={preview} previewMode />;
}
