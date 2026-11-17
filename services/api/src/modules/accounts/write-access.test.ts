import { describe, expect, it, vi } from 'vitest';
import {
    runAccountManagerWrite,
    runAccountMemberWrite,
    runAccountWorkspaceWrite,
} from './write-access.js';

function makeDb(...lockedRows: unknown[]) {
    const forUpdate = vi.fn();
    for (const row of lockedRows) {
        forUpdate.mockResolvedValueOnce(row ? [row] : []);
    }

    const tx = {
        select: vi.fn(() => ({
            from: () => ({
                where: () => ({
                    limit: () => ({ for: forUpdate }),
                }),
            }),
        })),
    };
    const db = {
        transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };

    return { db, tx, forUpdate };
}

describe('account workspace write authorization', () => {
    it.each(['owner', 'admin'])('%s can make a manager write in the active workspace', async (role) => {
        const { db, tx, forUpdate } = makeDb(
            { role, isDefault: true },
            { id: 'account-1' },
        );
        const write = vi.fn(async () => 'saved');

        const result = await runAccountManagerWrite(db, { userId: 'user-1', accountId: 'account-1' }, write);

        expect(result).toEqual({ ok: true, value: 'saved' });
        expect(write).toHaveBeenCalledWith(tx);
        expect(forUpdate).toHaveBeenNthCalledWith(1, 'update');
        expect(forUpdate).toHaveBeenNthCalledWith(2, 'update');
    });

    it('lets an agent use member actions but denies manager actions', async () => {
        const memberDb = makeDb({ role: 'agent', isDefault: true }, { id: 'account-1' });
        const memberWrite = vi.fn(async (_tx, role) => role);
        const memberResult = await runAccountMemberWrite(
            memberDb.db,
            { userId: 'agent-1', accountId: 'account-1' },
            memberWrite,
        );

        expect(memberResult).toEqual({ ok: true, value: 'agent', role: 'agent' });
        expect(memberWrite).toHaveBeenCalledOnce();

        const managerDb = makeDb({ role: 'agent', isDefault: true }, { id: 'account-1' });
        const managerWrite = vi.fn(async () => 'must not run');
        const managerResult = await runAccountManagerWrite(
            managerDb.db,
            { userId: 'agent-1', accountId: 'account-1' },
            managerWrite,
        );

        expect(managerResult).toEqual({ ok: false });
        expect(managerWrite).not.toHaveBeenCalled();
        expect(managerDb.forUpdate).toHaveBeenCalledOnce();
    });

    it('requires the selected workspace to be the member default and still exist', async () => {
        const notSelected = makeDb({ role: 'owner', isDefault: false }, { id: 'account-1' });
        const write = vi.fn(async () => 'saved');
        expect(await runAccountWorkspaceWrite(
            notSelected.db,
            { userId: 'owner-1', accountId: 'account-1' },
            () => true,
            write,
        )).toEqual({ ok: false });
        expect(notSelected.forUpdate).toHaveBeenCalledOnce();
        expect(write).not.toHaveBeenCalled();

        const missingAccount = makeDb({ role: 'owner', isDefault: true }, null);
        expect(await runAccountWorkspaceWrite(
            missingAccount.db,
            { userId: 'owner-1', accountId: 'account-1' },
            () => true,
            write,
        )).toEqual({ ok: false });
        expect(missingAccount.forUpdate).toHaveBeenCalledTimes(2);
    });

    it('does not open a transaction without an account id', async () => {
        const { db } = makeDb();
        const write = vi.fn(async () => 'saved');

        expect(await runAccountWorkspaceWrite(db, { userId: 'owner-1', accountId: null }, () => true, write))
            .toEqual({ ok: false });
        expect(db.transaction).not.toHaveBeenCalled();
        expect(write).not.toHaveBeenCalled();
    });
});
