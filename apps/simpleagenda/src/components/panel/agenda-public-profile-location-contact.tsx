'use client';

import type { AgendaLocation } from '@/lib/agenda-api';
import type { SocialLink } from '@/lib/agenda-mi-negocio-social';
import type { StructuredLocation } from '@simple/types';
import {
    BusinessPublicContactCard,
    BusinessPublicLocationCard,
    type BusinessPublicContactForm,
    type DefaultBusinessAddress,
} from '@simple/ui/panel';

function formatAgendaLocationFullAddress(location: AgendaLocation): string {
    return [location.addressLine, location.city, location.region].filter(Boolean).join(', ');
}

export function resolveDefaultAgendaLocation(locations: AgendaLocation[]): DefaultBusinessAddress | null {
    const entry = locations.find((item) => item.isDefault);
    if (!entry) return null;
    return {
        id: entry.id,
        label: formatAgendaLocationFullAddress(entry),
    };
}

export type AgendaPublicContactForm = BusinessPublicContactForm;

type AgendaPublicProfileLocationContactProps = {
    form: AgendaPublicContactForm;
    onFormChange: (key: keyof AgendaPublicContactForm, value: string) => void;
    socialLinks: SocialLink[];
    onSocialLinksChange: (links: SocialLink[]) => void;
    businessLocation: StructuredLocation;
    onBusinessLocationChange: (next: StructuredLocation) => void;
    defaultAddress: DefaultBusinessAddress | null;
    showPrimaryAddress: boolean;
    onShowPrimaryAddressChange: (show: boolean) => void;
    timezone?: string;
    saving?: boolean;
    contactResetKey?: string;
};

export function AgendaPublicProfileLocationContact({
    form,
    onFormChange,
    socialLinks,
    onSocialLinksChange,
    businessLocation,
    onBusinessLocationChange,
    defaultAddress,
    showPrimaryAddress,
    onShowPrimaryAddressChange,
    timezone,
    saving = false,
    contactResetKey,
}: AgendaPublicProfileLocationContactProps) {
    return (
        <>
            <BusinessPublicLocationCard
                addressesHref="/panel/mi-negocio/direcciones"
                defaultAddress={defaultAddress}
                showPrimaryAddress={showPrimaryAddress}
                onShowPrimaryAddressChange={onShowPrimaryAddressChange}
                structuredLocation={businessLocation}
                onStructuredLocationChange={onBusinessLocationChange}
                disabled={saving}
                timezone={timezone}
                timezoneContext="agenda"
                regionLabel="Región"
                localityLabel="Comuna / ciudad"
            />

            <BusinessPublicContactCard
                form={form}
                onFormChange={onFormChange}
                socialLinks={socialLinks}
                onSocialLinksChange={onSocialLinksChange}
                disabled={saving}
                contactResetKey={contactResetKey}
            />
        </>
    );
}
