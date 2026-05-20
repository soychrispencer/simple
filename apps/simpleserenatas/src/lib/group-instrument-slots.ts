import type { SerenataGroup, SerenataGroupMember } from '@/lib/serenatas-api';

export type GroupInstrumentSlot = {
    index: number;
    instrument: string;
    member: SerenataGroupMember | null;
};

const ACTIVE_MEMBER_STATUSES: SerenataGroupMember['status'][] = ['accepted', 'invited'];

export function groupRequiredInstruments(group: Pick<SerenataGroup, 'requiredInstruments' | 'maxMusicians'>): string[] {
    const configured = (group.requiredInstruments ?? []).map((item) => item.trim()).filter(Boolean);
    if (configured.length > 0) return configured;
    const capacity = Math.max(1, Math.min(40, group.maxMusicians ?? 3));
    return Array.from({ length: capacity }, (_, index) => `Músico ${index + 1}`);
}

export function groupCapacityFromInstruments(group: Pick<SerenataGroup, 'requiredInstruments' | 'maxMusicians'>): number {
    return groupRequiredInstruments(group).length;
}

function isActiveMember(member: SerenataGroupMember): boolean {
    return ACTIVE_MEMBER_STATUSES.includes(member.status);
}

export function buildGroupInstrumentSlots(group: SerenataGroup): GroupInstrumentSlot[] {
    const instruments = groupRequiredInstruments(group);
    const slotMembers: Array<SerenataGroupMember | null> = instruments.map(() => null);
    const unassigned: SerenataGroupMember[] = [];

    for (const member of group.members.filter(isActiveMember)) {
        if (
            member.slotIndex != null
            && member.slotIndex >= 0
            && member.slotIndex < instruments.length
            && !slotMembers[member.slotIndex]
        ) {
            slotMembers[member.slotIndex] = member;
        } else {
            unassigned.push(member);
        }
    }

    for (const member of unassigned) {
        const firstEmpty = slotMembers.findIndex((entry) => !entry);
        if (firstEmpty >= 0) slotMembers[firstEmpty] = member;
    }

    return instruments.map((instrument, index) => ({
        index,
        instrument,
        member: slotMembers[index],
    }));
}
