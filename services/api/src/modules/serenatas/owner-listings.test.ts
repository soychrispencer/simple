import { describe, expect, it } from 'vitest';
import { ADMIN_MARKETPLACE_INBOX_STATUSES } from './marketplace.js';

describe('owner solicitudes inbox', () => {
    it('listOwnerMarketplaceSerenatas no incluye scheduled ni completed', () => {
        expect(ADMIN_MARKETPLACE_INBOX_STATUSES).not.toContain('scheduled');
        expect(ADMIN_MARKETPLACE_INBOX_STATUSES).not.toContain('completed');
        expect(ADMIN_MARKETPLACE_INBOX_STATUSES).toContain('pending');
        expect(ADMIN_MARKETPLACE_INBOX_STATUSES).toContain('accepted_pending_group');
    });
});
