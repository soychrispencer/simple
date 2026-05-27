import type { Serenata, SerenataGroup } from '@/lib/serenatas-api';

/** Normaliza fecha de serenata/grupo a YYYY-MM-DD. */
export function serenataGroupEventYmd(value: string | null | undefined): string {
    if (!value) return '';
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

export type SerenataGroupSelectScope = {
    providerGroupId?: string | null;
    assignedGroupId?: string | null;
};

/**
 * Grupos elegibles al asignar una serenata (Solicitudes / editar).
 * Solo borradores del mariachi de la solicitud — los mismos que gestionas en Mi negocio → Grupos.
 * Si ya hay un grupo asignado (p. ej. activo), se mantiene en la lista para no perder la selección.
 */
export function selectableMusicianGroups(
    groups: SerenataGroup[],
    scope: SerenataGroupSelectScope,
): SerenataGroup[] {
    const { providerGroupId, assignedGroupId } = scope;
    return groups
        .filter((group) => {
            if (assignedGroupId && group.id === assignedGroupId) return true;
            if (group.status !== 'draft') return false;
            if (providerGroupId) {
                return group.providerGroupId === providerGroupId;
            }
            return !group.providerGroupId;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function selectableMusicianGroupsForSerenata(item: Serenata, groups: SerenataGroup[]): SerenataGroup[] {
    return selectableMusicianGroups(groups, {
        providerGroupId: item.providerGroupId,
        assignedGroupId: item.groupId,
    });
}

export function formatSerenataGroupDateLabel(value: string) {
    const ymd = serenataGroupEventYmd(value);
    if (!ymd) return value;
    const date = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(date);
}

export function buildSerenataGroupSelectOptions(item: Serenata, groups: SerenataGroup[]) {
    return buildSerenataGroupSelectOptionsForScope(
        groups,
        { providerGroupId: item.providerGroupId, assignedGroupId: item.groupId },
    );
}

export function buildSerenataGroupSelectOptionsForScope(
    groups: SerenataGroup[],
    scope: SerenataGroupSelectScope,
) {
    return [
        { value: '', label: 'Sin grupo (asignar después)' },
        ...selectableMusicianGroups(groups, scope).map((group) => {
            const memberCount = group.members.filter((member) =>
                member.status === 'accepted' || member.status === 'invited',
            ).length;
            const dateSuffix = group.date ? ` · ${formatSerenataGroupDateLabel(group.date)}` : '';
            return {
                value: group.id,
                label: `${group.name} · ${memberCount} músicos${dateSuffix}`,
            };
        }),
    ];
}
