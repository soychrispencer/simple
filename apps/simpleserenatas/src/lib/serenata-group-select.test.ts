import { describe, expect, it } from 'vitest';
import type { SerenataGroup } from '@/lib/serenatas-api';
import { selectableMusicianGroups } from './serenata-group-select';

function group(partial: Partial<SerenataGroup> & Pick<SerenataGroup, 'id' | 'name'>): SerenataGroup {
    return {
        ownerId: 'o1',
        providerGroupId: null,
        date: '',
        status: 'draft',
        maxMusicians: null,
        members: [],
        pendingInvites: [],
        ...partial,
    };
}

describe('selectableMusicianGroups', () => {
    const groups = [
        group({ id: 'g1', name: 'Trío A', providerGroupId: 'm1', status: 'draft' }),
        group({ id: 'g2', name: 'Trío B', providerGroupId: 'm1', status: 'draft' }),
        group({ id: 'g3', name: 'Auto evento', providerGroupId: 'm1', status: 'active', date: '2026-05-28' }),
        group({ id: 'g4', name: 'Otro mariachi', providerGroupId: 'm2', status: 'draft' }),
        group({ id: 'g5', name: 'Legacy sin mariachi', providerGroupId: null, status: 'draft' }),
    ];

    it('solo borradores del mariachi de la solicitud', () => {
        const result = selectableMusicianGroups(groups, { providerGroupId: 'm1' });
        expect(result.map((entry) => entry.id)).toEqual(['g1', 'g2']);
    });

    it('mantiene grupo ya asignado aunque esté activo', () => {
        const result = selectableMusicianGroups(groups, {
            providerGroupId: 'm1',
            assignedGroupId: 'g3',
        });
        expect(result.map((entry) => entry.id)).toEqual(['g3', 'g1', 'g2']);
    });
});
