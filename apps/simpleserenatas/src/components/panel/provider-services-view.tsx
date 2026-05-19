'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard, PanelField } from '@simple/ui';
import { serenatasApi, type ProviderGroupService } from '@/lib/serenatas-api';
import { useProviderGroups } from '@/hooks/use-provider-groups';
import {
    persistActiveProviderGroupId,
    resolveActiveProviderGroupId,
} from '@/lib/active-provider-group';
import { EmptyBlock, FieldInput, FieldSelect, FieldTextarea, FormFeedback, money, type FormStatus } from './shared';

export function ProviderServicesView({ refresh }: { refresh: () => Promise<void> }) {
    const { groups, loading: groupsLoading, error: groupsError, refresh: refreshProviderGroups } = useProviderGroups();
    const [groupId, setGroupId] = useState<string | null>(null);
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });
    const [formStatus, setFormStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [musiciansCount, setMusiciansCount] = useState('3');
    const [durationMinutes, setDurationMinutes] = useState('45');
    const [price, setPrice] = useState('45000');
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

    const group = groups.find((g) => g.id === groupId) ?? null;

    async function loadServices(activeId: string) {
        const servicesResponse = await serenatasApi.providerGroupServices(activeId);
        if (!servicesResponse.ok) {
            setServices([]);
            setStatus({ loading: false, error: servicesResponse.error ?? 'Error al cargar servicios', ok: null });
            return;
        }
        setServices(servicesResponse.items);
        setStatus({ loading: false, error: null, ok: 'Listo' });
    }

    useEffect(() => {
        if (groupsLoading) {
            setStatus({ loading: true, error: null, ok: null });
            return;
        }
        if (groupsError) {
            setGroupId(null);
            setServices([]);
            setStatus({ loading: false, error: groupsError, ok: null });
            return;
        }
        if (groups.length === 0) {
            setGroupId(null);
            setServices([]);
            setStatus({ loading: false, error: 'Crea tu mariachi en Perfil público primero.', ok: null });
            return;
        }
        const activeId = resolveActiveProviderGroupId(groups);
        if (!activeId) {
            setStatus({ loading: false, error: 'Selecciona un grupo comercial.', ok: null });
            return;
        }
        persistActiveProviderGroupId(activeId);
        setGroupId(activeId);
        void loadServices(activeId);
    }, [groups, groupsLoading, groupsError]);

    async function selectGroup(nextId: string) {
        persistActiveProviderGroupId(nextId);
        setGroupId(nextId);
        resetForm();
        setStatus({ loading: true, error: null, ok: null });
        await loadServices(nextId);
    }

    function resetForm() {
        setEditingServiceId(null);
        setName('');
        setDescription('');
        setMusiciansCount('3');
        setDurationMinutes('45');
        setPrice('45000');
    }

    function editService(service: ProviderGroupService) {
        setEditingServiceId(service.id);
        setName(service.name);
        setDescription(service.description ?? '');
        setMusiciansCount(String(service.musiciansCount));
        setDurationMinutes(String(service.durationMinutes));
        setPrice(String(service.price));
        setFormStatus({ loading: false, error: null, ok: null });
    }

    async function saveService() {
        if (!group) return;
        setFormStatus({ loading: true, error: null, ok: null });
        const wasEditing = Boolean(editingServiceId);
        const payload = {
            name: name.trim() || 'Serenata estándar',
            description: description.trim() || null,
            musiciansCount: Number(musiciansCount) || 3,
            durationMinutes: Number(durationMinutes) || 45,
            price: Number(price) || 0,
        };
        const response = editingServiceId
            ? await serenatasApi.updateProviderGroupService(group.id, editingServiceId, payload)
            : await serenatasApi.createProviderGroupService(group.id, payload);
        if (!response.ok) {
            setFormStatus({ loading: false, error: response.error ?? 'No pudimos guardar el servicio', ok: null });
            return;
        }
        resetForm();
        await loadServices(group.id);
        await refresh();
        setFormStatus({ loading: false, error: null, ok: wasEditing ? 'Servicio actualizado' : 'Servicio creado' });
    }

    async function toggleService(service: ProviderGroupService) {
        if (!group) return;
        setFormStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateProviderGroupService(group.id, service.id, {
            isActive: !service.isActive,
        });
        if (!response.ok) {
            setFormStatus({ loading: false, error: response.error ?? 'No pudimos actualizar el servicio', ok: null });
            return;
        }
        await loadServices(group.id);
        await refresh();
        setFormStatus({ loading: false, error: null, ok: service.isActive ? 'Servicio pausado' : 'Servicio activado' });
    }

    if (status.loading) return <p className="text-sm text-[var(--fg-muted)]">Cargando servicios…</p>;
    if (!group) return <EmptyBlock title="Sin grupo comercial" description={status.error ?? ''} />;

    return (
        <div className="grid gap-5">
            {groups.length > 1 ? (
                <PanelField label="Grupo comercial">
                    <FieldSelect value={groupId ?? ''} onChange={(e) => void selectGroup(e.target.value)}>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </FieldSelect>
                </PanelField>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <PanelCard>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">Servicios publicados · {group.name}</h3>
                    {services.length === 0 ? (
                        <p className="mt-4 text-sm text-[var(--fg-muted)]">Aún no hay servicios. Crea el primero.</p>
                    ) : (
                        <div className="mt-4 grid gap-3">
                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className={`rounded-xl border border-[var(--border)] p-4 ${service.isActive ? '' : 'opacity-60'}`}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-[var(--fg)]">{service.name}</p>
                                            <p className="text-sm text-[var(--fg-muted)]">
                                                {service.musiciansCount} músicos · {service.durationMinutes} min ·{' '}
                                                {money(service.price)}
                                            </p>
                                            {service.description ? (
                                                <p className="mt-1 text-sm text-[var(--fg-muted)]">{service.description}</p>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <PanelButton
                                                variant="secondary"
                                                disabled={formStatus.loading}
                                                onClick={() => editService(service)}
                                            >
                                                Editar
                                            </PanelButton>
                                            <PanelButton
                                                variant="secondary"
                                                disabled={formStatus.loading}
                                                onClick={() => void toggleService(service)}
                                            >
                                                {service.isActive ? 'Pausar' : 'Activar'}
                                            </PanelButton>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                <PanelCard>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">
                        {editingServiceId ? 'Editar servicio' : 'Nuevo servicio'}
                    </h3>
                    <div className="mt-4 grid gap-3">
                        <PanelField label="Nombre">
                            <FieldInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Trío clásico" />
                        </PanelField>
                        <PanelField label="Descripción">
                            <FieldTextarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </PanelField>
                        <PanelField label="Músicos">
                            <FieldInput
                                type="number"
                                min={1}
                                value={musiciansCount}
                                onChange={(e) => setMusiciansCount(e.target.value)}
                            />
                        </PanelField>
                        <PanelField label="Duración (min)">
                            <FieldInput
                                type="number"
                                min={15}
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                            />
                        </PanelField>
                        <PanelField label="Precio (CLP)">
                            <FieldInput type="number" min={1000} value={price} onChange={(e) => setPrice(e.target.value)} />
                        </PanelField>
                        <FormFeedback status={formStatus} />
                        <div className="flex flex-wrap gap-2">
                            <PanelButton disabled={formStatus.loading} onClick={() => void saveService()}>
                                {editingServiceId ? 'Guardar cambios' : 'Agregar servicio'}
                            </PanelButton>
                            {editingServiceId ? (
                                <PanelButton variant="secondary" disabled={formStatus.loading} onClick={resetForm}>
                                    Cancelar
                                </PanelButton>
                            ) : null}
                        </div>
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
