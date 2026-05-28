'use client';

import { useEffect, useState } from 'react';
import {
    IconAlertCircle,
    IconCalendarCheck,
    IconCheck,
    IconLoader2,
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
        return () => { cancelled = true; };
    }, [group.id]);

    const bookingModeDirty = form.bookingMode !== (group.bookingMode ?? 'manual');

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
        <div className="mx-auto w-full max-w-xl space-y-4">
            <PanelBlockHeader
                title="Solicitudes"
                description="Aceptación automática y alertas cuando llega una solicitud pagada."
            />
            <PanelCard size="md" className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                            <IconCalendarCheck size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-fg">Aceptación automática</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                                {loadingEligibility
                                    ? 'Verificando tu calendario…'
                                    : autoAcceptEligible
                                        ? 'Al pagar el cliente, si el horario está libre la solicitud se acepta sola. Luego asignas el grupo para confirmarla en Agenda.'
                                        : blockingCount > 0
                                            ? `Tienes ${blockingCount} serenata${blockingCount === 1 ? '' : 's'} confirmada${blockingCount === 1 ? '' : 's'} o pendiente${blockingCount === 1 ? '' : 's'} de asignar. Completa o cancela antes de activar.`
                                            : 'No disponible en este momento.'}
                            </p>
                            {bookingModeDirty ? (
                                <p className="mt-2 text-[11px] font-medium text-accent">
                                    Guarda la configuración abajo para aplicar este cambio.
                                </p>
                            ) : null}
                            {form.bookingMode === 'auto_if_available' && !bookingModeDirty ? (
                                <p className="mt-2 text-[11px] text-fg-muted">
                                    Activo. Solo con horario definido y slot libre al pagar el cliente.
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="shrink-0 self-center">
                        <PanelSwitch
                            checked={form.bookingMode === 'auto_if_available'}
                            disabled={loadingEligibility}
                            onChange={(checked) => {
                                if (checked && !autoAcceptEligible) return;
                                setForm((prev) => ({
                                    ...prev,
                                    bookingMode: checked ? 'auto_if_available' : 'manual',
                                }));
                            }}
                            ariaLabel="Aceptación automática cuando el calendario está libre"
                        />
                    </div>
                </div>
                <SolicitudesInboxAlertsSettings embedded />
            </PanelCard>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
                <PanelButton onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando…' : 'Guardar'}
                </PanelButton>
            </div>
        </div>
    );
}
