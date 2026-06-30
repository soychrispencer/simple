'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createAgendaLocation,
    deleteAgendaLocation,
    fetchAgendaLocations,
    saveAgendaProfile,
    updateAgendaLocation,
    type AgendaLocation,
} from '@/lib/agenda-api';
import {
    agendaLocationToAddressBookEntry,
    agendaPayloadFromDraft,
} from '@/lib/agenda-location-address-adapter';
import { agendaBusinessLocationToProfilePayload } from '@/components/panel/agenda-business-location-fields';
import { AddressBookManager, useGoogleMapsBrowserKey, type AddressBookManagerSubmitInput } from '@simple/ui/address-book';
import { PanelNotice } from '@simple/ui/panel';
import {
    AGENDA_LOCATIONS_CHANGED_EVENT,
    dispatchAgendaLocationsChanged,
    getCommunesForRegion,
    LOCATION_REGIONS,
    structuredLocationFromAddressBookEntry,
} from '@simple/utils';

function structuredLocationFromAgendaLocation(location: AgendaLocation) {
    return structuredLocationFromAddressBookEntry(agendaLocationToAddressBookEntry(location));
}

async function syncAgendaProfileFromDefaultLocation(defaultLocation: AgendaLocation) {
    await saveAgendaProfile({
        ...agendaBusinessLocationToProfilePayload(structuredLocationFromAgendaLocation(defaultLocation)),
        address: defaultLocation.isActive ? defaultLocation.addressLine : null,
    });
}

export function AgendaBusinessLocationsContent() {
    const googleMapsApiKey = useGoogleMapsBrowserKey();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [entries, setEntries] = useState(() => [] as ReturnType<typeof agendaLocationToAddressBookEntry>[]);
    const [featuredOnProfileId, setFeaturedOnProfileId] = useState<string | null>(null);

    const loadLocations = useCallback(async () => {
        const items = await fetchAgendaLocations();
        const mapped = items.map(agendaLocationToAddressBookEntry);
        setEntries(mapped);
        const defaultLocation = items.find((item) => item.isDefault) ?? null;
        setFeaturedOnProfileId(defaultLocation?.isActive ? defaultLocation.id : null);
        setLoading(false);
        return items;
    }, []);

    useEffect(() => {
        void loadLocations();
    }, [loadLocations]);

    const regions = useMemo(
        () => LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name })),
        [],
    );
    const getCommunes = useCallback(
        (regionId: string) => getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name })),
        [],
    );

    const onSaveEntry = useCallback(async (draft: AddressBookManagerSubmitInput) => {
        const payload = agendaPayloadFromDraft(draft);
        if (!payload.name) {
            setMessage('El nombre de la dirección es obligatorio.');
            return false;
        }
        if (!payload.addressLine) {
            setMessage('La dirección es obligatoria.');
            return false;
        }

        setSaving(true);
        setMessage(null);
        const result = draft.id
            ? await updateAgendaLocation(draft.id, payload)
            : await createAgendaLocation(payload);
        setSaving(false);

        if (!result.ok) {
            setMessage(result.error ?? 'No se pudo guardar la dirección.');
            return false;
        }

        const items = await loadLocations();
        if (draft.isDefault) {
            const defaultLocation = items.find((item) => item.isDefault);
            if (defaultLocation) {
                await syncAgendaProfileFromDefaultLocation(defaultLocation);
            }
        }
        dispatchAgendaLocationsChanged();
        setMessage(draft.id ? 'Dirección actualizada.' : 'Dirección agregada.');
        return true;
    }, [loadLocations]);

    const onDeleteEntry = useCallback(async (entryId: string) => {
        const entry = entries.find((item) => item.id === entryId);
        if (!entry) return;
        if (!window.confirm(`¿Eliminar «${entry.label}»?`)) return;

        setDeletingId(entryId);
        setMessage(null);
        const result = await deleteAgendaLocation(entryId);
        setDeletingId(null);

        if (!result.ok) {
            setMessage('No se pudo eliminar la dirección.');
            return;
        }

        await loadLocations();
        dispatchAgendaLocationsChanged();
        setMessage('Dirección eliminada.');
    }, [entries, loadLocations]);

    const noticeTone = message?.toLowerCase().includes('no se pudo') || message?.includes('obligator')
        ? 'error'
        : 'success';

    return (
        <div className="grid gap-5">
            <AddressBookManager
                showHeader={false}
                googleMapsApiKey={googleMapsApiKey}
                entries={entries}
                regions={regions}
                getCommunes={getCommunes}
                loading={loading}
                saving={saving}
                deletingId={deletingId}
                onSaveEntry={onSaveEntry}
                onDeleteEntry={onDeleteEntry}
                defaultKind="clinic"
                defaultPublicVisible
                featuredOnProfileId={featuredOnProfileId}
                profileBadgeLabel="En ficha"
                showInactiveBadge
                inactiveBadgeLabel="Inactiva"
            />
            {message ? <PanelNotice tone={noticeTone}>{message}</PanelNotice> : null}
        </div>
    );
}
