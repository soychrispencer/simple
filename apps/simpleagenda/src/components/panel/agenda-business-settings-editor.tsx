'use client';

import { useEffect, useState } from 'react';
import {
    IconAlertCircle,
    IconCalendarCheck,
    IconCheck,
    IconLoader2,
    IconPointer,
    IconSparkles,
} from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelSwitch } from '@simple/ui/panel';
import { fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';
import { generatePolicies } from '@/actions/generate-policies';
import { vocab } from '@/lib/vocabulary';
import { AgendaBusinessNotificationsSettings } from '@/components/panel/agenda-business-notifications-settings';

type BookingForm = {
    confirmationMode: 'auto' | 'manual';
    allowsRecurrentBooking: boolean;
    bookingWindowDays: number;
    cancellationHours: number;
    encuadre: string;
};

function applyProfileToForm(profile: AgendaProfile): BookingForm {
    return {
        confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
        allowsRecurrentBooking: profile.allowsRecurrentBooking ?? true,
        bookingWindowDays: profile.bookingWindowDays ?? 30,
        cancellationHours: profile.cancellationHours ?? 24,
        encuadre: profile.encuadre ?? '',
    };
}

export function AgendaBusinessSettingsEditor() {
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [form, setForm] = useState<BookingForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const [generatingPolicies, setGeneratingPolicies] = useState(false);

    useEffect(() => {
        void fetchAgendaProfile().then((loaded) => {
            if (loaded) {
                setProfile(loaded);
                setForm(applyProfileToForm(loaded));
            }
            setLoading(false);
        });
    }, []);

    const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
        setSaved(false);
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const hasChanges = profile && form
        ? form.confirmationMode !== ((profile.confirmationMode as 'auto' | 'manual') ?? 'auto')
            || form.allowsRecurrentBooking !== (profile.allowsRecurrentBooking ?? true)
            || form.bookingWindowDays !== (profile.bookingWindowDays ?? 30)
            || form.cancellationHours !== (profile.cancellationHours ?? 24)
            || form.encuadre !== (profile.encuadre ?? '')
        : false;

    const handleGeneratePolicies = async () => {
        if (!profile || !form) return;
        setGeneratingPolicies(true);
        setSaveError('');
        const result = await generatePolicies({
            profession: profile.profession ?? '',
            displayName: profile.displayName ?? '',
            cancellationHours: form.cancellationHours,
            bookingWindowDays: form.bookingWindowDays,
            existingText: form.encuadre,
        });
        setGeneratingPolicies(false);
        if (result.text) {
            set('encuadre', result.text);
        } else if (result.error) {
            setSaveError(result.error);
        }
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setSaveError('');
        setSaved(false);
        const result = await saveAgendaProfile(form);
        setSaving(false);
        if (!result.ok) {
            setSaveError(result.error ?? 'No se pudo guardar la configuración.');
            return;
        }
        setProfile((prev) => (prev ? { ...prev, ...form } : prev));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading || !form) {
        return <p className="text-sm text-fg-muted">Cargando configuración…</p>;
    }

    if (!profile) {
        return (
            <PanelCard size="lg" className="text-center">
                <p className="text-sm font-medium text-fg">Completa tus datos comerciales primero</p>
                <p className="mt-1 text-sm text-fg-muted">
                    Define tu nombre y profesión en Página pública y luego configura las reservas aquí.
                </p>
            </PanelCard>
        );
    }

    const automaticSelected = form.confirmationMode === 'auto';

    return (
        <div className="w-full space-y-4">
            <PanelBlockHeader
                title="Configuración del negocio"
                description="Define cómo funcionan tus reservas en línea. Tu zona horaria de consulta se configura en Mi cuenta."
            />

            <PanelCard size="lg" className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-base font-semibold text-fg">Confirmación de citas</p>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
                            Elige si las reservas se confirman al instante o quedan pendientes de tu aprobación.
                        </p>
                    </div>
                    {automaticSelected && !hasChanges ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                            Automático activo
                        </span>
                    ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => set('confirmationMode', 'manual')}
                        className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors ${
                            !automaticSelected
                                ? 'border-accent-border bg-accent-soft text-fg'
                                : 'border-(--border) bg-(--surface) text-fg hover:border-(--border-strong)'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-subtle) text-accent">
                                <IconPointer size={18} />
                            </span>
                            <span className="text-sm font-semibold">Revisar manualmente</span>
                        </span>
                        <span className="mt-3 block text-sm leading-relaxed text-fg-muted">
                            Cada reserva queda pendiente para que la apruebes o rechaces desde el panel.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => set('confirmationMode', 'auto')}
                        className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors ${
                            automaticSelected
                                ? 'border-accent-border bg-accent-soft text-fg'
                                : 'border-(--border) bg-(--surface) text-fg hover:border-(--border-strong)'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-subtle) text-accent">
                                <IconCalendarCheck size={18} />
                            </span>
                            <span className="text-sm font-semibold">Confirmar automáticamente</span>
                        </span>
                        <span className="mt-3 block text-sm leading-relaxed text-fg-muted">
                            Si el horario está disponible, la reserva se confirma sin intervención manual.
                        </span>
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <PanelField label="Ventana de reserva (días)" hint="Cuántos días antes pueden reservar">
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={form.bookingWindowDays}
                            onChange={(e) => set('bookingWindowDays', Number(e.target.value))}
                            className="form-input"
                        />
                    </PanelField>
                    <PanelField label="Aviso de cancelación (horas)" hint="Mínimo de horas para cancelar">
                        <input
                            type="number"
                            min={0}
                            max={168}
                            value={form.cancellationHours}
                            onChange={(e) => set('cancellationHours', Number(e.target.value))}
                            className="form-input"
                        />
                    </PanelField>
                </div>

                <div className="flex items-start gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg">Permitir reservas recurrentes</p>
                        <p className="text-xs mt-0.5 text-fg-muted">
                            Tus {vocab.clients} podrán agendar varias sesiones desde tu página pública.
                        </p>
                    </div>
                    <PanelSwitch
                        checked={form.allowsRecurrentBooking}
                        onChange={(v) => set('allowsRecurrentBooking', v)}
                        size="sm"
                        ariaLabel={form.allowsRecurrentBooking ? 'Desactivar reservas recurrentes' : 'Activar reservas recurrentes'}
                    />
                </div>
            </PanelCard>

            <PanelCard size="lg" className="space-y-4">
                <PanelBlockHeader
                    title="Políticas y condiciones"
                    description={`El ${vocab.client} deberá leerlas y aceptarlas antes de reservar.`}
                    actions={
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleGeneratePolicies()}
                            disabled={generatingPolicies}
                        >
                            {generatingPolicies
                                ? <IconLoader2 size={14} className="animate-spin" />
                                : <IconSparkles size={14} />}
                            {generatingPolicies ? 'Generando…' : 'Generar con IA'}
                        </PanelButton>
                    }
                />
                <PanelField label="Texto de políticas" hint="Puedes generarlas con IA y luego editarlas a tu gusto.">
                    <textarea
                        value={form.encuadre}
                        onChange={(e) => set('encuadre', e.target.value)}
                        placeholder={`Escribe aquí tus políticas y condiciones para los ${vocab.clients}…`}
                        rows={8}
                        className="form-textarea"
                    />
                </PanelField>
            </PanelCard>

            <AgendaBusinessNotificationsSettings embedded />

            <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-3 shadow-sm sm:flex-row sm:items-center sm:justify-end">
                {saveError ? (
                    <p className="flex items-center gap-1.5 text-sm text-(--color-error,#dc2626) sm:mr-auto">
                        <IconAlertCircle size={14} className="shrink-0" />
                        {saveError}
                    </p>
                ) : null}
                {saved ? (
                    <p className="flex items-center gap-1.5 text-sm text-accent sm:mr-auto">
                        <IconCheck size={14} />
                        Configuración guardada
                    </p>
                ) : null}
                <PanelButton
                    variant="accent"
                    onClick={() => void handleSave()}
                    disabled={saving || !hasChanges}
                >
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </PanelButton>
            </div>
        </div>
    );
}
