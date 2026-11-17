import { describe, expect, it } from 'vitest';
import { canManageAccountRole, isAccountMemberRole, isAccountOwnerRole } from './permissions.js';

describe('account role permissions', () => {
    it.each(['owner', 'admin'])('%s can manage its workspace', (role) => {
        expect(canManageAccountRole(role)).toBe(true);
        expect(isAccountMemberRole(role)).toBe(true);
    });

    it('agents are members but cannot manage the workspace', () => {
        expect(isAccountMemberRole('agent')).toBe(true);
        expect(canManageAccountRole('agent')).toBe(false);
        expect(isAccountOwnerRole('agent')).toBe(false);
    });

    it.each(['user', 'superadmin', 'unknown', null, undefined])('does not grant workspace access to global or invalid role %s', (role) => {
        expect(canManageAccountRole(role)).toBe(false);
        expect(isAccountMemberRole(role)).toBe(false);
        expect(isAccountOwnerRole(role)).toBe(false);
    });

    it('only the owner can transfer or remove ownership', () => {
        expect(isAccountOwnerRole('owner')).toBe(true);
        expect(isAccountOwnerRole('admin')).toBe(false);
    });
});
