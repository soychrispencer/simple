import { describe, expect, it } from 'vitest';
import type { Serenata } from '@/lib/serenatas-api';
import {
    compareSolicitudesByUrgency,
    formatSolicitudDuration,
    getSolicitudWaitState,
    pickMostUrgentSolicitudId,
} from './solicitud-wait-time';

function pendingItem(partial: Partial<Serenata> = {}): Serenata {
    return {
        id: 's1',
        clientId: 'c1',
        ownerId: 'o1',
        providerGroupId: 'pg1',
        selectedServiceId: null,
        groupId: null,
        source: 'platform_lead',
        status: 'pending',
        recipientName: 'Juan',
        clientPhone: null,
        address: 'Calle 1',
        comuna: 'Santiago',
        region: 'RM',
        lat: null,
        lng: null,
        eventDate: '2026-05-28',
        eventTime: '09:00',
        duration: 45,
        price: 45000,
        packageCode: null,
        eventType: 'Serenata',
        message: null,
        paidAt: '2026-05-26T10:00:00.000Z',
        responseDueAt: '2026-05-26T12:00:00.000Z',
        offerStatus: 'offered',
        ...partial,
    };
}

describe('solicitud-wait-time', () => {
    it('formatea duración mm:ss', () => {
        expect(formatSolicitudDuration(125_000)).toBe('2:05');
    });

    it('calcula espera y plazo restante', () => {
        const now = Date.parse('2026-05-26T10:30:00.000Z');
        const state = getSolicitudWaitState(pendingItem(), now);
        expect(state?.elapsedLabel).toBe('30:00');
        expect(state?.remainingLabel).toBe('1:30:00');
        expect(state?.urgency).toBe('ok');
    });

    it('marca urgencia cuando el plazo venció', () => {
        const now = Date.parse('2026-05-26T13:00:00.000Z');
        const state = getSolicitudWaitState(pendingItem(), now);
        expect(state?.urgency).toBe('danger');
        expect(state?.remainingMs).toBe(0);
    });

    it('ordena por urgencia (plazo vencido primero)', () => {
        const now = Date.parse('2026-05-26T11:00:00.000Z');
        const fresh = pendingItem({ id: 'fresh', paidAt: '2026-05-26T10:55:00.000Z', responseDueAt: '2026-05-26T14:00:00.000Z' });
        const overdue = pendingItem({ id: 'overdue', paidAt: '2026-05-26T08:00:00.000Z', responseDueAt: '2026-05-26T10:30:00.000Z' });
        expect(compareSolicitudesByUrgency(overdue, fresh, now)).toBeLessThan(0);
        expect(pickMostUrgentSolicitudId([fresh, overdue], now)).toBe('overdue');
    });
});
