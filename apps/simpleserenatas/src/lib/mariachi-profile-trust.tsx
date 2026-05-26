import type { ProviderGroup } from '@/lib/serenatas-api';
import {
    bookingPolicySummary,
    contactAvailabilityLabel,
    formatPaymentMethods,
} from '@/lib/marketplace-group-display';

/** Pie de confianza en perfil público (pagos, contacto, política de reserva). */
export function mariachiProfileTrustFooter(group: ProviderGroup) {
    const paymentMethods = formatPaymentMethods(group);
    const contact = contactAvailabilityLabel(group);
    const policy = bookingPolicySummary(group).mode;
    const parts = [
        paymentMethods.length > 0 ? `Pagos: ${paymentMethods.join(' · ')}` : null,
        contact,
        policy,
    ].filter(Boolean);
    return parts.length > 0 ? <p className="leading-relaxed">{parts.join(' · ')}</p> : null;
}
