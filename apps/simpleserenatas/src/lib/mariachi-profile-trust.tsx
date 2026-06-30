import type { ProviderGroup } from '@/lib/serenatas-api';
import {
    bookingPolicySummary,
    contactAvailabilityLabel,
} from '@/lib/marketplace-group-display';

/** Pie de confianza en perfil público (contacto y política de reserva; el cobro en app es siempre online). */
export function mariachiProfileTrustFooter(group: ProviderGroup) {
    const contact = contactAvailabilityLabel(group);
    const policy = bookingPolicySummary(group).mode;
    const parts = [contact, policy].filter(Boolean);
    return parts.length > 0 ? <p className="leading-relaxed">{parts.join(' · ')}</p> : null;
}
