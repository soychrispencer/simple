'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelEmptyState, PanelField, PanelIconButton, PanelStatusBadge, PanelSwitch, usePanelConfirm } from '@simple/ui/panel';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { FieldInput, FieldSelect, FieldTextarea, FormFeedback, money, type FormStatus } from './shared';
import { serviceEffectivePrice, serviceHasPromoPrice } from '@/lib/service-pricing';

const EVENT_TYPE_OPTIONS = [
    { value: '', label: 'Uso general' },
    { value: 'Cumpleaños', label: 'Cumpleaños' },
    { value: 'Aniversario', label: 'Aniversario' },
    { value: 'Boda', label: 'Boda' },
    { value: 'Serenata sorpresa', label: 'Serenata sorpresa' },
    { value: 'Día de la madre', label: 'Día de la madre' },
    { value: 'Otro', label: 'Otro' },
] as const;

const DEFAULT_FORM = {
    name: '',
    description: '',
    musiciansCount: '3',
    durationMinutes: '45',
    price: '45000',
    promoPrice: '',
    eventType: '',
    songsIncluded: '0',
};

type FormMode = 'closed' | 'create' | 'edit';

export function ProviderServicesEditor({
    group,
    onSaved,
}: {
    group: ProviderGroup;
    onSaved: () => Promise<void>;
}) {
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formStatus, setFormStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [listNotice, setListNotice] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<FormMode>('closed');
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const { confirm } = usePanelConfirm();

    const formOpen = formMode !== 'closed';

    const loadServices = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        const response = await serenatasApi.providerGroupServices(group.id);
        if (!response.ok) {
            setServices([]);
            setLoadError(response.error ?? 'No se pudieron cargar los servicios.');
            setLoading(false);
            return;
        }
        setServices(response.items);
        setLoading(false);
    }, [group.id]);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    useEffect(() => {
        setFormMode('closed');
        setEditingServiceId(null);
        setForm(DEFAULT_FORM);
        setFormStatus({ loading: false, error: null, ok: null });
        setListNotice(null);
    }, [group.id]);

    function closeForm() {
        setFormMode('closed');
        setEditingServiceId(null);
        setForm(DEFAULT_FORM);
        setFormStatus({ loading: false, error: null, ok: null });
    }

    function startCreate() {
        setEditingServiceId(null);
        setForm(DEFAULT_FORM);
        setFormStatus({ loading: false, error: null, ok: null });
        setFormMode('create');
    }

    function editService(service: ProviderGroupService) {
        setEditingServiceId(service.id);
        setForm({
            name: service.name,
            description: service.description ?? '',
            musiciansCount: String(service.musiciansCount),
            durationMinutes: String(service.durationMinutes),
            price: String(service.price),
            promoPrice: service.promoPrice == null ? '' : String(service.promoPrice),
            eventType: service.eventType ?? '',
            songsIncluded: String(service.songsIncluded ?? 0),
        });
        setFormStatus({ loading: false, error: null, ok: null });
        setFormMode('edit');
    }

    async function saveService() {
        setFormStatus({ loading: true, error: null, ok: null });
        const price = Number(form.price);
        const promoPrice = form.promoPrice.trim() === '' ? null : Number(form.promoPrice);
        const musiciansCount = Number(form.musiciansCount);
        const durationMinutes = Number(form.durationMinutes);

        if (!form.name.trim()) {
            setFormStatus({ loading: false, error: 'Ingresa un nombre para el servicio.', ok: null });
            return;
        }
        if (!Number.isFinite(price) || price < 1000) {
            setFormStatus({ loading: false, error: 'El precio mínimo es $1.000 CLP.', ok: null });
            return;
        }
        if (promoPrice != null && (!Number.isFinite(promoPrice) || promoPrice < 1000)) {
            setFormStatus({ loading: false, error: 'El precio oferta mínimo es $1.000 CLP.', ok: null });
            return;
        }
        if (promoPrice != null && promoPrice >= price) {
            setFormStatus({ loading: false, error: 'El precio oferta debe ser menor al precio normal.', ok: null });
            return;
        }
        if (!Number.isFinite(musiciansCount) || musiciansCount < 1) {
            setFormStatus({ loading: false, error: 'Indica al menos 1 músico.', ok: null });
            return;
        }
        if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
            setFormStatus({ loading: false, error: 'La duración mínima es 15 minutos.', ok: null });
            return;
        }

        const songsIncluded = Math.max(0, Math.floor(Number(form.songsIncluded) || 0));
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            musiciansCount: Math.floor(musiciansCount),
            durationMinutes: Math.floor(durationMinutes),
            price: Math.floor(price),
            promoPrice: promoPrice == null ? null : Math.floor(promoPrice),
            eventType: form.eventType.trim() || null,
            songsIncluded,
            repertoirePolicy: 'any_active' as const,
        };

        const wasEditing = formMode === 'edit' && editingServiceId;
        const response = wasEditing && editingServiceId
            ? await serenatasApi.updateProviderGroupService(group.id, editingServiceId, payload)
            : await serenatasApi.createProviderGroupService(group.id, payload);

        if (!response.ok) {
            setFormStatus({ loading: false, error: response.error ?? 'No se pudo guardar el servicio.', ok: null });
            return;
        }

        closeForm();
        await loadServices();
        await onSaved();
        setListNotice(wasEditing ? 'Servicio actualizado.' : 'Servicio creado.');
    }

    async function toggleService(service: ProviderGroupService) {
        setTogglingId(service.id);
        const response = await serenatasApi.updateProviderGroupService(group.id, service.id, {
            isActive: !service.isActive,
        });
        setTogglingId(null);
        if (!response.ok) {
            setListNotice(response.error ?? 'No se pudo actualizar el servicio.');
            return;
        }
        await loadServices();
        await onSaved();
    }

    async function deleteService(service: ProviderGroupService) {
        const confirmed = await confirm({
            title: 'Eliminar servicio',
            message: `¿Eliminar "${service.name}"? Dejará de mostrarse en el marketplace.`,
            confirmLabel: 'Eliminar',
            tone: 'danger',
        });
        if (!confirmed) return;
        setDeletingId(service.id);
        const response = await serenatasApi.deleteProviderGroupService(group.id, service.id);
        setDeletingId(null);
        if (!response.ok) {
            setListNotice(response.error ?? 'No se pudo eliminar el servicio.');
            return;
        }
        if (editingServiceId === service.id) closeForm();
        await loadServices();
        await onSaved();
    }

    if (loading) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" />
                Cargando servicios…
            </p>
        );
    }

    if (loadError) {
        return (
            <PanelEmptyState
                title="No se cargaron los servicios"
                description={loadError}
                action={
                    <PanelButton variant="secondary" size="sm" onClick={() => void loadServices()}>
                        Reintentar
                    </PanelButton>
                }
            />
        );
    }

    const activeCount = services.filter((s) => s.isActive).length;

    return (
        <div className="w-full">
            <PanelBlockHeader
                title="Servicios"
                description={`Paquetes que ofreces en el marketplace · ${group.name}`}
                actions={
                    !formOpen ? (
                        <PanelButton variant="accent" size="sm" onClick={startCreate}>
                            <IconPlus size={14} />
                            Nuevo servicio
                        </PanelButton>
                    ) : null
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                <span>
                    {services.length === 0
                        ? 'Sin servicios publicados'
                        : `${activeCount} activo${activeCount === 1 ? '' : 's'} de ${services.length}`}
                </span>
                <span>Durante la prueba tienes acceso completo. Esencial permite hasta 3 servicios activos; Pro permite publicar más.</span>
                {listNotice ? <span className="text-accent">{listNotice}</span> : null}
            </div>

            <div className="flex flex-col gap-6">
                {formOpen ? (
                    <section className="w-full">
                        <PanelCard size="md">
                            <h3 className="text-base font-semibold text-fg">
                                {formMode === 'edit' ? 'Editar servicio' : 'Nuevo servicio'}
                            </h3>
                            <p className="mt-1 text-xs text-fg-muted">
                                Lo verán los clientes al contratar una serenata contigo.
                            </p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <PanelField label="Nombre" required className="sm:col-span-2 lg:col-span-2">
                                    <FieldInput
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Trío clásico"
                                    />
                                </PanelField>
                                <PanelField label="Tipo de evento" hint="Opcional.">
                                    <FieldSelect
                                        value={form.eventType}
                                        onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}
                                    >
                                        {EVENT_TYPE_OPTIONS.map((opt) => (
                                            <option key={opt.value || 'general'} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </FieldSelect>
                                </PanelField>
                                <PanelField label="Descripción" hint="Qué incluye el paquete." className="sm:col-span-2 lg:col-span-3">
                                    <FieldTextarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Repertorio variado, vestimenta formal, desplazamiento en RM…"
                                    />
                                </PanelField>
                                <PanelField label="Músicos" required>
                                    <FieldInput
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={form.musiciansCount}
                                        onChange={(e) => setForm((prev) => ({ ...prev, musiciansCount: e.target.value }))}
                                    />
                                </PanelField>
                                <PanelField label="Duración (min)" required>
                                    <FieldInput
                                        type="number"
                                        min={15}
                                        max={240}
                                        value={form.durationMinutes}
                                        onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                                    />
                                </PanelField>
                                <PanelField label="Canciones incluidas">
                                    <FieldInput
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={form.songsIncluded}
                                        onChange={(e) => setForm((prev) => ({ ...prev, songsIncluded: e.target.value }))}
                                    />
                                </PanelField>
                                <PanelField label="Precio (CLP)" required>
                                    <FieldInput
                                        type="number"
                                        min={1000}
                                        step={1000}
                                        value={form.price}
                                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                                    />
                                </PanelField>
                                <PanelField label="Precio oferta (CLP)" hint="Opcional. Debe ser menor que el precio normal.">
                                    <FieldInput
                                        type="number"
                                        min={1000}
                                        step={1000}
                                        value={form.promoPrice}
                                        onChange={(e) => setForm((prev) => ({ ...prev, promoPrice: e.target.value }))}
                                    />
                                </PanelField>
                                <div className="flex w-full flex-col gap-3 sm:col-span-2 lg:col-span-3">
                                    <FormFeedback status={formStatus} />
                                    <div className="flex flex-wrap gap-2">
                                        <PanelButton
                                            variant="accent"
                                            disabled={formStatus.loading}
                                            onClick={() => void saveService()}
                                        >
                                            {formStatus.loading ? (
                                                <IconLoader2 size={14} className="animate-spin" />
                                            ) : null}
                                            {formMode === 'edit' ? 'Guardar cambios' : 'Crear servicio'}
                                        </PanelButton>
                                        <PanelButton
                                            variant="secondary"
                                            disabled={formStatus.loading}
                                            onClick={closeForm}
                                        >
                                            Cancelar
                                        </PanelButton>
                                    </div>
                                </div>
                            </div>
                        </PanelCard>
                    </section>
                ) : null}

                <section className="min-w-0 space-y-2.5">
                    {services.length === 0 && !formOpen ? (
                        <PanelEmptyState
                            title="Aún no hay servicios"
                            description="Usa el botón Nuevo servicio arriba a la derecha para publicar tu primer paquete (trío, duración y precio)."
                        />
                    ) : services.length === 0 && formOpen ? null : (
                        services.map((service) => {
                            const isEditing = editingServiceId === service.id;
                            const hasPromo = serviceHasPromoPrice(service);
                            const displayPrice = serviceEffectivePrice(service);
                            return (
                                <PanelCard
                                    key={service.id}
                                    size="sm"
                                    className={[
                                        service.isActive ? '' : 'opacity-60',
                                        isEditing ? 'ring-2 ring-accent/40' : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-fg">{service.name}</p>
                                                <PanelStatusBadge
                                                    label={service.isActive ? 'Activo' : 'Pausado'}
                                                    tone={service.isActive ? 'success' : 'neutral'}
                                                    size="xs"
                                                />
                                            </div>
                                            <p className="mt-1 text-sm text-fg-muted">
                                                {service.musiciansCount} músicos · {service.durationMinutes} min ·{' '}
                                                {hasPromo ? (
                                                    <>
                                                        <span className="line-through opacity-70">{money(service.price)}</span>
                                                        {' '}
                                                        <span className="font-semibold text-accent">{money(displayPrice)}</span>
                                                    </>
                                                ) : (
                                                    money(service.price)
                                                )}
                                                {service.eventType ? ` · ${service.eventType}` : ''}
                                                {(service.songsIncluded ?? 0) > 0
                                                    ? ` · Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
                                                    : ''}
                                            </p>
                                            {service.description ? (
                                                <p className="mt-1.5 text-sm text-fg-secondary line-clamp-2">
                                                    {service.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            {togglingId === service.id ? (
                                                <IconLoader2 size={14} className="animate-spin text-fg-muted" />
                                            ) : (
                                                <PanelSwitch
                                                    checked={service.isActive}
                                                    onChange={() => void toggleService(service)}
                                                    size="sm"
                                                    ariaLabel={service.isActive ? 'Pausar servicio' : 'Activar servicio'}
                                                    disabled={formOpen && !isEditing}
                                                />
                                            )}
                                            <PanelButton
                                                variant={isEditing ? 'accent' : 'secondary'}
                                                size="sm"
                                                disabled={Boolean(formStatus.loading || deletingId || (formOpen && !isEditing))}
                                                onClick={() => editService(service)}
                                            >
                                                {isEditing ? 'Editando…' : 'Editar'}
                                            </PanelButton>
                                            <PanelIconButton
                                                label="Eliminar servicio"
                                                onClick={() => void deleteService(service)}
                                                disabled={deletingId === service.id || (formOpen && !isEditing)}
                                                className="border border-border hover:border-red-500/40 hover:bg-red-500/10"
                                            >
                                                {deletingId === service.id ? (
                                                    <IconLoader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <IconTrash size={13} />
                                                )}
                                            </PanelIconButton>
                                        </div>
                                    </div>
                                </PanelCard>
                            );
                        })
                    )}
                </section>
            </div>
        </div>
    );
}
