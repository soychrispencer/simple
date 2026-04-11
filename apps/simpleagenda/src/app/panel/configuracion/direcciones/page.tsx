'use client';

import { useEffect, useRef, useState } from 'react';
import {
    IconPlus,
    IconTrash,
    IconLoader2,
    IconEdit,
    IconMapPin,
    IconStar,
    IconStarFilled,
    IconAlertCircle,
    IconExternalLink,
    IconSearch,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
} from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import {
    fetchAgendaLocations,
    createAgendaLocation,
    updateAgendaLocation,
    deleteAgendaLocation,
    type AgendaLocation,
} from '@/lib/agenda-api';

// ── Google Places helpers ─────────────────────────────────────────────────────

type GPlace = {
    address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
    formatted_address?: string;
    geometry?: { location?: { lat?: () => number; lng?: () => number } };
    name?: string;
};

function normalizeStr(s: string | null | undefined) {
    return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getComponent(place: GPlace, types: string[]) {
    return place.address_components?.find(
        (c) => Array.isArray(c.types) && types.every((t) => c.types?.includes(t))
    ) ?? null;
}

function loadGoogleScript(apiKey: string): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    const g = (window as any).google;
    if (g?.maps?.places?.Autocomplete) return Promise.resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places-script="true"]');
    return new Promise((resolve) => {
        if (existing) {
            existing.addEventListener('load', () => resolve(!!(window as any).google?.maps?.places?.Autocomplete), { once: true });
            existing.addEventListener('error', () => resolve(false), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=es&region=CL&loading=async`;
        script.async = true;
        script.defer = true;
        script.dataset.googlePlacesScript = 'true';
        script.onload = () => resolve(!!(window as any).google?.maps?.places?.Autocomplete);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LocationForm = {
    name: string;
    addressLine: string;
    regionId: string;
    regionName: string;
    communeId: string;
    communeName: string;
    notes: string;
    googleMapsUrl: string;
    isDefault: boolean;
};

const emptyForm = (): LocationForm => ({
    name: '',
    addressLine: '',
    regionId: '',
    regionName: '',
    communeId: '',
    communeName: '',
    notes: '',
    googleMapsUrl: '',
    isDefault: false,
});

const regionOptions = LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }));

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DireccionesConfigPage() {
    const [locations, setLocations] = useState<AgendaLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<LocationForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [autocompleteReady, setAutocompleteReady] = useState(false);

    const addressInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const formRef = useRef(form);
    const addressKeyRef = useRef(0);

    useEffect(() => { formRef.current = form; }, [form]);

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        if (!showForm) return;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
            || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            || '';
        if (!apiKey || !addressInputRef.current) { setAutocompleteReady(false); return; }

        let disposed = false;
        void loadGoogleScript(apiKey).then((ready) => {
            if (disposed || !ready || !addressInputRef.current) { setAutocompleteReady(false); return; }
            const googleMaps = (window as any).google?.maps;
            if (!googleMaps?.places?.Autocomplete) { setAutocompleteReady(false); return; }

            if (autocompleteRef.current && googleMaps.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }

            const ac = new googleMaps.places.Autocomplete(addressInputRef.current, {
                componentRestrictions: { country: 'cl' },
                fields: ['address_components', 'formatted_address', 'geometry', 'name'],
                types: ['address'],
            });

            ac.addListener('place_changed', () => {
                const place = ac.getPlace?.() as GPlace | undefined;
                if (!place) return;

                const streetNum = getComponent(place, ['street_number'])?.long_name ?? '';
                const route = getComponent(place, ['route'])?.long_name ?? '';
                const addressLine = [route, streetNum].filter(Boolean).join(' ').trim()
                    || place.name
                    || place.formatted_address
                    || '';

                const regionNameFromPlace = getComponent(place, ['administrative_area_level_1'])?.long_name ?? '';
                const communeNameFromPlace =
                    getComponent(place, ['administrative_area_level_3'])?.long_name
                    ?? getComponent(place, ['locality'])?.long_name
                    ?? getComponent(place, ['administrative_area_level_2'])?.long_name
                    ?? '';

                const matchedRegion = regionNameFromPlace
                    ? LOCATION_REGIONS.find((r) => normalizeStr(r.name) === normalizeStr(regionNameFromPlace))
                    : null;

                const communes = matchedRegion ? getCommunesForRegion(matchedRegion.id) : [];
                const matchedCommune = communeNameFromPlace
                    ? communes.find((c) => normalizeStr(c.name) === normalizeStr(communeNameFromPlace))
                    : null;

                const mapsUrl = place.geometry?.location?.lat && place.geometry?.location?.lng
                    ? `https://www.google.com/maps?q=${place.geometry.location.lat()},${place.geometry.location.lng()}`
                    : formRef.current.googleMapsUrl;

                setForm((prev) => ({
                    ...prev,
                    addressLine,
                    regionId: matchedRegion?.id ?? prev.regionId,
                    regionName: matchedRegion?.name ?? regionNameFromPlace,
                    communeId: matchedCommune?.id ?? prev.communeId,
                    communeName: matchedCommune?.name ?? communeNameFromPlace,
                    googleMapsUrl: mapsUrl,
                }));
            });

            autocompleteRef.current = ac;
            setAutocompleteReady(true);
        });

        return () => {
            disposed = true;
            const googleMaps = (window as any).google?.maps;
            if (autocompleteRef.current && googleMaps?.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showForm]);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaLocations();
        setLocations(data);
        setLoading(false);
    };

    const set = <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const communeOptions = form.regionId
        ? getCommunesForRegion(form.regionId).map((c) => ({ value: c.id, label: c.name }))
        : [];

    const handleNew = () => {
        setEditingId(null);
        setForm(emptyForm());
        setError('');
        setShowForm(true);
    };

    const handleEdit = (location: AgendaLocation) => {
        setEditingId(location.id);
        const regionId = LOCATION_REGIONS.find((r) => r.name === location.region)?.id ?? '';
        const communes = regionId ? getCommunesForRegion(regionId) : [];
        const communeId = communes.find((c) => c.name === location.city)?.id ?? '';
        addressKeyRef.current += 1;
        setForm({
            name: location.name,
            addressLine: location.addressLine,
            regionId,
            regionName: location.region ?? '',
            communeId,
            communeName: location.city ?? '',
            notes: location.notes ?? '',
            googleMapsUrl: location.googleMapsUrl ?? '',
            isDefault: location.isDefault,
        });
        setError('');
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        addressKeyRef.current += 1;
        setForm(emptyForm());
        setError('');
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('El nombre de la consulta es requerido.'); return; }
        if (!form.addressLine.trim()) { setError('La dirección es requerida.'); return; }
        setSaving(true);
        setError('');
        const body = {
            name: form.name.trim(),
            addressLine: form.addressLine.trim(),
            region: form.regionName || form.regionId || null,
            city: form.communeName || null,
            notes: form.notes || null,
            googleMapsUrl: form.googleMapsUrl || null,
            isDefault: form.isDefault,
        };
        const result = editingId
            ? await updateAgendaLocation(editingId, body)
            : await createAgendaLocation(body);
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        await load();
        handleCancel();
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deleteAgendaLocation(id);
        setLocations((prev) => prev.filter((l) => l.id !== id));
        setDeletingId(null);
    };

    const handleToggleActive = async (location: AgendaLocation) => {
        setTogglingId(location.id);
        const next = !location.isActive;
        const result = await updateAgendaLocation(location.id, { isActive: next });
        if (result.ok) {
            setLocations((prev) => prev.map((l) => l.id === location.id ? { ...l, isActive: next } : l));
        }
        setTogglingId(null);
    };

    const handleSetDefault = async (location: AgendaLocation) => {
        if (location.isDefault) return;
        const result = await updateAgendaLocation(location.id, { isDefault: true });
        if (result.ok) await load();
    };

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Consultorios y direcciones"
                description="Registra cada lugar donde atiendes. Puedes tener más de una dirección activa."
                actions={
                    !showForm ? (
                        <PanelButton variant="accent" size="sm" onClick={handleNew}>
                            <IconPlus size={15} /> Nueva dirección
                        </PanelButton>
                    ) : null
                }
            />

            {/* Form */}
            {showForm && (
                <div className="mb-6">
                    <PanelCard size="md" className="border-[--accent]">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                            {editingId ? 'Editar dirección' : 'Nueva dirección'}
                        </h2>
                        <div className="flex flex-col gap-4">

                            <PanelField label="Nombre del consultorio" required hint="Ej: Consulta Providencia, Centro Médico Las Condes">
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="Ej: Consulta Providencia"
                                    className="form-input"
                                />
                            </PanelField>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Dirección <span style={{ color: 'var(--accent)' }}>*</span>
                                    </label>
                                    {autocompleteReady && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                            <IconSearch size={9} /> Google Places activo
                                        </span>
                                    )}
                                </div>
                                <input
                                    key={addressKeyRef.current}
                                    ref={addressInputRef}
                                    type="text"
                                    defaultValue={form.addressLine}
                                    onChange={(e) => set('addressLine', e.target.value)}
                                    placeholder="Ej: Av. Providencia 1234, Oficina 301"
                                    className="form-input"
                                    autoComplete="off"
                                />
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {autocompleteReady
                                        ? 'Escribe la calle y el número — selecciona la sugerencia para autocompletar región y comuna.'
                                        : 'Escribe la calle y número.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <PanelField label="Región">
                                    <select
                                        value={form.regionId}
                                        onChange={(e) => {
                                            const r = LOCATION_REGIONS.find((x) => x.id === e.target.value);
                                            set('regionId', e.target.value);
                                            set('regionName', r?.name ?? '');
                                            set('communeId', '');
                                            set('communeName', '');
                                        }}
                                        className="form-select"
                                    >
                                        <option value="">Selecciona una región</option>
                                        {regionOptions.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </PanelField>
                                <PanelField label="Comuna">
                                    <select
                                        value={form.communeId}
                                        onChange={(e) => {
                                            const c = communeOptions.find((x) => x.value === e.target.value);
                                            set('communeId', e.target.value);
                                            set('communeName', c?.label ?? '');
                                        }}
                                        disabled={!form.regionId}
                                        className="form-select"
                                    >
                                        <option value="">{form.regionId ? 'Selecciona una comuna' : 'Selecciona región primero'}</option>
                                        {communeOptions.map((c) => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </PanelField>
                            </div>

                            <PanelField label="Instrucciones de llegada" hint="Referencias visibles para el paciente antes de la sesión.">
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => set('notes', e.target.value)}
                                    placeholder="Ej: Piso 3, tocar timbre 301. Estacionamiento disponible en el edificio."
                                    rows={3}
                                    className="form-textarea"
                                />
                            </PanelField>

                            {form.googleMapsUrl && (
                                <PanelField label="Link Google Maps" hint="Generado automáticamente al seleccionar la dirección. Puedes editarlo.">
                                    <input
                                        type="url"
                                        value={form.googleMapsUrl}
                                        onChange={(e) => set('googleMapsUrl', e.target.value)}
                                        className="form-input"
                                    />
                                </PanelField>
                            )}

                            {!form.googleMapsUrl && (
                                <PanelField label="Link de Google Maps" hint="Opcional. Se comparte con el paciente en la confirmación.">
                                    <input
                                        type="url"
                                        value={form.googleMapsUrl}
                                        onChange={(e) => set('googleMapsUrl', e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                        className="form-input"
                                    />
                                </PanelField>
                            )}

                            <label
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.isDefault}
                                    onChange={(e) => set('isDefault', e.target.checked)}
                                />
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    Usar como dirección predeterminada
                                </span>
                            </label>

                            {error && (
                                <PanelNotice tone="error">
                                    <span className="flex items-center gap-2"><IconAlertCircle size={14} /> {error}</span>
                                </PanelNotice>
                            )}

                            <div className="flex gap-3">
                                <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving}>
                                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={handleCancel}>
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={15} className="animate-spin" /> Cargando direcciones...
                </div>
            ) : locations.length === 0 && !showForm ? (
                <PanelEmptyState
                    title="Sin consultorios aún"
                    description="Agrega una dirección para mostrarla a tus pacientes cuando reserven sesiones presenciales."
                    action={
                        <PanelButton variant="accent" size="sm" onClick={handleNew}>
                            <IconPlus size={15} /> Agregar dirección
                        </PanelButton>
                    }
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {locations.map((location) => {
                        const isToggling = togglingId === location.id;
                        const isDeleting = deletingId === location.id;
                        return (
                            <PanelCard key={location.id} size="sm" className={location.isActive ? '' : 'opacity-60'}>
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                    >
                                        <IconMapPin size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{location.name}</p>
                                            {location.isDefault && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                                    <IconStarFilled size={9} /> Predeterminada
                                                </span>
                                            )}
                                            {!location.isActive && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>{location.addressLine}</p>
                                        {(location.city || location.region) && (
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                                {[location.city, location.region].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {location.notes && (
                                            <p className="text-xs mt-1 italic" style={{ color: 'var(--fg-muted)' }}>{location.notes}</p>
                                        )}
                                        {location.googleMapsUrl && (
                                            <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: 'var(--accent)' }}>
                                                <IconExternalLink size={11} /> Ver en Google Maps
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isToggling ? (
                                            <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                        ) : (
                                            <PanelSwitch
                                                checked={location.isActive}
                                                onChange={() => void handleToggleActive(location)}
                                                size="sm"
                                                ariaLabel={location.isActive ? 'Desactivar' : 'Activar'}
                                            />
                                        )}
                                        {!location.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => void handleSetDefault(location)}
                                                aria-label="Marcar como predeterminada"
                                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                            >
                                                <IconStar size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(location)}
                                            aria-label="Editar"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            <IconEdit size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(location.id)}
                                            disabled={isDeleting}
                                            aria-label="Eliminar"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                        </button>
                                    </div>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
