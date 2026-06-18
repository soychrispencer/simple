'use client';

import { useEffect, useState } from 'react';
import { IconAlertCircle, IconCheck, IconLoader2 } from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';
import { PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelSwitch, StructuredLocationFields } from '@simple/ui/panel';
import {
    formatStructuredLocationLabel,
    normalizeStructuredLocation,
    timezoneShortLabel,
} from '@simple/utils';
import { fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';

function profileToOperatingLocation(profile: AgendaProfile): StructuredLocation {
    return normalizeStructuredLocation({
        countryCode: profile.countryCode ?? 'CL',
        regionId: profile.regionId ?? null,
        regionName: profile.region,
        localityId: profile.localityId ?? null,
        localityName: profile.city,
    });
}

export function AgendaOperatingLocationEditor() {
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [location, setLocation] = useState<StructuredLocation>(() => normalizeStructuredLocation({ countryCode: 'CL' }));
    const [savedLocation, setSavedLocation] = useState<StructuredLocation>(() => normalizeStructuredLocation({ countryCode: 'CL' }));
    const [serviceLocalities, setServiceLocalities] = useState<string[]>([]);
    const [savedServiceLocalities, setSavedServiceLocalities] = useState<string[]>([]);
    const [servesOnline, setServesOnline] = useState(true);
    const [servesPresential, setServesPresential] = useState(false);
    const [savedServesOnline, setSavedServesOnline] = useState(true);
    const [savedServesPresential, setSavedServesPresential] = useState(false);
    const [coverageInput, setCoverageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        void fetchAgendaProfile().then((loaded) => {
            if (loaded) {
                setProfile(loaded);
                const op = profileToOperatingLocation(loaded);
                setLocation(op);
                setSavedLocation(op);
                setServiceLocalities(loaded.serviceLocalities ?? []);
                setSavedServiceLocalities(loaded.serviceLocalities ?? []);
                setServesOnline(loaded.servesOnline ?? true);
                setServesPresential(loaded.servesPresential ?? false);
                setSavedServesOnline(loaded.servesOnline ?? true);
                setSavedServesPresential(loaded.servesPresential ?? false);
            }
            setLoading(false);
        });
    }, []);

    const hasChanges = JSON.stringify(location) !== JSON.stringify(savedLocation)
        || JSON.stringify(serviceLocalities) !== JSON.stringify(savedServiceLocalities)
        || servesOnline !== savedServesOnline
        || servesPresential !== savedServesPresential;

    const addCoverage = () => {
        const value = coverageInput.trim();
        if (!value || serviceLocalities.includes(value)) return;
        setCoverageInput('');
        setServiceLocalities((prev) => [...prev, value]);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setSaveError('');
        setSaved(false);
        const normalized = normalizeStructuredLocation(location);
        const result = await saveAgendaProfile({
            countryCode: normalized.countryCode,
            regionId: normalized.regionId,
            localityId: normalized.localityId,
            region: normalized.regionName,
            city: normalized.localityName,
            serviceLocalities,
            servesOnline,
            servesPresential,
        });
        setSaving(false);
        if (!result.ok || !result.profile) {
            setSaveError(result.error ?? 'No se pudo guardar la ubicación operativa.');
            return;
        }
        const op = profileToOperatingLocation(result.profile);
        setProfile(result.profile);
        setLocation(op);
        setSavedLocation(op);
        setServiceLocalities(result.profile.serviceLocalities ?? []);
        setSavedServiceLocalities(result.profile.serviceLocalities ?? []);
        setSavedServesOnline(result.profile.servesOnline ?? true);
        setSavedServesPresential(result.profile.servesPresential ?? false);
        setServesOnline(result.profile.servesOnline ?? true);
        setServesPresential(result.profile.servesPresential ?? false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando ubicación operativa…</p>;
    }

    if (!profile) {
        return (
            <PanelCard size="lg" className="text-center">
                <p className="text-sm font-medium text-fg">Completa tus datos comerciales primero</p>
            </PanelCard>
        );
    }

    return (
        <div className="space-y-4">
            <PanelBlockHeader
                title="Dónde operas"
                description="Ubicación de tu consulta para el marketplace y la zona horaria de tus citas."
            />
            <PanelCard size="lg" className="space-y-4">
                <StructuredLocationFields
                    value={location}
                    onChange={setLocation}
                    disabled={saving}
                    regionLabel="Región de operación"
                    localityLabel="Comuna / ciudad base"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-(--border) px-3 py-2.5">
                        <div>
                            <p className="text-sm font-medium text-fg">Atiendo online</p>
                            <p className="text-xs text-fg-muted">Apareces en búsquedas de consulta virtual.</p>
                        </div>
                        <PanelSwitch checked={servesOnline} onChange={setServesOnline} size="sm" ariaLabel="Atiendo online" />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-(--border) px-3 py-2.5">
                        <div>
                            <p className="text-sm font-medium text-fg">Atiendo presencial</p>
                            <p className="text-xs text-fg-muted">Usa la comuna base y zonas de cobertura.</p>
                        </div>
                        <PanelSwitch checked={servesPresential} onChange={setServesPresential} size="sm" ariaLabel="Atiendo presencial" />
                    </div>
                </div>

                {servesPresential ? (
                    <PanelField label="Zonas de cobertura presencial" hint="Comunas o ciudades donde atiendes en persona.">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={coverageInput}
                                onChange={(e) => setCoverageInput(e.target.value)}
                                className="form-input flex-1"
                                placeholder="Ej: Providencia"
                            />
                            <PanelButton type="button" variant="secondary" size="sm" onClick={addCoverage}>
                                Agregar
                            </PanelButton>
                        </div>
                        {serviceLocalities.length > 0 ? (
                            <ul className="mt-2 flex flex-wrap gap-2">
                                {serviceLocalities.map((item) => (
                                    <li key={item}>
                                        <button
                                            type="button"
                                            className="rounded-full border border-(--border) px-2.5 py-1 text-xs text-fg"
                                            onClick={() => setServiceLocalities((prev) => prev.filter((x) => x !== item))}
                                        >
                                            {item} ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </PanelField>
                ) : null}

                <p className="text-xs text-fg-muted">
                    Horario operativo: {timezoneShortLabel(profile.timezone)} · {formatStructuredLocationLabel(location)}
                </p>

                {saveError ? (
                    <p className="flex items-center gap-1.5 text-sm text-(--color-error,#dc2626)">
                        <IconAlertCircle size={14} /> {saveError}
                    </p>
                ) : null}
                {saved ? (
                    <p className="flex items-center gap-1.5 text-sm text-accent">
                        <IconCheck size={14} /> Ubicación operativa guardada
                    </p>
                ) : null}

                <div className="flex justify-end">
                    <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving || !hasChanges}>
                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                        {saving ? 'Guardando…' : 'Guardar ubicación'}
                    </PanelButton>
                </div>
            </PanelCard>
        </div>
    );
}
