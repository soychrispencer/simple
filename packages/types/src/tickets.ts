// ─────────────────────────────────────────────────────────────────────────────
// SimpleTickets — tipos y helpers compartidos
// ─────────────────────────────────────────────────────────────────────────────

export type TicketEventStatus =
    | 'draft'
    | 'published'
    | 'sales_paused'
    | 'sold_out'
    | 'cancelled'
    | 'completed';

export type TicketEventModality = 'in_person' | 'online' | 'hybrid';

export type TicketOnlineAccessMode = 'after_purchase' | 'url';

export type TicketTypeKind = 'access' | 'consumption' | 'combo';

export type TicketMinAge = number | null;

export type TicketEventCategory = string;

export type TicketOrderStatus =
    | 'pending'
    | 'awaiting_payment'
    | 'paid'
    | 'payment_pending'
    | 'payment_review'
    | 'refund_pending'
    | 'failed'
    | 'expired'
    | 'refunded'
    | 'cancelled';

export type TicketRefundStatus = 'processing' | 'approved' | 'review' | 'failed';

export type TicketSalesStatusFilter = 'all' | 'paid' | 'pending' | 'review' | 'refunded' | 'failed';

export type TicketSalesPeriod = 'all' | '7d' | '30d' | '90d';

export type TicketCheckinResult = 'admitted' | 'already_used' | 'invalid' | 'void' | 'wrong_event';

export type TicketCheckinSource = 'camera' | 'manual' | 'offline_queue' | 'attendee_list';

export type TicketAttendeeStatus = 'all' | 'pending' | 'admitted' | 'void';

export type TicketTicketTypeView = {
    id: string;
    name: string;
    description: string;
    kind?: TicketTypeKind;
    price: number;
    quantity: number;
    sold: number;
    reserved: number;
    minPerOrder: number;
    maxPerOrder: number;
};

export type TicketOrganizerView = {
    displayName: string;
    slug?: string;
    bio?: string | null;
    logoUrl?: string | null;
    contactEmail?: string | null;
    supportEmail?: string | null;
    contactPhone?: string | null;
    whatsapp?: string | null;
    timezone?: string | null;
};

export type TicketEventView = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: TicketEventStatus;
    modality: TicketEventModality;
    coverImageUrl: string | null;
    galleryImageUrls?: string[] | null;
    videoUrl?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    salesStartAt: string | null;
    salesEndAt: string | null;
    venueName: string;
    venueAddress: string;
    venueCommune: string | null;
    capacity: number | null;
    minAge: TicketMinAge;
    categories: TicketEventCategory[];
    currency: string;
    onlineAccessMode: TicketOnlineAccessMode | null;
    onlineAccessUrl: string | null;
    ticketsSold: number;
    grossSales: number;
    ticketTypes: TicketTicketTypeView[];
    organizer?: TicketOrganizerView | null;
};

export type TicketPublicEventsResponse = {
    ok: boolean;
    events: TicketEventView[];
};

export type TicketTicketTypeInput = {
    id?: string;
    name: string;
    description?: string;
    kind?: TicketTypeKind;
    price: number;
    quantity: number;
    minPerOrder?: number;
    maxPerOrder?: number;
};

export type CreateTicketEventInput = {
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    galleryImageUrls?: string[] | null;
    videoUrl?: string | null;
    modality: TicketEventModality;
    onlineAccessMode?: TicketOnlineAccessMode | null;
    onlineAccessUrl?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    salesStartAt?: string | null;
    salesEndAt?: string | null;
    venueName: string;
    venueAddress: string;
    venueCommune?: string | null;
    capacity?: number | null;
    minAge?: TicketMinAge;
    categories?: TicketEventCategory[];
    currency?: string;
    ticketTypes: TicketTicketTypeInput[];
};

export type UpdateTicketEventInput = Partial<CreateTicketEventInput> & {
    salesPaused?: boolean;
};

export type CancelTicketEventInput = {
    reason: string;
    confirm: true;
    refundPaidOrders: boolean;
};

export type TicketEventCancelSummary = {
    refundsApproved: number;
    freeOrdersVoided: number;
    pendingOrdersCancelled: number;
    refundsReview: number;
    skipped: unknown[];
};

export type TicketEventCancelResponse = {
    ok: true;
    event: TicketEventView;
    summary: TicketEventCancelSummary;
};

export type TicketsOverviewResponse = {
    ok: true;
    events: TicketEventView[];
    organizer: TicketOrganizerView;
    payment: { connected: boolean };
    runtime: { blockers: string[]; readyForPaidSales: boolean };
};

export type UpdateTicketOrganizerInput = Partial<{
    displayName: string;
    slug: string;
    bio: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
    supportEmail: string | null;
    contactPhone: string | null;
    whatsapp: string | null;
    timezone: string | null;
}>;

export type CreateTicketCheckoutInput = {
    buyerName: string;
    buyerEmail: string;
    buyerPhone?: string | null;
    idempotencyKey: string;
    items: Array<{ ticketTypeId: string; quantity: number }>;
};

export type TicketCheckoutResponse = {
    ok: true;
    checkoutUrl?: string | null;
    order: { publicId: string };
};

export type TicketOrderPublicView = {
    publicId: string;
    status: TicketOrderStatus;
    buyerName: string;
    subtotal: number;
    total: number;
    currency: string;
    event: {
        title: string;
        slug: string;
        timezone: string;
        startsAt: string;
        venueName: string;
    };
    tickets: Array<{
        code: string;
        ticketTypeName: string;
        attendeeName?: string | null;
    }>;
};

export type TicketSalesQuery = {
    q?: string;
    status?: TicketSalesStatusFilter;
    period?: TicketSalesPeriod;
    eventId?: string | null;
    cursor?: string | null;
    limit?: number;
};

export type TicketSaleOrderView = {
    publicId: string;
    createdAt: string;
    paidAt?: string | null;
    buyerName: string;
    buyerEmail: string;
    status: TicketOrderStatus;
    ticketCount: number;
    total: number;
    currency: string;
    providerFee?: number | null;
    netAmount?: number | null;
    providerPaymentId?: string | null;
    event: { title: string };
};

export type TicketSaleOrderDetail = TicketSaleOrderView & {
    buyerPhone?: string | null;
    platformFee: number;
    refundedAt?: string | null;
    items: Array<{
        id: string;
        name: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }>;
    refunds: Array<{
        id: string;
        amount: number;
        currency: string;
        reason: string;
        status: TicketRefundStatus;
        requestedAt: string;
        attempts: number;
        providerRefundId?: string | null;
        error?: string | null;
    }>;
    refundEligibility: {
        allowed: boolean;
        action?: 'retry' | string;
        reason?: string;
    };
    deliveries: Array<{
        id: string;
        recipient: string;
        createdAt: string;
        error?: string | null;
        reason: 'resend' | 'refund' | string;
        status: 'sent' | 'skipped' | 'failed';
    }>;
};

export type TicketSalesResponse = {
    ok: true;
    orders: TicketSaleOrderView[];
    nextCursor: string | null;
    summary: {
        paidGross: number;
        providerFees: number;
        netCollected: number;
        refundedTotal: number;
        paidOrders: number;
        paidTickets: number;
        reviewOrders: number;
        unknownProviderFeeOrders: number;
    };
};

export type TicketSaleOrderResponse = {
    ok: true;
    order: TicketSaleOrderDetail;
};

export type RefundTicketOrderInput = {
    reason: string;
    confirm: true;
};

export type TicketRefundOrderResponse = {
    ok: true;
    order: TicketSaleOrderDetail;
    refund: { status: TicketRefundStatus };
};

export type TicketAccessPointView = {
    id: string;
    name: string;
    status: 'active' | 'inactive';
};

export type CreateTicketAccessPointInput = {
    name: string;
};

export type UpdateTicketAccessPointInput = {
    name?: string;
    status?: 'active' | 'inactive';
};

export type TicketCheckinInput = {
    qrPayload: string;
    deviceId: string;
    accessPointId: string | null;
    idempotencyKey: string;
    scannedAt: string;
    source: TicketCheckinSource;
};

export type TicketCheckinView = {
    result: TicketCheckinResult;
    idempotencyKey: string;
    ticket: {
        attendeeName: string | null;
        ticketTypeName: string;
        code: string;
    } | null;
};

export type TicketAccessOverviewResponse = {
    ok: true;
    event: { startsAt: string; venueName: string };
    totals: { issued: number; admitted: number; remaining: number };
    recent: Array<{
        id: string;
        result: TicketCheckinResult;
        receivedAt: string;
        attendeeName?: string | null;
        code?: string | null;
        ticketTypeName?: string | null;
        accessPointName?: string | null;
    }>;
    accessPoints: TicketAccessPointView[];
};

export type TicketAttendeeView = {
    id: string;
    code: string;
    ticketTypeName: string;
    status: 'pending' | 'admitted' | 'void';
    attendeeName?: string | null;
    attendeeEmail?: string | null;
    checkedInAt?: string | null;
};

export type TicketAttendeesResponse = {
    ok: true;
    attendees: TicketAttendeeView[];
    nextCursor: string | null;
};

export type TicketAttendeeCheckinInput = {
    deviceId: string;
    accessPointId: string | null;
    idempotencyKey: string;
    scannedAt: string;
    source: 'attendee_list';
};

export const TICKET_EVENT_CATEGORY_OPTIONS: Array<{ value: TicketEventCategory; label: string }> = [
    { value: 'music', label: 'Música' },
    { value: 'party', label: 'Fiesta' },
    { value: 'theater', label: 'Teatro' },
    { value: 'comedy', label: 'Comedia' },
    { value: 'sports', label: 'Deporte' },
    { value: 'conference', label: 'Conferencia' },
    { value: 'workshop', label: 'Taller' },
    { value: 'festival', label: 'Festival' },
    { value: 'other', label: 'Otro' },
];

export const TICKET_MIN_AGE_PRESETS: Array<{ value: TicketMinAge; label: string }> = [
    { value: null, label: 'Libre' },
    { value: 14, label: '14+' },
    { value: 16, label: '16+' },
    { value: 18, label: '18+' },
    { value: 21, label: '21+' },
];

const CATEGORY_LABELS = Object.fromEntries(
    TICKET_EVENT_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export function formatTicketMinAge(minAge: TicketMinAge): string {
    if (minAge == null || minAge <= 0) return 'Sin restricción';
    return `${minAge}+`;
}

export function formatTicketEventCategories(categories: TicketEventCategory[] | null | undefined): string[] {
    if (!categories?.length) return [];
    return categories.map((value) => CATEGORY_LABELS[value] ?? value);
}

export function formatTicketCapacity(capacity: number | null | undefined): string {
    if (capacity == null) return 'Sin límite';
    return `${capacity} cupos`;
}
