'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
    IconAlertCircle,
    IconBuildingBank,
    IconCash,
    IconCheck,
    IconCreditCard,
    IconExternalLink,
    IconLink,
    IconLoader2,
} from '@tabler/icons-react';
import type { BusinessPaymentMethodsValue } from '@simple/utils';
import {
    CL_BANKS,
    BANK_ACCOUNT_TYPES,
    getBusinessPaymentMethodsSaveError,
    hasCompleteBankTransferData,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PanelNotice, PanelSwitch } from './panel-primitives.js';
import { PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE } from './business-copy.js';

export type BusinessPaymentMethodsMercadoPagoConfig = {
    mode: 'oauth' | 'toggle';
    connected?: boolean;
    integrationsHref?: string | null;
};

export type BusinessPaymentMethodsEditorCopy = {
    advancePaymentTitle?: string;
    advancePaymentDescription?: string;
    advancePaymentInstructionsHint?: string;
    transferDescription?: string;
    mercadoPagoDescription?: string;
    paymentLinkDescription?: string;
};

export type BusinessPaymentMethodsEditorProps = {
    value: BusinessPaymentMethodsValue;
    onChange: (value: BusinessPaymentMethodsValue) => void;
    onSave: () => void | Promise<void>;
    saving?: boolean;
    saved?: boolean;
    saveError?: string | null;
    mercadoPago?: BusinessPaymentMethodsMercadoPagoConfig;
    copy?: BusinessPaymentMethodsEditorCopy;
    showSubscriptionNotice?: boolean;
    hideSaveButton?: boolean;
};

const DEFAULT_COPY: Required<BusinessPaymentMethodsEditorCopy> = {
    advancePaymentTitle: 'Exigir pago anticipado',
    advancePaymentDescription: 'Aplica a cualquier método activo. Tu cliente verá las instrucciones antes de confirmar.',
    advancePaymentInstructionsHint: 'Se muestran al cliente en la pantalla de confirmación.',
    transferDescription: 'El cliente recibirá tus datos para transferirte.',
    mercadoPagoDescription: 'Cobros online con tarjeta o débito en tu cuenta de MercadoPago. Sin comisión de Simple.',
    paymentLinkDescription: 'Comparte cualquier link: MercadoPago, Webpay, Flow, etc.',
};

function patchValue(
    value: BusinessPaymentMethodsValue,
    patch: Partial<BusinessPaymentMethodsValue>,
): BusinessPaymentMethodsValue {
    return { ...value, ...patch };
}

function patchBankData(
    value: BusinessPaymentMethodsValue,
    patch: Partial<BusinessPaymentMethodsValue['bankTransferData']>,
): BusinessPaymentMethodsValue {
    return {
        ...value,
        bankTransferData: {
            ...value.bankTransferData,
            ...patch,
        },
    };
}

export function BusinessPaymentMethodsEditor({
    value,
    onChange,
    onSave,
    saving = false,
    saved = false,
    saveError = null,
    mercadoPago = { mode: 'toggle' },
    copy,
    showSubscriptionNotice = true,
    hideSaveButton = false,
}: BusinessPaymentMethodsEditorProps) {
    const labels = {
        ...DEFAULT_COPY,
        ...copy,
        mercadoPagoDescription:
            copy?.mercadoPagoDescription
            ?? (mercadoPago.mode === 'toggle'
                ? 'Indica que aceptas MercadoPago. El cobro lo coordinas directamente con tu cliente.'
                : DEFAULT_COPY.mercadoPagoDescription),
    };
    const anyMethodActive = value.acceptsTransfer || value.acceptsMp || value.acceptsPaymentLink;
    const hasBankData = hasCompleteBankTransferData(value.bankTransferData);
    const mpConnected = mercadoPago.connected ?? false;
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        setValidationError(null);
    }, [value]);

    const handleSave = async () => {
        const clientError = getBusinessPaymentMethodsSaveError(value);
        if (clientError) {
            setValidationError(clientError);
            return;
        }
        setValidationError(null);
        await onSave();
    };

    const displayedSaveError = validationError ?? saveError;

    return (
        <div className="flex flex-col gap-4">
            {showSubscriptionNotice ? (
                <PanelNotice tone="info">{PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE}</PanelNotice>
            ) : null}

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <IconCreditCard size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                {labels.advancePaymentTitle}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {labels.advancePaymentDescription}
                            </p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={value.requiresAdvancePayment}
                        onChange={(next: boolean) => onChange(patchValue(value, { requiresAdvancePayment: next }))}
                        ariaLabel={labels.advancePaymentTitle}
                    />
                </div>

                {value.requiresAdvancePayment ? (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        {!anyMethodActive ? (
                            <div
                                className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl text-xs"
                                style={{
                                    background: 'rgba(234,179,8,0.08)',
                                    color: '#92400e',
                                    border: '1px solid rgba(234,179,8,0.2)',
                                }}
                            >
                                <IconAlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                Activa al menos un medio de pago abajo para que esto tenga efecto.
                            </div>
                        ) : null}
                        <PanelField label="Instrucciones de pago" hint={labels.advancePaymentInstructionsHint}>
                            <textarea
                                value={value.advancePaymentInstructions}
                                onChange={(event) => onChange(patchValue(value, { advancePaymentInstructions: event.target.value }))}
                                placeholder="Ej: Transferir antes de confirmar y enviar comprobante por WhatsApp."
                                rows={3}
                                className="form-textarea"
                            />
                        </PanelField>
                    </div>
                ) : null}
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                background: value.acceptsTransfer ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)',
                                color: 'var(--accent)',
                            }}
                        >
                            <IconBuildingBank size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    Transferencia bancaria
                                </p>
                                {value.acceptsTransfer && hasBankData ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                                    >
                                        <IconCheck size={10} /> Activo
                                    </span>
                                ) : null}
                                {value.acceptsTransfer && !hasBankData ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(234,179,8,0.1)', color: '#92400e' }}
                                    >
                                        <IconAlertCircle size={10} /> Incompleto
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {labels.transferDescription}
                            </p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={value.acceptsTransfer}
                        onChange={(next: boolean) => onChange(patchValue(value, { acceptsTransfer: next }))}
                        ariaLabel="Activar transferencia bancaria"
                    />
                </div>

                {value.acceptsTransfer ? (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--fg)' }}>
                            Datos de tu cuenta
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <PanelField label="Banco">
                                <select
                                    value={value.bankTransferData.bank}
                                    onChange={(event) => onChange(patchBankData(value, { bank: event.target.value }))}
                                    className="form-select"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {CL_BANKS.map((bank) => (
                                        <option key={bank} value={bank}>{bank}</option>
                                    ))}
                                </select>
                            </PanelField>
                            <PanelField label="Tipo de cuenta">
                                <select
                                    value={value.bankTransferData.accountType}
                                    onChange={(event) => onChange(patchBankData(value, { accountType: event.target.value }))}
                                    className="form-select"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {BANK_ACCOUNT_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </PanelField>
                            <PanelField label="Número de cuenta">
                                <input
                                    type="text"
                                    value={value.bankTransferData.accountNumber}
                                    onChange={(event) => onChange(patchBankData(value, { accountNumber: event.target.value }))}
                                    placeholder="123456789"
                                    className="form-input"
                                />
                            </PanelField>
                            <PanelField label="Nombre del titular">
                                <input
                                    type="text"
                                    value={value.bankTransferData.holderName}
                                    onChange={(event) => onChange(patchBankData(value, { holderName: event.target.value }))}
                                    placeholder="María González"
                                    className="form-input"
                                />
                            </PanelField>
                            <PanelField label="RUT del titular">
                                <input
                                    type="text"
                                    value={value.bankTransferData.holderRut}
                                    onChange={(event) => onChange(patchBankData(value, { holderRut: event.target.value }))}
                                    placeholder="12.345.678-9"
                                    className="form-input"
                                />
                            </PanelField>
                            <PanelField label="Email del titular">
                                <input
                                    type="email"
                                    value={value.bankTransferData.holderEmail}
                                    onChange={(event) => onChange(patchBankData(value, { holderEmail: event.target.value }))}
                                    placeholder="tu@email.com"
                                    className="form-input"
                                />
                            </PanelField>
                            <PanelField label="Alias / mensaje (opcional)" className="sm:col-span-2">
                                <input
                                    type="text"
                                    value={value.bankTransferData.alias}
                                    onChange={(event) => onChange(patchBankData(value, { alias: event.target.value }))}
                                    placeholder="Ej: Pago reserva"
                                    className="form-input"
                                />
                            </PanelField>
                        </div>
                    </div>
                ) : null}
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                background: value.acceptsMp ? 'rgba(0,158,227,0.12)' : 'var(--accent-soft)',
                                color: '#009EE3',
                            }}
                        >
                            <IconCash size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    MercadoPago
                                </p>
                                {value.acceptsMp && mercadoPago.mode === 'oauth' && mpConnected ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                                    >
                                        <IconCheck size={10} /> Conectado
                                    </span>
                                ) : null}
                                {value.acceptsMp && mercadoPago.mode === 'toggle' ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                    >
                                        Solo informativo
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {labels.mercadoPagoDescription}
                            </p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={value.acceptsMp}
                        onChange={(next: boolean) => onChange(patchValue(value, { acceptsMp: next }))}
                        ariaLabel="Activar MercadoPago"
                    />
                </div>

                {value.acceptsMp && mercadoPago.mode === 'oauth' && !mpConnected ? (
                    <div className="mt-4 pt-4 flex items-start gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <IconAlertCircle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                Cuenta no conectada
                            </p>
                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                Para cobrar con checkout automático en reservas necesitas conectar tu cuenta de MercadoPago.
                            </p>
                            {mercadoPago.integrationsHref ? (
                                <Link
                                    href={mercadoPago.integrationsHref}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                                    style={{ background: '#009EE3', color: '#fff' }}
                                >
                                    <IconExternalLink size={12} />
                                    Conectar en Integraciones
                                </Link>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {value.acceptsMp && mercadoPago.mode === 'oauth' && mpConnected && mercadoPago.integrationsHref ? (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            Los cobros van directo a tu cuenta de MercadoPago. Puedes desconectarla en{' '}
                            <Link href={mercadoPago.integrationsHref} className="font-medium text-accent hover:underline">
                                Mi cuenta → Integraciones
                            </Link>
                            .
                        </p>
                    </div>
                ) : null}

                {value.acceptsMp && mercadoPago.mode === 'toggle' ? (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <PanelNotice tone="neutral">
                            <p>
                                Esta app no conecta tu cuenta de MercadoPago. El switch solo indica en tu perfil público que aceptas ese medio; el cobro lo coordinas tú con el cliente.
                            </p>
                            <p className="mt-2">
                                Si quieres compartir un link de cobro, usa <strong>Link de pago</strong> con tu URL de MercadoPago, Flow u otro procesador.
                            </p>
                        </PanelNotice>
                    </div>
                ) : null}
            </PanelCard>

            <PanelCard size="md">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                background: value.acceptsPaymentLink ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)',
                                color: 'var(--accent)',
                            }}
                        >
                            <IconLink size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    Link de pago
                                </p>
                                {value.acceptsPaymentLink && value.paymentLinkUrl.trim() ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                                    >
                                        <IconCheck size={10} /> Activo
                                    </span>
                                ) : null}
                                {value.acceptsPaymentLink && !value.paymentLinkUrl.trim() ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: 'rgba(234,179,8,0.1)', color: '#92400e' }}
                                    >
                                        <IconAlertCircle size={10} /> Falta URL
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {labels.paymentLinkDescription}
                            </p>
                        </div>
                    </div>
                    <PanelSwitch
                        checked={value.acceptsPaymentLink}
                        onChange={(next: boolean) => onChange(patchValue(value, { acceptsPaymentLink: next }))}
                        ariaLabel="Activar link de pago"
                    />
                </div>

                {value.acceptsPaymentLink ? (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <PanelField label="URL del link de pago">
                            <input
                                type="url"
                                value={value.paymentLinkUrl}
                                onChange={(event) => onChange(patchValue(value, { paymentLinkUrl: event.target.value }))}
                                placeholder="https://mpago.la/tu-link-de-pago"
                                className="form-input"
                            />
                        </PanelField>
                    </div>
                ) : null}
            </PanelCard>

            {displayedSaveError ? <PanelNotice tone="error">{displayedSaveError}</PanelNotice> : null}

            {hideSaveButton ? null : (
                <div>
                    <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving}>
                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : saved ? <IconCheck size={14} /> : null}
                        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                    </PanelButton>
                </div>
            )}
        </div>
    );
}
