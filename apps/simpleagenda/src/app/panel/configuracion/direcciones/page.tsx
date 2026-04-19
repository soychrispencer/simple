'use client';

import { useEffect, useState } from 'react';
import {
    IconPlus,
    IconTrash,
    IconLoader2,
    IconEdit,
    IconMapPin,
    IconStar,
    IconStarFilled,
    IconAlertCircle,
    IconMap,
    IconShare,
    IconChevronRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import {
    PanelCard,
    PanelButton,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
    ListingLocationEditor,
} from '@simple/ui';
import { LOCATION_REGIONS, LOCATION_COMMUNES, getCommunesForRegion } from '@simple/utils';
import { createEmptyListingLocation, type ListingLocation } from '@simple/types';
import {
    fetchAgendaLocations,
    createAgendaLocation,
    updateAgendaLocation,
    deleteAgendaLocation,
    type AgendaLocation,
} from '@/lib/agenda-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_REGIONS = LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }));
const ALL_COMMUNES = LOCATION_COMMUNES.map((c) => ({ value: c.id, label: c.name }));

function emptyLocation(): ListingLocation {
    return createEmptyListingLocation({ sourceMode: 'custom' });
}

function locationFromAgenda(loc: AgendaLocation): ListingLocation {
    const region = LOCATION_REGIONS.find((r) => r.name === loc.region);
    const communes = region ? getCommunesForRegion(region.id) : [];
    const commune = communes.find((c) => c.name === loc.city);
    return createEmptyListingLocation({
        sourceMode: 'custom',
        label: loc.name,
        addressLine1: loc.addressLine,
        regionId: region?.id ?? null,
        regionName: region?.name ?? loc.region ?? null,
        communeId: commune?.id ?? null,
        communeName: commune?.name ?? loc.city ?? null,
        arrivalInstructions: loc.notes ?? null,
    });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DireccionesConfigPage() {
    const [locations, setLocations] = useState<AgendaLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ListingLocation>(emptyLocation());
    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { void load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaLocations();
        setLocations(data);
        setLoading(false);
    };

    const communeOptions = form.regionId
        ? getCommunesForRegion(form.regionId).map((c) => ({ value: c.id, label: c.name }))
        : [];

    const handleNew = () => {
        setEditingId(null);
        setForm(emptyLocation());
        setIsDefault(false);
        setError('');
        setShowForm(true);
    };

    const handleEdit = (loc: AgendaLocation) => {
        setEditingId(loc.id);
        setForm(locationFromAgenda(loc));
        setIsDefault(loc.isDefault);
        setError('');
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyLocation());
        setIsDefault(false);
        setError('');
    };

    const handleSave = async () => {
        if (!form.label?.trim()) { setError('El nombre de la dirección es requerido.'); return; }
        if (!form.addressLine1?.trim()) { setError('La dirección es requerida.'); return; }
        setSaving(true);
        setError('');
        const body = {
            name: form.label?.trim() ?? '',
            addressLine: form.addressLine1?.trim() ?? '',
            region: form.regionName ?? form.regionId ?? null,
            city: form.communeName ?? null,
            notes: form.arrivalInstructions ?? null,
            isDefault,
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
                title="Direcciones"
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
                            <ListingLocationEditor
                                framed={false}
                                showHeader={false}
                                simpleMode
                                showLocationMeta
                                showSourceSelector={false}
                                showVisibilityField={false}
                                showPublicPreviewCard={false}
                                showActionBar={false}
                                showSimpleVisibilityToggle={false}
                                allowAreaOnly={false}
                                addressRequired
                                showGoogleMapsLink
                                googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY}
                                location={form}
                                onChange={setForm}
                                regions={ALL_REGIONS}
                                communes={communeOptions}
                                allCommunes={ALL_COMMUNES}
                                addressBook={[]}
                            />

                            <label
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
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
                    {locations.map((loc) => {
                        const isToggling = togglingId === loc.id;
                        const isDeleting = deletingId === loc.id;
                        const mapsUrl = loc.googleMapsUrl;
                        return (
                            <PanelCard key={loc.id} size="sm" className={loc.isActive ? '' : 'opacity-60'}>
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                    >
                                        <IconMapPin size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{loc.name}</p>
                                            {loc.isDefault && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                                    <IconStarFilled size={9} /> Predeterminada
                                                </span>
                                            )}
                                            {!loc.isActive && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>{loc.addressLine}</p>
                                        {(loc.city || loc.region) && (
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                                {[loc.city, loc.region].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {loc.notes && (
                                            <p className="text-xs mt-1 italic" style={{ color: 'var(--fg-muted)' }}>{loc.notes}</p>
                                        )}
                                        {mapsUrl && (
                                            <div className="flex gap-2 mt-2">
                                                <a
                                                    href={mapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80"
                                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg)' }}
                                                >
                                                    <IconMap size={11} /> Ver en Maps
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (navigator.share) {
                                                            void navigator.share({ title: loc.name, url: mapsUrl });
                                                        } else {
                                                            void navigator.clipboard.writeText(mapsUrl);
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80"
                                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg)' }}
                                                >
                                                    <IconShare size={11} /> Compartir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isToggling ? (
                                            <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                        ) : (
                                            <PanelSwitch
                                                checked={loc.isActive}
                                                onChange={() => void handleToggleActive(loc)}
                                                size="sm"
                                                ariaLabel={loc.isActive ? 'Desactivar' : 'Activar'}
                                            />
                                        )}
                                        {!loc.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => void handleSetDefault(loc)}
                                                aria-label="Marcar como predeterminada"
                                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                            >
                                                <IconStar size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(loc)}
                                            aria-label="Editar"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            <IconEdit size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(loc.id)}
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

            <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                    href="/panel/configuracion/link"
                    className="flex items-center gap-3 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--accent)' }}>Siguiente paso</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Página de reservas</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Activa tu link público y compártelo con tus pacientes.</p>
                    </div>
                    <IconChevronRight size={18} style={{ color: 'var(--accent)' }} />
                </Link>
            </div>
        </div>
    );
}
