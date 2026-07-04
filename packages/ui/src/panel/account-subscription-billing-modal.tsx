'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import type { AddressBookEntry } from '@simple/types';
import {
    fetchAccountBusinessLegal,
    fetchAddressBook,
    formatAddressBookEntryLabel,
    updateAccountBusinessBilling,
} from '@simple/utils';
import { ACCOUNT_BILLING_ADDRESS_BLOCK, ACCOUNT_SUBSCRIPTION_BILLING_BLOCK } from './account-copy.js';
import { BusinessCatalogServiceModal } from './business-catalog-service-modal.js';
import { PanelButton } from './panel-button.js';
import { PanelField } from './panel-display.js';
import { PanelNotice } from './panel-primitives.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { PanelSelect } from './panel-select.js';

export type AccountSubscriptionBillingModalProps = {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
};

export function AccountSubscriptionBillingModal({
    open,
    onClose,
    onSaved,
}: AccountSubscriptionBillingModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ businessLegalName: '', businessTaxId: '' });
    const [billingAddressId, setBillingAddressId] = useState<string | null>(null);
    const [addressOptions, setAddressOptions] = useState<AddressBookEntry[]>([]);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setSaveError(null);
        setSaved(false);
        void (async () => {
            const [legal, personal, business] = await Promise.all([
                fetchAccountBusinessLegal(),
                fetchAddressBook({ scope: 'personal' }),
                fetchAddressBook({ scope: 'business' }),
            ]);
            if (legal) {
                setForm({
                    businessLegalName: legal.businessLegalName ?? '',
                    businessTaxId: legal.businessTaxId ?? '',
                });
                setBillingAddressId(legal.billingAddressId ?? null);
            }
            setAddressOptions([
                ...(personal.ok ? personal.items : []),
                ...(business.ok ? business.items : []),
            ]);
            setLoading(false);
        })();
    }, [open]);

    const billingOptions = useMemo(
        () => addressOptions.map((entry) => ({
            value: entry.id,
            label: formatAddressBookEntryLabel(entry),
        })),
        [addressOptions],
    );

    const handleSave = () => {
        setSaveError(null);
        setSaved(false);
        if (!form.businessLegalName.trim()) {
            setSaveError('Ingresa la razón social.');
            return;
        }
        if (!form.businessTaxId.trim()) {
            setSaveError('Ingresa el RUT de la empresa.');
            return;
        }
        if (!billingAddressId) {
            setSaveError('Selecciona una dirección tributaria.');
            return;
        }
        startTransition(async () => {
            setSaving(true);
            const result = await updateAccountBusinessBilling({
                businessLegalName: form.businessLegalName,
                businessTaxId: form.businessTaxId,
                billingAddressId,
            });
            setSaving(false);
            if (!result.ok) {
                setSaveError(result.error ?? 'No pudimos guardar los datos de facturación.');
                return;
            }
            setSaved(true);
        });
    };

    return (
        <BusinessCatalogServiceModal
            open={open}
            title={ACCOUNT_SUBSCRIPTION_BILLING_BLOCK.title}
            description={ACCOUNT_SUBSCRIPTION_BILLING_BLOCK.description}
            onClose={onClose}
            actions={(
                <>
                    {saveError ? (
                        <p className="w-full text-sm text-(--color-error,#dc2626) sm:mr-auto sm:w-auto">{saveError}</p>
                    ) : null}
                    <PanelButton variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
                        Cerrar
                    </PanelButton>
                    <PanelButton variant="accent" size="sm" onClick={handleSave} disabled={isPending || loading}>
                        {isPending ? <IconLoader2 size={14} className="animate-spin" /> : null}
                        {isPending ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}
                    </PanelButton>
                </>
            )}
        >
            {loading ? (
                <p className="text-sm text-fg-muted md:col-span-2">Cargando…</p>
            ) : (
                <>
                    <PanelField label="Razón social" required className="md:col-span-2">
                        <input
                            type="text"
                            value={form.businessLegalName}
                            onChange={(event) => {
                                setSaved(false);
                                setForm((current) => ({
                                    ...current,
                                    businessLegalName: event.target.value,
                                }));
                            }}
                            className={PANEL_INPUT_CLASS}
                            placeholder="Inmobiliaria Ejemplo SpA"
                            autoComplete="organization"
                        />
                    </PanelField>
                    <PanelField label="RUT empresa" required>
                        <input
                            type="text"
                            value={form.businessTaxId}
                            onChange={(event) => {
                                setSaved(false);
                                setForm((current) => ({
                                    ...current,
                                    businessTaxId: event.target.value,
                                }));
                            }}
                            className={PANEL_INPUT_CLASS}
                            placeholder="76.123.456-7"
                        />
                    </PanelField>
                    <PanelField label="Dirección tributaria" required>
                        <PanelSelect
                            value={billingAddressId ?? ''}
                            placeholder={ACCOUNT_BILLING_ADDRESS_BLOCK.emptyOption}
                            onChange={(event) => {
                                setSaved(false);
                                setBillingAddressId(event.target.value || null);
                            }}
                        >
                            <option value="">{ACCOUNT_BILLING_ADDRESS_BLOCK.emptyOption}</option>
                            {billingOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </PanelSelect>
                    </PanelField>
                    <div className="md:col-span-2">
                        <PanelNotice tone="neutral">
                            {ACCOUNT_BILLING_ADDRESS_BLOCK.description}
                            {' '}
                            <Link href="/panel/mi-cuenta/ubicacion" className="font-medium text-accent underline">
                                Gestionar direcciones
                            </Link>
                        </PanelNotice>
                    </div>
                </>
            )}
        </BusinessCatalogServiceModal>
    );
}
