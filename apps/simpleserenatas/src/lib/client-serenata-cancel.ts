import type { Serenata } from '@/lib/serenatas-api';

/** Estados en los que el cliente puede anular/cancelar por su cuenta. */
export const CLIENT_CANCELABLE_STATUSES = ['payment_pending', 'pending', 'pending_open'] as const;

export type ClientCancelableStatus = (typeof CLIENT_CANCELABLE_STATUSES)[number];

export function canClientCancelSerenata(item: Pick<Serenata, 'status'>): boolean {
    return CLIENT_CANCELABLE_STATUSES.includes(item.status as ClientCancelableStatus);
}

/** Sin pago aún: anular borrador. Con pago: cancelación con motivo. */
export function isClientUnpaidDraft(item: Pick<Serenata, 'status'>): boolean {
    return item.status === 'payment_pending';
}

export function clientCancelRequiresReason(item: Pick<Serenata, 'status' | 'paymentStatus'>): boolean {
    if (isClientUnpaidDraft(item)) return false;
    return item.paymentStatus === 'paid';
}

export function clientCancelActionLabel(item: Pick<Serenata, 'status'>): string {
    return isClientUnpaidDraft(item) ? 'Anular solicitud' : 'Cancelar solicitud';
}

export function clientCancelConfirmCopy(item: Pick<Serenata, 'status' | 'paymentStatus'>): {
    title: string;
    message: string;
    confirmLabel: string;
} {
    if (isClientUnpaidDraft(item)) {
        return {
            title: 'Anular solicitud',
            message:
                'Descartarás esta solicitud. No se realizó ningún cobro. Podrás contratar de nuevo cuando quieras.',
            confirmLabel: 'Anular',
        };
    }
    return {
        title: 'Cancelar solicitud',
        message:
            'Cancelarás una solicitud ya pagada. El mariachi será notificado. Si corresponde un reembolso, te contactaremos según la política de la plataforma.',
        confirmLabel: 'Continuar',
    };
}

export function clientCancelSheetDescription(item: Pick<Serenata, 'status'>): string {
    if (item.status === 'pending_open') {
        return 'El mariachi aún no confirmó el horario. Indica por qué cancelas para dejar registro de la solicitud.';
    }
    return 'El mariachi puede estar revisando tu pedido. Indica por qué cancelas; quedará registrado en la solicitud.';
}
