'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard, PanelField, PanelNotice } from '@simple/ui';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { useProviderGroups } from '@/hooks/use-provider-groups';
import { RegionCommuneFields } from '@/components/panel/region-commune-fields';
import { WorkZonesPicker } from '@/components/panel/work-zones-picker';
import { EmptyBlock, FieldInput, FieldSelect, FieldTextarea, FormFeedback, type FormStatus } from './shared';
import { ProviderGroupBookingSettings } from './provider-group-booking-settings';
import { ProviderGroupRequestsSection } from './provider-group-requests-section';
import type { Section } from '@/context/serenata-context';
import type { MiNegocioTab } from '@/lib/mi-negocio-tab';
import { consumeSignupGroupName } from '@/lib/active-provider-group';

export function ProviderGroupView({
    refresh,
    setSection,
    onNavigateTab,
}: {
    refresh: () => Promise<void>;
    setSection: (section: Section) => void;
    onNavigateTab?: (tab: MiNegocioTab) => void;
}) {
    const { groups, applications, loading, error, refresh: refreshProviderGroups } = useProviderGroups();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    const selected = groups.find((g) => g.id === selectedId) ?? groups[0] ?? null;

    useEffect(() => {
        if (!selectedId && groups[0]) setSelectedId(groups[0].id);
    }, [groups, selectedId]);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [region, setRegion] = useState('');
    const [comunaBase, setComunaBase] = useState('');
    const [serviceComunas, setServiceComunas] = useState<string[]>([]);
    const [groupStatus, setGroupStatus] = useState<ProviderGroup['status']>('draft');

    useEffect(() => {
        if (groups.length > 0 || loading) return;
        const draft = consumeSignupGroupName();
        if (draft) setName(draft);
    }, [groups.length, loading]);

    useEffect(() => {
        if (!selected) return;
        setName(selected.name);
        setDescription(selected.description ?? '');
        setLogoUrl(selected.logoUrl ?? '');
        setCoverUrl(selected.coverUrl ?? '');
        setPhone(selected.phone ?? '');
        setWhatsapp(selected.whatsapp ?? '');
        setRegion(selected.region ?? '');
        setComunaBase(selected.comunaBase ?? '');
        setServiceComunas(selected.serviceComunas ?? []);
        setGroupStatus(selected.status);
    }, [selected?.id]);

    async function createGroupDraft() {
        if (name.trim().length < 2) {
            setSaveStatus({ loading: false, error: 'Indica el nombre de tu mariachi.', ok: null });
            return;
        }
        setSaveStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.createProviderGroup({
            name: name.trim(),
            description: description.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
            status: 'draft',
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos crear el grupo.', ok: null });
            return;
        }
        await refreshProviderGroups();
        setSaveStatus({ loading: false, error: null, ok: 'Grupo creado. Completa el perfil y publícalo cuando esté listo.' });
        await refresh();
    }

    async function submitApplication() {
        setSaveStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.submitProviderGroupApplication({
            name: name.trim(),
            description: description.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos enviar la solicitud', ok: null });
            return;
        }
        await refreshProviderGroups();
        setSaveStatus({ loading: false, error: null, ok: 'Solicitud enviada. Revisaremos tu grupo antes de publicarlo.' });
        await refresh();
    }

    async function saveGroup() {
        if (!selected) return;
        setSaveStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateProviderGroup(selected.id, {
            name: name.trim(),
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            coverUrl: coverUrl.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
            status: groupStatus,
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos guardar', ok: null });
            return;
        }
        await refreshProviderGroups();
        setSaveStatus({ loading: false, error: null, ok: 'Cambios guardados' });
        await refresh();
    }

    if (loading) {
        return <p className="text-sm text-[var(--fg-muted)]">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshProviderGroups()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    if (groups.length === 0) {
        const latestApplication = applications[0] ?? null;
        return (
            <div className="grid gap-5">
                <EmptyBlock
                    title="Crea tu mariachi"
                    description="Configura tu marca comercial para el marketplace o envía una solicitud de revisión si prefieres validación manual."
                />
                <PanelNotice tone="neutral">
                    Configura el perfil público de tu mariachi en el marketplace. El plantel de músicos se gestiona en la
                    pestaña <strong>Grupos</strong>.
                </PanelNotice>
                {latestApplication ? (
                    <PanelNotice tone="neutral">
                        Solicitud {latestApplication.status === 'pending' ? 'pendiente de revisión' : latestApplication.status}. Grupo: {latestApplication.name}
                    </PanelNotice>
                ) : null}
                <PanelCard>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">Solicitud de grupo</h3>
                    <div className="mt-5 grid gap-4">
                        <PanelField label="Nombre del grupo">
                            <FieldInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Mariachi Los Reyes" />
                        </PanelField>
                        <PanelField label="Descripción">
                            <FieldTextarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </PanelField>
                        <RegionCommuneFields region={region} comuna={comunaBase} onRegionChange={setRegion} onComunaChange={setComunaBase} />
                        <PanelField label="Comunas de atención">
                            <WorkZonesPicker value={serviceComunas} onChange={setServiceComunas} />
                        </PanelField>
                        <div className="grid gap-4 md:grid-cols-2">
                            <PanelField label="Teléfono">
                                <FieldInput value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </PanelField>
                            <PanelField label="WhatsApp">
                                <FieldInput value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                            </PanelField>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <PanelButton disabled={saveStatus.loading || name.trim().length < 2} onClick={() => void createGroupDraft()}>
                                Crear mi mariachi
                            </PanelButton>
                            <PanelButton variant="secondary" disabled={saveStatus.loading || name.trim().length < 2} onClick={() => void submitApplication()}>
                                Solicitar revisión manual
                            </PanelButton>
                        </div>
                    </div>
                </PanelCard>
                <FormFeedback status={saveStatus} />
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <PanelNotice tone="neutral">
                Este perfil es lo que ven los clientes al contratar. Servicios y plantel de músicos están en las otras pestañas de{' '}
                <strong>Mi Negocio</strong>.
            </PanelNotice>
            {groups.length > 1 ? (
                <PanelField label="Grupo activo">
                    <FieldSelect value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </FieldSelect>
                </PanelField>
            ) : null}

            {selected ? (
                <>
                    <ProviderGroupRequestsSection
                        groupId={selected.id}
                        groupName={selected.name}
                        setSection={setSection}
                        refresh={refresh}
                    />
                    <ProviderGroupBookingSettings group={selected} />
                </>
            ) : null}

            <PanelCard>
                <h3 className="text-lg font-semibold text-[var(--fg)]">Perfil comercial</h3>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    Marca pública del grupo en el marketplace. Los clientes solicitan directamente a este mariachi, no a
                    varios grupos a la vez.
                </p>
                {selected?.status !== 'active' ? (
                    <PanelNotice tone="neutral" className="mt-4">
                        Publica el grupo (estado Activo) para aparecer en el marketplace.
                    </PanelNotice>
                ) : null}
                <div className="mt-5 grid gap-4">
                    <PanelField label="Nombre del grupo">
                        <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
                    </PanelField>
                    <PanelField label="Descripción">
                        <FieldTextarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </PanelField>
                    <div className="grid gap-4 md:grid-cols-2">
                        <PanelField label="Logo o imagen principal">
                            <FieldInput value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                        </PanelField>
                        <PanelField label="Portada">
                            <FieldInput value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
                        </PanelField>
                    </div>
                    <RegionCommuneFields
                        region={region}
                        comuna={comunaBase}
                        onRegionChange={setRegion}
                        onComunaChange={setComunaBase}
                    />
                    <PanelField label="Comunas de atención">
                        <WorkZonesPicker value={serviceComunas} onChange={setServiceComunas} />
                    </PanelField>
                    <PanelField label="Teléfono">
                        <FieldInput value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </PanelField>
                    <PanelField label="WhatsApp">
                        <FieldInput value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                    </PanelField>
                    <PanelField label="Estado en marketplace">
                        <FieldSelect value={groupStatus} onChange={(e) => setGroupStatus(e.target.value as ProviderGroup['status'])}>
                            <option value="draft">Borrador</option>
                            <option value="active">Activo (visible)</option>
                            <option value="paused">Pausado</option>
                        </FieldSelect>
                    </PanelField>
                    <FormFeedback status={saveStatus} />
                    <div className="flex flex-wrap gap-2">
                        <PanelButton disabled={saveStatus.loading} onClick={() => void saveGroup()}>Guardar</PanelButton>
                        {onNavigateTab ? (
                            <>
                                <PanelButton variant="secondary" onClick={() => onNavigateTab('servicios')}>
                                    Servicios
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={() => onNavigateTab('grupos')}>
                                    Grupos
                                </PanelButton>
                            </>
                        ) : null}
                    </div>
                </div>
            </PanelCard>
        </div>
    );
}
