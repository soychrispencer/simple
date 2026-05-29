'use client';

import { useEffect, useState } from 'react';
import {
    IconAlertCircle,
    IconCalendarCheck,
    IconCheck,
    IconLoader2,
    IconPointer,
} from '@tabler/icons-react';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelSwitch } from '@simple/ui/panel';
import {
    serenatasApi,
    type ProviderBookingMode,
    type ProviderGroup,
} from '@/lib/serenatas-api';
import { SolicitudesInboxAlertsSettings } from '@/components/panel/account/solicitudes-inbox-alerts-settings';

function applyGroupToForm(group: ProviderGroup) {
    return {
        bookingMode: (group.bookingMode ?? 'manual') as ProviderBookingMode,
    };
}

export function ProviderSettingsEditor({
    group,
    onSaved,
}: {
    group: ProviderGroup;
    onSaved: () => Promise<void>;
}) {
    const [form, setForm] = useState(() => applyGroupToForm(group));
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const [autoAcceptEligible, setAutoAcceptEligible] = useState<boolean | null>(null);
    const [blockingCount, setBlockingCount] = useState(0);
    const [loadingEligibility, setLoadingEligibility] = useState(true);

    useEffect(() => {
        setForm(applyGroupToForm(group));
        setSaveError('');
        setSaved(false);
    }, [group.id, group.updatedAt]);

    useEffect(() => {
        let cancelled = false;
        setLoadingEligibility(true);
        void serenatasApi.providerGroupAutoAcceptEligibility(group.id).then((response) => {
            if (cancelled) return;
            setAutoAcceptEligible(response.ok ? response.eligible ?? false : false);
            setBlockingCount(response.ok ? response.blockingCount ?? 0 : 0);
            setLoadingEligibility(false);
        });
        return () => {
            cancelled = true;
        };
    }, [group.id]);

    const bookingModeDirty = form.bookingMode !== (group.bookingMode ?? 'manual');
    const hasChanges = bookingModeDirty;
    const automaticSelected = form.bookingMode === 'auto_if_available';

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        setSaved(false);

        const wantsAutoAccept = form.bookingMode === 'auto_if_available';
        if (wantsAutoAccept && !autoAcceptEligible) {
            setSaveError('No puedes activar la aceptación automática mientras tengas serenatas confirmadas o pendientes de asignar.');
            setSaving(false);
            return;
        }

        const response = await serenatasApi.updateProviderGroup(group.id, {
            bookingMode: wantsAutoAccept && autoAcceptEligible ? 'auto_if_available' : 'manual',
        });

        setSaving(false);
        if (!response.ok || !response.item) {
            setSaveError(response.error ?? 'No se pudo guardar la configuración.');
            return;
        }
        setForm(applyGroupToForm(response.item));
        setSaved(true);
        await onSaved();
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="w-full space-y-4">
            <PanelBlockHeader
                title="Configuración del negocio"
                description="Define cómo responderás las solicitudes pagadas y cómo quieres recibir los avisos."
            />

            <PanelCard size="lg" className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-base font-semibold text-fg">Respuesta a solicitudes</p>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
                            Elige si cada solicitud queda para revisión manual o si se acepta sola cuando el horario
                            está disponible.
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
                        onClick={() => setForm((prev) => ({ ...prev, bookingMode: 'manual' }))}
                        className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors ${
                            !automaticSelected
                                ? 'border-accent-border bg-accent-soft text-fg'
                                : 'border-[var(--border)] bg-[var(--surface)] text-fg hover:border-[var(--border-strong)]'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-accent">
                                <IconPointer size={18} />
                            </span>
                            <span className="text-sm font-semibold">Revisar manualmente</span>
                        </span>
                        <span className="mt-3 block text-sm leading-relaxed text-fg-muted">
                            Cada solicitud pagada queda pendiente para que la aceptes, rechaces o coordines desde el
                            panel.
                        </span>
                    </button>

                    <button
                        type="button"
                        disabled={loadingEligibility || autoAcceptEligible === false}
                        onClick={() => setForm((prev) => ({ ...prev, bookingMode: 'auto_if_available' }))}
                        className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            automaticSelected
                                ? 'border-accent-border bg-accent-soft text-fg'
                                : 'border-[var(--border)] bg-[var(--surface)] text-fg hover:border-[var(--border-strong)]'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-accent">
                                <IconCalendarCheck size={18} />
                            </span>
                            <span className="text-sm font-semibold">Aceptar automáticamente</span>
                        </span>
                        <span className="mt-3 block text-sm leading-relaxed text-fg-muted">
                            Si el cliente paga y el horario está libre, la solicitud se acepta sin que tengas que
                            responderla a mano.
                        </span>
                    </button>
                </div>

                <p className="text-sm leading-relaxed text-fg-muted">
                    {loadingEligibility
                        ? 'Verificando tu calendario y solicitudes activas...'
                        : autoAcceptEligible
                            ? 'La aceptación automática está disponible para este negocio.'
                            : blockingCount > 0
                                ? `La aceptación automática no está disponible: tienes ${blockingCount} serenata${blockingCount === 1 ? '' : 's'} confirmada${blockingCount === 1 ? '' : 's'} o pendiente${blockingCount === 1 ? '' : 's'} de asignar. Completa o cancela esas solicitudes antes de activarla.`
                                : 'La aceptación automática no está disponible en este momento.'}
                </p>
            </PanelCard>

            <PanelCard size="lg" className="space-y-4">
                <div>
                    <p className="text-base font-semibold text-fg">Alertas de solicitudes</p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                        Configura los avisos cuando llegue una solicitud pagada del marketplace.
                    </p>
                </div>
                <SolicitudesInboxAlertsSettings embedded />
            </PanelCard>

            <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-end">
                {saveError ? (
                    <p className="flex items-center gap-1.5 text-sm text-[var(--color-error,#dc2626)] sm:mr-auto">
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
                {!saveError && !saved ? (
                    <p className="text-sm text-fg-muted sm:mr-auto">
                        {hasChanges ? 'Tienes cambios sin guardar.' : 'Sin cambios pendientes.'}
                    </p>
                ) : null}
                <PanelButton onClick={() => void handleSave()} disabled={saving || !hasChanges} variant="secondary">
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando...' : 'Guardar'}
                </PanelButton>
            </div>
        </div>
    );
}
