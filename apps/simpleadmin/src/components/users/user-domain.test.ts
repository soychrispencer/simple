import { describe, expect, it } from 'vitest';
import { capabilitiesFor, getSubscriptionSummary, statusLabel, verticalLabel } from './user-domain';

describe('user domain', () => {
    it('keeps unrestricted access focused on the superadmin', () => {
        const capabilities = capabilitiesFor({ id: 'owner', email: 'owner@example.com', name: 'Owner', role: 'superadmin', status: 'verified' });
        expect(Object.values(capabilities).every(Boolean)).toBe(true);

        const adminCapabilities = capabilitiesFor({ id: 'admin', email: 'admin@example.com', name: 'Admin', role: 'admin', status: 'verified' });
        expect(Object.values(adminCapabilities).some(Boolean)).toBe(false);
    });

    it('provides concise labels and typed subscription summaries', () => {
        expect(statusLabel('verified')).toBe('Verificado');
        expect(verticalLabel('serenatas')).toBe('SimpleSerenatas');
        expect(getSubscriptionSummary({ subscriptions: { agenda: { plan: 'pro', status: 'active', expiresAt: null } } } as never, 'agenda')).toBe('pro · active');
    });
});
