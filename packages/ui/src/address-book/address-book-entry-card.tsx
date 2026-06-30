'use client';

import type { AddressBookEntry } from '@simple/types';
import { PanelButton } from '../panel/panel-button';
import { addressSummary } from '../location/location-shared';

export type AddressBookEntryCardProps = {
    entry: AddressBookEntry;
    isEditing?: boolean;
    /** Dirección predeterminada enlazada a la ficha pública (primaryAddressId o equivalente). */
    featuredOnProfile?: boolean;
    /** Cuando la dirección está desactivada u oculta (p. ej. agenda inactiva). */
    dimmed?: boolean;
    defaultBadgeLabel?: string;
    profileBadgeLabel?: string;
    inactiveBadgeLabel?: string;
    saving?: boolean;
    deletingId?: string | null;
    onEdit: () => void;
    onMakeDefault?: () => void;
    onDelete: () => void;
};

export function AddressBookEntryCard({
    entry,
    isEditing = false,
    featuredOnProfile = false,
    dimmed = false,
    defaultBadgeLabel = 'Predeterminada',
    profileBadgeLabel = 'En ficha',
    inactiveBadgeLabel = 'Inactiva',
    saving = false,
    deletingId = null,
    onEdit,
    onMakeDefault,
    onDelete,
}: AddressBookEntryCardProps) {
    const isDeleting = deletingId === entry.id;

    return (
        <div
            className="rounded-card border p-4 transition-colors"
            style={{
                borderColor: isEditing ? 'var(--fg)' : 'var(--border)',
                background: isEditing ? 'var(--bg-subtle)' : 'var(--bg)',
                opacity: dimmed ? 0.65 : 1,
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{entry.label}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {[entry.communeName, entry.regionName].filter(Boolean).join(' · ') || 'Sin comuna'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {entry.isDefault ? (
                        <span
                            className="rounded-full px-2 py-1 text-[11px] font-medium"
                            style={{
                                background: featuredOnProfile ? 'var(--accent-soft)' : 'var(--bg-muted)',
                                color: featuredOnProfile ? 'var(--accent)' : 'var(--fg-secondary)',
                            }}
                        >
                            {featuredOnProfile ? `${defaultBadgeLabel} · ${profileBadgeLabel}` : defaultBadgeLabel}
                        </span>
                    ) : featuredOnProfile ? (
                        <span
                            className="rounded-full px-2 py-1 text-[11px] font-medium"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            {profileBadgeLabel}
                        </span>
                    ) : dimmed ? (
                        <span
                            className="rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                        >
                            {inactiveBadgeLabel}
                        </span>
                    ) : null}
                </div>
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                {[entry.addressLine1, entry.addressLine2].filter(Boolean).join(', ') || addressSummary(entry)}
            </p>
            {entry.arrivalInstructions ? (
                <p className="mt-2 text-xs italic" style={{ color: 'var(--fg-muted)' }}>{entry.arrivalInstructions}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
                <PanelButton type="button" variant="secondary" size="sm" onClick={onEdit}>
                    Editar
                </PanelButton>
                {!entry.isDefault && onMakeDefault ? (
                    <PanelButton type="button" variant="secondary" size="sm" onClick={onMakeDefault} disabled={saving}>
                        Predeterminar
                    </PanelButton>
                ) : null}
                <PanelButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </PanelButton>
            </div>
        </div>
    );
}
