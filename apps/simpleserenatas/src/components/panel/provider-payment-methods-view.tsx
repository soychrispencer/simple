'use client';

import { useEffect, useState } from 'react';
import {
    IconBuildingBank,
    IconCheck,
    IconCreditCard,
    IconLink,
    IconLoader2,
    IconAlertCircle,
} from '@tabler/icons-react';
import {
    PanelButton,
    PanelCard,
    PanelField,
    PanelNotice,
    PanelSwitch,
    PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE,
} from '@simple/ui/panel';
import {
    serenatasApi,
    type ProviderBankTransferData,
    type ProviderGroup,
} from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { EmptyBlock } from './shared';

const CL_BANKS = [
    'BancoEstado', 'Banco Santander', 'Banco de Chile', 'BCI', 'Scotiabank',
    'Banco Itaú', 'Banco Falabella', 'Banco Ripley', 'BICE', 'Coopeuch', 'Otro',
];

const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro'];

function applyGroup(group: ProviderGroup) {
    return {
        acceptsTransfer: group.acceptsTransfer ?? false,
        acceptsMp: group.acceptsMp ?? false,
        acceptsPaymentLink: group.acceptsPaymentLink ?? false,
        requiresAdvancePayment: group.requiresAdvancePayment ?? false,
        advancePaymentInstructions: group.advancePaymentInstructions ?? '',
        paymentLinkUrl: group.paymentLinkUrl ?? '',
        bankData: {
            bank: group.bankTransferData?.bank ?? '',
            accountType: group.bankTransferData?.accountType ?? '',
            accountNumber: group.bankTransferData?.accountNumber ?? '',
            holderName: group.bankTransferData?.holderName ?? '',
            holderRut: group.bankTransferData?.holderRut ?? '',
            holderEmail: group.bankTransferData?.holderEmail ?? '',
            alias: group.bankTransferData?.alias ?? '',
        } satisfies ProviderBankTransferData & { alias: string },
    };
}

export function ProviderPaymentMethodsView({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, hasMariachi, loading, error } = useMyMariachi();
    const [form, setForm] = useState(() => (mariachi ? applyGroup(mariachi) : null));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (mariachi) setForm(applyGroup(mariachi));
    }, [mariachi?.id, mariachi?.updatedAt]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" /> Cargando medios de pago…
            </div>
        );
    }

    if (error || !hasMariachi || !mariachi || !form) {
        return <EmptyBlock title="Sin mariachi" description="Crea tu grupo en Perfil público para configurar medios de pago." />;
    }

    const anyMethodActive = form.acceptsTransfer || form.acceptsMp || form.acceptsPaymentLink;
    const hasBankData = !!(form.bankData.bank && form.bankData.accountNumber && form.bankData.holderName);

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        setSaved(false);
        const bankPayload: ProviderBankTransferData | null = form.bankData.bank && form.bankData.accountNumber && form.bankData.holderName
            ? {
                bank: form.bankData.bank,
                accountType: form.bankData.accountType,
                accountNumber: form.bankData.accountNumber,
                holderName: form.bankData.holderName,
                holderRut: form.bankData.holderRut,
                holderEmail: form.bankData.holderEmail,
                alias: form.bankData.alias || undefined,
            }
            : null;
        const response = await serenatasApi.updateProviderGroup(mariachi.id, {
            acceptsTransfer: form.acceptsTransfer,
            acceptsMp: form.acceptsMp,
            acceptsPaymentLink: form.acceptsPaymentLink,
            requiresAdvancePayment: form.requiresAdvancePayment,
            advancePaymentInstructions: form.advancePaymentInstructions || null,
            paymentLinkUrl: form.paymentLinkUrl || null,
            bankTransferData: bankPayload,
        });
        setSaving(false);
        if (!response.ok || !response.item) {
            setSaveError(response.error ?? 'No se pudo guardar.');
            return;
        }
        setForm(applyGroup(response.item));
        setSaved(true);
        await refresh();
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="flex flex-col gap-4">
            <PanelNotice tone="info">{PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE}</PanelNotice>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconCreditCard size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-fg">Exigir pago anticipado</p>
                            <p className="text-xs mt-0.5 text-fg-muted">
                                Opcional. El cliente verá las instrucciones antes de confirmar la solicitud.
                            </p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={form.requiresAdvancePayment}
                        onChange={(next) => setForm((prev) => prev ? { ...prev, requiresAdvancePayment: next } : prev)}
                        ariaLabel="Exigir pago anticipado"
                    />
                </div>
                {form.requiresAdvancePayment && (
                    <div className="mt-4 pt-4 border-t border-border">
                        {!anyMethodActive && (
                            <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.08)', color: '#92400e', border: '1px solid rgba(234,179,8,0.2)' }}>
                                <IconAlertCircle size={13} className="shrink-0 mt-0.5" />
                                Activa al menos un medio de pago abajo.
                            </div>
                        )}
                        <PanelField label="Instrucciones de pago">
                            <textarea
                                value={form.advancePaymentInstructions}
                                onChange={(e) => setForm((prev) => prev ? { ...prev, advancePaymentInstructions: e.target.value } : prev)}
                                rows={3}
                                className="form-textarea"
                                placeholder="Ej: Transferir el 50% al confirmar y el resto el día del evento."
                            />
                        </PanelField>
                    </div>
                )}
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconBuildingBank size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-fg">Transferencia bancaria</p>
                            <p className="text-xs mt-0.5 text-fg-muted">Visible en tu perfil público para quien reserve contigo.</p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={form.acceptsTransfer}
                        onChange={(next) => setForm((prev) => prev ? { ...prev, acceptsTransfer: next } : prev)}
                        ariaLabel="Activar transferencia"
                    />
                </div>
                {form.acceptsTransfer && (
                    <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-3">
                        <PanelField label="Banco">
                            <select className="form-select" value={form.bankData.bank} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, bank: e.target.value } } : prev)}>
                                <option value="">— Seleccionar —</option>
                                {CL_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </PanelField>
                        <PanelField label="Tipo de cuenta">
                            <select className="form-select" value={form.bankData.accountType} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, accountType: e.target.value } } : prev)}>
                                <option value="">— Seleccionar —</option>
                                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </PanelField>
                        <PanelField label="Número de cuenta">
                            <input className="form-input" value={form.bankData.accountNumber} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, accountNumber: e.target.value } } : prev)} />
                        </PanelField>
                        <PanelField label="Titular">
                            <input className="form-input" value={form.bankData.holderName} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, holderName: e.target.value } } : prev)} />
                        </PanelField>
                        <PanelField label="RUT">
                            <input className="form-input" value={form.bankData.holderRut} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, holderRut: e.target.value } } : prev)} />
                        </PanelField>
                        <PanelField label="Email titular">
                            <input type="email" className="form-input" value={form.bankData.holderEmail} onChange={(e) => setForm((prev) => prev ? { ...prev, bankData: { ...prev.bankData, holderEmail: e.target.value } } : prev)} />
                        </PanelField>
                        {!hasBankData && (
                            <p className="sm:col-span-2 text-xs text-fg-muted">Completa banco, cuenta y titular para mostrarlo en tu perfil.</p>
                        )}
                    </div>
                )}
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,158,227,0.12)', color: '#009EE3' }}>
                            <IconCreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-fg">MercadoPago</p>
                            <p className="text-xs mt-0.5 text-fg-muted">Acepta pagos con tarjeta o débito. Sin comisión de Simple.</p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={form.acceptsMp}
                        onChange={(next) => setForm((prev) => prev ? { ...prev, acceptsMp: next } : prev)}
                        ariaLabel="Activar MercadoPago"
                    />
                </div>
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconLink size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-fg">Link de pago</p>
                            <p className="text-xs mt-0.5 text-fg-muted">Tu link de Flow, Khipu u otro procesador.</p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={form.acceptsPaymentLink}
                        onChange={(next) => setForm((prev) => prev ? { ...prev, acceptsPaymentLink: next } : prev)}
                        ariaLabel="Activar link de pago"
                    />
                </div>
                {form.acceptsPaymentLink && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <PanelField label="URL del link">
                            <input
                                type="url"
                                className="form-input"
                                value={form.paymentLinkUrl}
                                onChange={(e) => setForm((prev) => prev ? { ...prev, paymentLinkUrl: e.target.value } : prev)}
                                placeholder="https://..."
                            />
                        </PanelField>
                    </div>
                )}
            </PanelCard>

            {saveError ? <PanelNotice tone="error">{saveError}</PanelNotice> : null}
            {saved ? (
                <PanelNotice tone="success">
                    <span className="inline-flex items-center gap-2"><IconCheck size={14} /> Medios de pago guardados.</span>
                </PanelNotice>
            ) : null}

            <div className="flex justify-end">
                <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                    Guardar
                </PanelButton>
            </div>
        </div>
    );
}
