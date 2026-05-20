'use client';

import { useEffect, useState } from 'react';
import {
    IconAlertCircle,
    IconBuildingBank,
    IconCash,
    IconCheck,
    IconCreditCard,
    IconLink,
    IconLoader2,
} from '@tabler/icons-react';
import {
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelField,
    PanelSwitch,
} from '@simple/ui';
import {
    serenatasApi,
    type ProviderBankTransferData,
    type ProviderBookingMode,
    type ProviderGroup,
} from '@/lib/serenatas-api';
import { FieldInput } from './shared';

const CL_BANKS = [
    'BancoEstado', 'Banco Santander', 'Banco de Chile', 'BCI', 'Scotiabank',
    'Banco Itaú', 'Banco Falabella', 'Banco Ripley', 'BICE', 'Coopeuch', 'Otro',
];

const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro'];

const EMPTY_BANK: ProviderBankTransferData = {
    bank: '',
    accountType: '',
    accountNumber: '',
    holderName: '',
    holderRut: '',
    holderEmail: '',
    alias: '',
};

function applyGroupToForm(group: ProviderGroup) {
    return {
        slaHours: String(group.slaHours ?? 24),
        bufferMinutes: String(group.bufferMinutes ?? 0),
        bookingMode: (group.bookingMode ?? 'manual') as ProviderBookingMode,
        requiresAdvancePayment: group.requiresAdvancePayment ?? false,
        advancePaymentInstructions: group.advancePaymentInstructions ?? '',
        acceptsCash: group.acceptsCash ?? true,
        acceptsTransfer: group.acceptsTransfer ?? false,
        acceptsMp: group.acceptsMp ?? false,
        acceptsPaymentLink: group.acceptsPaymentLink ?? false,
        paymentLinkUrl: group.paymentLinkUrl ?? '',
        bankData: group.bankTransferData
            ? { alias: '', ...group.bankTransferData }
            : { ...EMPTY_BANK },
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

    const anyPaymentMethod = form.acceptsCash || form.acceptsTransfer || form.acceptsMp || form.acceptsPaymentLink;
    const hasBankData = !!(form.bankData.bank && form.bankData.accountNumber && form.bankData.holderName);

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        setSaved(false);

        const sla = Number(form.slaHours);
        const buffer = Number(form.bufferMinutes);
        if (!Number.isFinite(sla) || sla < 1 || sla > 168) {
            setSaveError('El SLA de respuesta debe estar entre 1 y 168 horas.');
            setSaving(false);
            return;
        }
        if (!Number.isFinite(buffer) || buffer < 0 || buffer > 120) {
            setSaveError('El buffer debe estar entre 0 y 120 minutos.');
            setSaving(false);
            return;
        }
        if (form.requiresAdvancePayment && !anyPaymentMethod) {
            setSaveError('Activa al menos un método de pago si exiges anticipo.');
            setSaving(false);
            return;
        }
        if (form.acceptsTransfer && !hasBankData) {
            setSaveError('Completa los datos bancarios para activar transferencia.');
            setSaving(false);
            return;
        }
        if (form.acceptsPaymentLink && !form.paymentLinkUrl.trim()) {
            setSaveError('Ingresa la URL del link de pago.');
            setSaving(false);
            return;
        }

        const bankPayload: ProviderBankTransferData | null = form.acceptsTransfer && hasBankData
            ? {
                ...form.bankData,
                alias: form.bankData.alias?.trim() || undefined,
                holderEmail: form.bankData.holderEmail.trim() || '',
            }
            : null;

        const wantsAutoAccept = form.bookingMode === 'auto_if_available';
        if (wantsAutoAccept && !autoAcceptEligible) {
            setSaveError('No puedes activar la aceptación automática mientras tengas serenatas confirmadas o pendientes de asignar.');
            setSaving(false);
            return;
        }

        const response = await serenatasApi.updateProviderGroup(group.id, {
            slaHours: Math.floor(sla),
            bufferMinutes: Math.floor(buffer),
            bookingMode: wantsAutoAccept && autoAcceptEligible ? 'auto_if_available' : 'manual',
            requiresAdvancePayment: form.requiresAdvancePayment,
            advancePaymentInstructions: form.advancePaymentInstructions.trim() || null,
            acceptsCash: form.acceptsCash,
            acceptsTransfer: form.acceptsTransfer,
            acceptsMp: form.acceptsMp,
            acceptsPaymentLink: form.acceptsPaymentLink,
            paymentLinkUrl: form.acceptsPaymentLink ? form.paymentLinkUrl.trim() || null : null,
            bankTransferData: bankPayload,
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
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-start lg:gap-x-8 xl:gap-x-10">
            <section className="min-w-0 space-y-4">
                <PanelBlockHeader
                    title="Solicitudes"
                    description="Cómo respondes y confirmas pedidos del marketplace."
                />
                <PanelCard size="md">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <PanelField label="SLA de respuesta (horas)" hint="Plazo para responder una solicitud.">
                            <FieldInput
                                type="number"
                                min={1}
                                max={168}
                                value={form.slaHours}
                                onChange={(e) => setForm((prev) => ({ ...prev, slaHours: e.target.value }))}
                            />
                        </PanelField>
                        <PanelField label="Buffer entre eventos (min)" hint="Separación mínima entre serenatas al ofrecer horarios.">
                            <FieldInput
                                type="number"
                                min={0}
                                max={120}
                                value={form.bufferMinutes}
                                onChange={(e) => setForm((prev) => ({ ...prev, bufferMinutes: e.target.value }))}
                            />
                        </PanelField>
                        <PanelField
                            label="Modo de reserva"
                            hint={
                                form.bookingMode === 'auto_if_available'
                                    ? 'Las solicitudes pagadas con horario definido se aceptan solas si el slot está libre.'
                                    : 'Revisas cada solicitud. Si no respondes dentro del SLA, la solicitud expira sola.'
                            }
                            className="sm:col-span-2"
                        >
                            <p className="rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg">
                                {form.bookingMode === 'auto_if_available'
                                    ? 'Automática — cuando tu calendario está libre'
                                    : 'Manual — revisar cada solicitud'}
                            </p>
                        </PanelField>
                        <div className="sm:col-span-2 flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-subtle/60 px-3 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-fg">Aceptación automática</p>
                                <p className="mt-0.5 text-xs text-fg-muted">
                                    {loadingEligibility
                                        ? 'Verificando tu calendario…'
                                        : autoAcceptEligible
                                            ? 'Acepta solicitudes pagadas con horario definido cuando el slot esté libre y no tengas serenatas bloqueantes.'
                                            : blockingCount > 0
                                                ? `Tienes ${blockingCount} serenata${blockingCount === 1 ? '' : 's'} confirmada${blockingCount === 1 ? '' : 's'} o pendiente${blockingCount === 1 ? '' : 's'} de asignar. Completa o cancela antes de activar la aceptación automática.`
                                                : 'No disponible en este momento.'}
                                </p>
                            </div>
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
                </PanelCard>
            </section>

            <section className="min-w-0 space-y-4">
                <PanelBlockHeader
                    title="Pagos"
                    description="Métodos que aceptas y si pides anticipo al cliente."
                />

                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                <IconCreditCard size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-fg">Exigir pago anticipado</p>
                                <p className="mt-0.5 text-xs text-fg-muted">
                                    El cliente verá tus instrucciones antes de confirmar la solicitud.
                                </p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={form.requiresAdvancePayment}
                            onChange={(checked) => setForm((prev) => ({ ...prev, requiresAdvancePayment: checked }))}
                            ariaLabel="Exigir pago anticipado"
                        />
                    </div>
                    {form.requiresAdvancePayment ? (
                        <div className="mt-4 border-t border-border pt-4">
                            {!anyPaymentMethod ? (
                                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                                    <IconAlertCircle size={13} className="mt-0.5 shrink-0" />
                                    Activa al menos un método de pago abajo.
                                </div>
                            ) : null}
                            <PanelField label="Instrucciones de pago" hint="Ej: transferir 50% y enviar comprobante por WhatsApp.">
                                <textarea
                                    value={form.advancePaymentInstructions}
                                    onChange={(e) => setForm((prev) => ({ ...prev, advancePaymentInstructions: e.target.value }))}
                                    rows={3}
                                    className="form-textarea w-full"
                                    placeholder="Indica monto, plazo y cómo enviar el comprobante."
                                />
                            </PanelField>
                        </div>
                    ) : null}
                </PanelCard>

                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                <IconCash size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-fg">Efectivo en el evento</p>
                                <p className="mt-0.5 text-xs text-fg-muted">Cobro el día de la serenata.</p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={form.acceptsCash}
                            onChange={(checked) => setForm((prev) => ({ ...prev, acceptsCash: checked }))}
                            ariaLabel="Aceptar efectivo"
                        />
                    </div>
                </PanelCard>

                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                <IconBuildingBank size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-fg">Transferencia bancaria</p>
                                    {form.acceptsTransfer && hasBankData ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                                            <IconCheck size={10} /> Listo
                                        </span>
                                    ) : null}
                                    {form.acceptsTransfer && !hasBankData ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                            <IconAlertCircle size={10} /> Incompleto
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-fg-muted">Datos que verá el cliente para transferirte.</p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={form.acceptsTransfer}
                            onChange={(checked) => setForm((prev) => ({ ...prev, acceptsTransfer: checked }))}
                            ariaLabel="Aceptar transferencia"
                        />
                    </div>
                    {form.acceptsTransfer ? (
                        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                            <PanelField label="Banco">
                                <select
                                    value={form.bankData.bank}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, bank: e.target.value },
                                    }))}
                                    className="form-select w-full"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {CL_BANKS.map((bank) => (
                                        <option key={bank} value={bank}>{bank}</option>
                                    ))}
                                </select>
                            </PanelField>
                            <PanelField label="Tipo de cuenta">
                                <select
                                    value={form.bankData.accountType}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, accountType: e.target.value },
                                    }))}
                                    className="form-select w-full"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {ACCOUNT_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </PanelField>
                            <PanelField label="Número de cuenta">
                                <input
                                    type="text"
                                    value={form.bankData.accountNumber}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, accountNumber: e.target.value },
                                    }))}
                                    className="form-input w-full"
                                />
                            </PanelField>
                            <PanelField label="Titular">
                                <input
                                    type="text"
                                    value={form.bankData.holderName}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, holderName: e.target.value },
                                    }))}
                                    className="form-input w-full"
                                />
                            </PanelField>
                            <PanelField label="RUT titular">
                                <input
                                    type="text"
                                    value={form.bankData.holderRut}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, holderRut: e.target.value },
                                    }))}
                                    className="form-input w-full"
                                />
                            </PanelField>
                            <PanelField label="Email (opcional)">
                                <input
                                    type="email"
                                    value={form.bankData.holderEmail}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        bankData: { ...prev.bankData, holderEmail: e.target.value },
                                    }))}
                                    className="form-input w-full"
                                />
                            </PanelField>
                        </div>
                    ) : null}
                </PanelCard>

                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                <IconLink size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-fg">Link de pago</p>
                                <p className="mt-0.5 text-xs text-fg-muted">Flow, Khipu, tu tienda, etc.</p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={form.acceptsPaymentLink}
                            onChange={(checked) => setForm((prev) => ({ ...prev, acceptsPaymentLink: checked }))}
                            ariaLabel="Aceptar link de pago"
                        />
                    </div>
                    {form.acceptsPaymentLink ? (
                        <div className="mt-4 border-t border-border pt-4">
                            <PanelField label="URL del link">
                                <input
                                    type="url"
                                    value={form.paymentLinkUrl}
                                    onChange={(e) => setForm((prev) => ({ ...prev, paymentLinkUrl: e.target.value }))}
                                    placeholder="https://..."
                                    className="form-input w-full"
                                />
                            </PanelField>
                        </div>
                    ) : null}
                </PanelCard>

                <PanelCard size="md" className="opacity-80">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-fg">Mercado Pago</p>
                            <p className="mt-0.5 text-xs text-fg-muted">
                                Próximamente: cobro online integrado al confirmar la solicitud.
                            </p>
                        </div>
                        <PanelSwitch
                            checked={form.acceptsMp}
                            onChange={(checked) => setForm((prev) => ({ ...prev, acceptsMp: checked }))}
                            ariaLabel="Aceptar Mercado Pago"
                            disabled
                        />
                    </div>
                </PanelCard>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:col-span-2">
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
                <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando…' : 'Guardar configuración'}
                </PanelButton>
            </div>
        </div>
    );
}
