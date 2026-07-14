/**
 * Relationship Engine — TimelineEvent catalog (domain language).
 * Persistence / emission wiring comes later; names here are frozen.
 *
 * @see docs/SIMPLE_PLATFORM_TIMELINE_EVENTS.md
 * @see docs/SIMPLE_PLATFORM_LANGUAGE.md
 */

export type TimelineActor =
    | 'professional'
    | 'client'
    | 'buyer'
    | 'system'
    | 'owner'
    | 'musician';

export type TimelineVertical = 'agenda' | 'serenatas' | 'autos' | 'propiedades' | 'platform';

/** Role on a Relationship (UI may still say Paciente / Lead / Contratante). */
export type RelationshipRole =
    | 'client'
    | 'patient'
    | 'student'
    | 'lead'
    | 'contractor'
    | 'buyer'
    | 'seller'
    | 'owner'
    | 'tenant'
    | 'referrer'
    | 'referee'
    | 'provider'
    | 'musician';

/** Stable event type strings. Prefer extending this union over free-form strings. */
export type TimelineEventType =
    // Relationship
    | 'relationship.created'
    | 'relationship.updated'
    // Booking (Agenda / shared booking capability)
    | 'booking.requested'
    | 'booking.confirmed'
    | 'booking.status_changed'
    // Payments (B2C)
    | 'payment.recorded'
    | 'payment.paid'
    | 'payment.refunded'
    | 'payment.waived'
    // Packs / offers
    | 'pack.purchased'
    | 'pack.session_consumed'
    | 'offer.applied'
    // Notes / files
    | 'note.written'
    | 'file.attached'
    // Referrals / NPS
    | 'referral.created'
    | 'referral.converted'
    | 'referral.rewarded'
    | 'nps.submitted'
    // Group sessions
    | 'group.attendee_registered'
    | 'group.attendee_status_changed'
    // Conversations / engagement
    | 'conversation.started'
    | 'conversation.message_sent'
    | 'engagement.saved'
    | 'engagement.followed'
    | 'lead.opened'
    // Serenatas
    | 'serenata.requested'
    | 'serenata.created'
    | 'serenata.offer_sent'
    | 'serenata.offer_accepted'
    | 'serenata.status_changed'
    | 'serenata.reviewed'
    | 'serenata.setlist_confirmed'
    | 'payout.musician_paid'
    // Publications (Business-scoped; rare on Relationship timeline)
    | 'publication.status_changed';

export type TimelineSubjectKind =
    | 'agenda_client'
    | 'agenda_appointment'
    | 'agenda_payment'
    | 'agenda_client_pack'
    | 'agenda_referral'
    | 'agenda_attachment'
    | 'agenda_session_note'
    | 'agenda_group_attendee'
    | 'serenata'
    | 'serenata_offer'
    | 'message_thread'
    | 'listing'
    | 'public_profile'
    | 'provider_group'
    | 'relationship_note';

export type TimelineBusinessRef = {
    vertical: TimelineVertical;
    /** Vertical-native business id (professional profile, provider group, public profile, account…). */
    id: string;
};

export type TimelinePersonRef = {
    /** Until Person table exists: agenda client id, user id, or opaque key. */
    id: string;
    kind: 'agenda_client' | 'user' | 'email' | 'opaque';
};

export type TimelineSubjectRef = {
    kind: TimelineSubjectKind;
    id: string;
};

/**
 * Domain event. Emit after successful mutation; never block the business write.
 */
export type TimelineEventInput = {
    type: TimelineEventType;
    occurredAt?: Date | string;
    business: TimelineBusinessRef;
    person?: TimelinePersonRef | null;
    relationshipId?: string | null;
    subject: TimelineSubjectRef;
    actor: TimelineActor;
    payload?: Record<string, unknown>;
};

/** Agenda Tier-1 types — first hooks to wire in the API. */
export const AGENDA_TIMELINE_TIER1 = [
    'relationship.created',
    'booking.requested',
    'booking.confirmed',
    'booking.status_changed',
    'payment.recorded',
    'payment.paid',
    'conversation.message_sent',
] as const satisfies readonly TimelineEventType[];
