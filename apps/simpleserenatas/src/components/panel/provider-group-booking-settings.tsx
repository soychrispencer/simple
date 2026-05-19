'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard, PanelField } from '@simple/ui';
import { serenatasApi, type ProviderGroup, type ProviderGroupAvailability } from '@/lib/serenatas-api';
import { FieldInput, FieldSelect, FormFeedback, type FormStatus } from './shared';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type DayRule = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
};

function defaultRules(): DayRule[] {
    return DAY_LABELS.map((_, dayOfWeek) => ({
        dayOfWeek,
        startTime: dayOfWeek === 0 ? '10:00' : '09:00',
        endTime: '22:00',
        isActive: true,
    }));
}

function mergeRules(server: ProviderGroupAvailability['rules']): DayRule[] {
    const base = defaultRules();
    for (const rule of server) {
        const idx = base.findIndex((entry) => entry.dayOfWeek === rule.dayOfWeek);
        if (idx >= 0) {
            base[idx] = {
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
                isActive: rule.isActive ?? true,
            };
        }
    }
    return base;
}

export function ProviderGroupBookingSettings({ group }: { group: ProviderGroup }) {
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState<DayRule[]>(defaultRules);
    const [slaHours, setSlaHours] = useState(String(group.slaHours ?? 24));
    const [bufferMinutes, setBufferMinutes] = useState(String(group.bufferMinutes ?? 0));
    const [bookingMode, setBookingMode] = useState<ProviderGroup['bookingMode']>(group.bookingMode ?? 'manual');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    useEffect(() => {
        let active = true;
        setLoading(true);
        void serenatasApi.providerGroupAvailability(group.id).then((response) => {
            if (!active) return;
            if (response.ok && response.item) {
                setRules(mergeRules(response.item.rules));
                setSlaHours(String(response.item.slaHours ?? 24));
                setBufferMinutes(String(response.item.bufferMinutes ?? 0));
                setBookingMode(response.item.bookingMode ?? 'manual');
            }
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [group.id]);

    function updateRule(dayOfWeek: number, patch: Partial<DayRule>) {
        setRules((current) => current.map((rule) => (
            rule.dayOfWeek === dayOfWeek ? { ...rule, ...patch } : rule
        )));
    }

    async function save() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateProviderGroupAvailability(group.id, {
            slaHours: Number(slaHours),
            bufferMinutes: Number(bufferMinutes),
            bookingMode,
            rules: rules.map((rule) => ({
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
                isActive: rule.isActive,
            })),
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos guardar la configuración.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Disponibilidad y reservas actualizadas.' });
    }

    if (loading) {
        return <p className="text-sm text-[var(--fg-muted)]">Cargando horarios…</p>;
    }

    return (
        <PanelCard>
            <h3 className="text-lg font-semibold text-[var(--fg)]">Disponibilidad y reservas</h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Horario laboral por día, tiempo entre serenatas y cómo se confirman las solicitudes del marketplace.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
                <PanelField label="SLA de respuesta (horas)">
                    <FieldInput type="number" min={1} max={168} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
                </PanelField>
                <PanelField label="Buffer entre eventos (min)">
                    <FieldInput type="number" min={0} max={120} value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} />
                </PanelField>
                <PanelField label="Modo de reserva">
                    <FieldSelect value={bookingMode} onChange={(e) => setBookingMode(e.target.value as ProviderGroup['bookingMode'])}>
                        <option value="manual">Manual (revisar cada solicitud)</option>
                        <option value="auto_if_available">Automático si hay cupo</option>
                        <option value="auto_decline">Automático o rechazar si no hay cupo</option>
                    </FieldSelect>
                </PanelField>
            </div>
            <div className="mt-6 grid gap-3">
                {rules.map((rule) => (
                    <div key={rule.dayOfWeek} className="grid gap-3 rounded-card border border-border p-3 sm:grid-cols-[1fr_auto_auto]">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
                            <input
                                type="checkbox"
                                checked={rule.isActive}
                                onChange={(e) => updateRule(rule.dayOfWeek, { isActive: e.target.checked })}
                            />
                            {DAY_LABELS[rule.dayOfWeek]}
                        </label>
                        <FieldInput
                            type="time"
                            value={rule.startTime}
                            disabled={!rule.isActive}
                            onChange={(e) => updateRule(rule.dayOfWeek, { startTime: e.target.value })}
                        />
                        <FieldInput
                            type="time"
                            value={rule.endTime}
                            disabled={!rule.isActive}
                            onChange={(e) => updateRule(rule.dayOfWeek, { endTime: e.target.value })}
                        />
                    </div>
                ))}
            </div>
            <FormFeedback status={status} />
            <PanelButton className="mt-4" disabled={status.loading} onClick={() => void save()}>
                Guardar disponibilidad
            </PanelButton>
        </PanelCard>
    );
}
