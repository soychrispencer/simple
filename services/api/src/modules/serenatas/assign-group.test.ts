import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    assertMusicianGroupMariachiMatch,
    assertProviderRosterComplete,
    assignSerenataMusicianGroup,
} from './assign-group.js';

describe('assertMusicianGroupMariachiMatch', () => {
    it('permite grupo legacy sin provider_group_id', () => {
        expect(assertMusicianGroupMariachiMatch('pg-1', null)).toBeNull();
    });

    it('rechaza grupo de otro mariachi', () => {
        expect(assertMusicianGroupMariachiMatch('pg-1', 'pg-2')).toMatch(/mariachi/i);
    });
});

describe('assertProviderRosterComplete', () => {
    it('acepta cuando todos los músicos están en el grupo', () => {
        expect(assertProviderRosterComplete(['m1', 'm2'], ['m1', 'm2', 'm3'])).toBeNull();
    });

    it('rechaza músicos fuera del mariachi', () => {
        expect(assertProviderRosterComplete(['m1', 'm9'], ['m1'])).toMatch(/mariachi/i);
    });
});

const mockFindFirstSerenata = vi.fn();
const mockFindFirstGroup = vi.fn();
const mockFindFirstService = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('./availability.js', () => ({
    validateGroupForSerenata: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../lib/platform-in-app-notifications.js', () => ({
    insertInAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

function buildTx() {
    return {
        query: {
            serenatas: { findFirst: mockFindFirstSerenata },
            serenataGroups: { findFirst: mockFindFirstGroup },
            serenataGroupServices: { findFirst: mockFindFirstService },
            serenataClients: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
    };
}

function mockSelectChain(responses: unknown[][]) {
    let index = 0;
    mockSelect.mockImplementation(() => {
        const data = responses[index] ?? [];
        index += 1;
        const rows = Promise.resolve(data);
        return {
            from: () => ({
                where: () => Object.assign(rows, { limit: () => rows }),
            }),
        };
    });
}

describe('assignSerenataMusicianGroup (marketplace)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindFirstSerenata.mockResolvedValue({
            id: 'ser-1',
            ownerId: 'owner-1',
            providerGroupId: 'pg-1',
            selectedServiceId: 'svc-1',
            packageCode: null,
            status: 'accepted_pending_group',
            recipientName: 'Ana',
            eventDate: new Date('2026-06-15T20:00:00.000Z'),
            eventTime: '20:00',
            duration: 45,
            clientId: null,
        });
        mockFindFirstService.mockResolvedValue({ musiciansCount: 3 });
        mockInsert.mockReturnValue({
            values: () => ({
                returning: () => Promise.resolve([{
                    id: 'musician-group-1',
                    ownerId: 'owner-1',
                    providerGroupId: 'pg-1',
                    name: 'Grupo evento',
                    date: new Date('2026-06-15T20:00:00.000Z'),
                    status: 'active',
                }]),
                onConflictDoUpdate: () => ({ returning: () => Promise.resolve([]) }),
                onConflictDoNothing: () => Promise.resolve(undefined),
            }),
        });
        mockUpdate.mockReturnValue({
            set: () => ({
                where: () => ({
                    returning: () => Promise.resolve([{
                        id: 'ser-1',
                        status: 'scheduled',
                        groupId: 'musician-group-1',
                        providerGroupId: 'pg-1',
                    }]),
                }),
            }),
        });
    });

    it('crea grupo de músicos vinculado al provider_group y valida integrantes', async () => {
        mockSelectChain([
            [],
            [],
            [{ musicianId: 'm1' }, { musicianId: 'm2' }, { musicianId: 'm3' }],
            [
                { id: 'm1', userId: 'u1', instrument: 'guitarra' },
                { id: 'm2', userId: 'u2', instrument: 'voz' },
                { id: 'm3', userId: 'u3', instrument: 'trompeta' },
            ],
        ]);

        const result = await assignSerenataMusicianGroup(buildTx() as never, {
            ownerId: 'owner-1',
            serenataId: 'ser-1',
            input: {
                mode: 'new',
                name: 'Grupo evento',
                musicianIds: ['m1', 'm2', 'm3'],
                message: 'Nos vemos',
            },
            requiredMusiciansForPackage: () => 0,
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.group.providerGroupId).toBe('pg-1');
            expect(result.item.status).toBe('scheduled');
        }
        expect(mockInsert).toHaveBeenCalled();
    });

    it('rechaza músicos fuera del mariachi activo', async () => {
        mockSelectChain([
            [],
            [{ musicianId: 'm1' }],
        ]);

        const result = await assignSerenataMusicianGroup(buildTx() as never, {
            ownerId: 'owner-1',
            serenataId: 'ser-1',
            input: { mode: 'new', musicianIds: ['m1', 'm2'] },
            requiredMusiciansForPackage: () => 0,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toMatch(/mariachi/i);
            expect(result.status).toBe(409);
        }
    });
});
