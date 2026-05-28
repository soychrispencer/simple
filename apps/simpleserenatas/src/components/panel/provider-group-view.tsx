'use client';

import { useEffect, useState } from 'react';
import { IconMusic } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelField, PanelNotice } from '@simple/ui/panel';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { RegionCommuneFields } from '@/components/panel/region-commune-fields';
import { WorkZonesPicker } from '@/components/panel/work-zones-picker';
import { EmptyBlock, FieldInput, FieldTextarea, FormFeedback, type FormStatus } from './shared';
import { ProviderContactPhonesFields } from './provider-contact-phones-fields';
import { ProviderGroupBrandImages } from './provider-group-brand-images';
import { consumeSignupGroupName } from '@/lib/active-provider-group';

function addUniqueCommune(communes: string[], commune: string) {
    const clean = commune.trim();
    if (!clean) return communes;
    const exists = communes.some((item) => item.trim().toLowerCase() === clean.toLowerCase());
    return exists ? communes : [...communes, clean];
}

export function ProviderGroupView({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, hasMariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();
    const [saveStatus, setSaveStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [region, setRegion] = useState('');
    const [comunaBase, setComunaBase] = useState('');
    const [serviceComunas, setServiceComunas] = useState<string[]>([]);

    const handleComunaBaseChange = (nextComuna: string) => {
        setComunaBase(nextComuna);
        setServiceComunas((current) => addUniqueCommune(current, nextComuna));
    };

    const comunaBaseHint = comunaBase.trim() ? `Tu comuna base es ${comunaBase.trim()}` : null;

    useEffect(() => {
        if (hasMariachi || loading) return;
        const draft = consumeSignupGroupName();
        if (draft) setName(draft);
    }, [hasMariachi, loading]);

    useEffect(() => {
        if (!mariachi) return;
        setName(mariachi.name);
        setDescription(mariachi.description ?? '');
        setLogoUrl(mariachi.logoUrl ?? '');
        setCoverUrl(mariachi.coverUrl ?? '');
        setPhone(mariachi.phone ?? '');
        setWhatsapp(mariachi.whatsapp ?? '');
        setRegion(mariachi.region ?? '');
        setComunaBase(mariachi.comunaBase ?? '');
        setServiceComunas(mariachi.serviceComunas ?? []);
    }, [mariachi?.id, mariachi?.updatedAt]);

    async function createMariachiProfile() {
        if (name.trim().length < 2) {
            setSaveStatus({ loading: false, error: 'Indica el nombre de tu mariachi.', ok: null });
            return;
        }
        setSaveStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.createProviderGroup({
            name: name.trim(),
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            coverUrl: coverUrl.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
            status: 'draft',
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos crear tus datos comerciales.', ok: null });
            return;
        }
        await refreshMariachi();
        setSaveStatus({
            loading: false,
            error: null,
            ok: 'Mariachi creado. Agrega portada, logo y servicios antes de publicarlo.',
        });
        await refresh();
    }

    async function saveGroup() {
        if (!mariachi) return;
        setSaveStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateProviderGroup(mariachi.id, {
            name: name.trim(),
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            coverUrl: coverUrl.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos guardar', ok: null });
            return;
        }
        await refreshMariachi();
        setSaveStatus({ loading: false, error: null, ok: 'Cambios guardados' });
        await refresh();
    }

    async function saveImages(logoUrl: string | null, coverUrl: string | null) {
        if (!mariachi) return;
        const response = await serenatasApi.updateProviderGroup(mariachi.id, {
            name,
            description: description || null,
            logoUrl,
            coverUrl,
            phone: phone || null,
            whatsapp: whatsapp || null,
            region: region || null,
            comunaBase: comunaBase || null,
            serviceComunas,
        });
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos guardar la imagen', ok: null });
            return;
        }
        await refreshMariachi();
    }

    if (loading) {
        return <p className="text-sm text-[var(--fg-muted)]">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshMariachi()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    if (!hasMariachi) {
        return (
            <div className="grid gap-5">
                <PanelCard size="md" className="border-[var(--accent)]/25 bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                                Configuración inicial
                            </p>
                            <h2 className="mt-1 text-lg font-bold text-[var(--fg)]">Configura tus datos comerciales</h2>
                            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                                Al registrarte como dueño creas tu mariachi en el marketplace. Completa estos datos para que los clientes te encuentren.
                            </p>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-[color:var(--accent-contrast)] shadow-sm">
                            <IconMusic size={20} aria-hidden="true" />
                        </div>
                    </div>
                </PanelCard>
                <PanelCard>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">Datos comerciales</h3>
                    <div className="mt-5 grid gap-4">
                        <ProviderGroupBrandImages
                            name={name}
                            logoUrl={logoUrl}
                            coverUrl={coverUrl}
                            onLogoChange={setLogoUrl}
                            onCoverChange={setCoverUrl}
                            onError={(message) => setSaveStatus({ loading: false, error: message, ok: null })}
                        />
                        <PanelField label="Nombre del mariachi">
                            <FieldInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Mariachi Los Reyes" />
                        </PanelField>
                        <PanelField label="Descripción">
                            <FieldTextarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </PanelField>
                        <ProviderContactPhonesFields
                            resetKey="signup"
                            phone={phone}
                            whatsapp={whatsapp}
                            onPhoneChange={setPhone}
                            onWhatsappChange={setWhatsapp}
                        />
                        <RegionCommuneFields region={region} comuna={comunaBase} onRegionChange={setRegion} onComunaChange={handleComunaBaseChange} />
                        <PanelField label="Zonas de trabajo">
                            <WorkZonesPicker value={serviceComunas} onChange={setServiceComunas} />
                            {comunaBaseHint ? <p className="mt-2 text-xs text-fg-muted">{comunaBaseHint}</p> : null}
                        </PanelField>
                        <PanelButton disabled={saveStatus.loading || name.trim().length < 2} onClick={() => void createMariachiProfile()}>
                            Crear mariachi
                        </PanelButton>
                    </div>
                </PanelCard>
                <FormFeedback status={saveStatus} />
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <PanelCard>
                <h3 className="text-lg font-semibold text-[var(--fg)]">Datos comerciales</h3>

                <ProviderGroupBrandImages
                    className="mt-5"
                    name={name}
                    logoUrl={logoUrl}
                    coverUrl={coverUrl}
                    onLogoChange={setLogoUrl}
                    onCoverChange={setCoverUrl}
                    onError={(message) => setSaveStatus({ loading: false, error: message, ok: null })}
                    onSave={saveImages}
                />

                <p className="mt-4 text-sm text-[var(--fg-muted)]">
                    Lo que verán los clientes al contratarte: nombre, fotos, descripción, zonas y contacto.
                </p>

                <div className="mt-5 grid gap-4">
                    <PanelField label="Nombre del mariachi">
                        <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
                    </PanelField>
                    <PanelField label="Descripción">
                        <FieldTextarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </PanelField>
                    <ProviderContactPhonesFields
                        resetKey={mariachi?.id ?? 'profile'}
                        phone={phone}
                        whatsapp={whatsapp}
                        onPhoneChange={setPhone}
                        onWhatsappChange={setWhatsapp}
                    />
                    <RegionCommuneFields
                        region={region}
                        comuna={comunaBase}
                        onRegionChange={setRegion}
                        onComunaChange={handleComunaBaseChange}
                    />
                    <PanelField label="Zonas de trabajo">
                        <WorkZonesPicker value={serviceComunas} onChange={setServiceComunas} />
                        {comunaBaseHint ? <p className="mt-2 text-xs text-fg-muted">{comunaBaseHint}</p> : null}
                    </PanelField>
                    <FormFeedback status={saveStatus} />
                    <PanelButton disabled={saveStatus.loading} onClick={() => void saveGroup()}>
                        Guardar
                    </PanelButton>
                </div>
            </PanelCard>
        </div>
    );
}
