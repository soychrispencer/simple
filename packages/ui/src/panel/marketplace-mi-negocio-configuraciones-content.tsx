'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import type { PublicProfileVertical } from '@simple/utils';
import {
    BusinessBookingPoliciesSection,
} from './business-booking-policies-section.js';
import {
    BusinessPaymentMethodsEditor,
} from './business-payment-methods-editor.js';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelSectionSaveFooter } from './panel-section-save-footer.js';
import { BUSINESS_PAYMENT_METHODS_PAGE } from './finance-copy.js';
import {
    bookingTermsFromRecord,
    businessPaymentMethodsFromRecord,
    emptyBusinessPaymentMethodsValue,
    fetchAccountPublicProfile,
    fetchMercadoPagoIntegrationStatus,
    fetchPublicProfileBookingTerms,
    fetchPublicProfilePaymentMethods,
    generateBusinessBookingPolicies,
    getBusinessPaymentMethodsSaveError,
    updatePublicProfileBookingTerms,
    updatePublicProfilePaymentMethods,
    type BusinessPaymentMethodsValue,
} from '@simple/utils';

export function MarketplaceMiNegocioConfiguracionesContent({ vertical }: { vertical: PublicProfileVertical }) {
    const [loading, setLoading] = useState(true);
    const [paymentBaseline, setPaymentBaseline] = useState<BusinessPaymentMethodsValue>(emptyBusinessPaymentMethodsValue());
    const [paymentForm, setPaymentForm] = useState<BusinessPaymentMethodsValue>(emptyBusinessPaymentMethodsValue());
    const [termsBaseline, setTermsBaseline] = useState('');
    const [termsForm, setTermsForm] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [mpConnected, setMpConnected] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [loadError, setLoadError] = useState('');
    const [generatingPolicies, setGeneratingPolicies] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        const [paymentResponse, termsResponse, profileResponse, mpStatus] = await Promise.all([
            fetchPublicProfilePaymentMethods(vertical),
            fetchPublicProfileBookingTerms(vertical),
            fetchAccountPublicProfile(vertical),
            fetchMercadoPagoIntegrationStatus(vertical),
        ]);
        if (!paymentResponse.ok || !paymentResponse.paymentMethods) {
            setLoadError(paymentResponse.error ?? 'No pudimos cargar la configuración.');
            setLoading(false);
            return;
        }
        const payment = businessPaymentMethodsFromRecord(paymentResponse.paymentMethods);
        const terms = bookingTermsFromRecord({ bookingTermsText: termsResponse.bookingTermsText });
        setPaymentForm(payment);
        setPaymentBaseline(payment);
        setTermsForm(terms);
        setTermsBaseline(terms);
        setBusinessName(profileResponse?.profile?.displayName?.trim() ?? '');
        setMpConnected(Boolean(mpStatus?.connected ?? paymentResponse.paymentMethods.mpConnected));
        setLoading(false);
    }, [vertical]);

    useEffect(() => {
        void load();
    }, [load]);

    const hasChanges = useMemo(
        () => JSON.stringify(paymentForm) !== JSON.stringify(paymentBaseline) || termsForm !== termsBaseline,
        [paymentForm, paymentBaseline, termsForm, termsBaseline],
    );

    const handleGeneratePolicies = async () => {
        setGeneratingPolicies(true);
        setSaveError('');
        const result = await generateBusinessBookingPolicies({
            vertical,
            displayName: businessName,
            businessName,
            clientLabel: 'cliente',
        });
        setGeneratingPolicies(false);
        if (result.ok && result.text) {
            setTermsForm(result.text);
        } else if (result.error) {
            setSaveError(result.error);
        }
    };

    const handleSave = async () => {
        const paymentError = getBusinessPaymentMethodsSaveError(paymentForm);
        if (paymentError) {
            setSaveError(paymentError);
            return;
        }
        setSaving(true);
        setSaveError('');
        setSaved(false);

        const paymentDirty = JSON.stringify(paymentForm) !== JSON.stringify(paymentBaseline);
        const termsDirty = termsForm !== termsBaseline;

        if (paymentDirty) {
            const paymentResponse = await updatePublicProfilePaymentMethods(vertical, paymentForm);
            if (!paymentResponse.ok || !paymentResponse.paymentMethods) {
                setSaving(false);
                setSaveError(paymentResponse.error ?? 'No pudimos guardar los medios de pago.');
                return;
            }
            const nextPayment = businessPaymentMethodsFromRecord(paymentResponse.paymentMethods);
            setPaymentForm(nextPayment);
            setPaymentBaseline(nextPayment);
        }

        if (termsDirty) {
            const termsResponse = await updatePublicProfileBookingTerms(vertical, termsForm);
            if (!termsResponse.ok) {
                setSaving(false);
                setSaveError(termsResponse.error ?? 'No pudimos guardar las políticas.');
                return;
            }
            const nextTerms = bookingTermsFromRecord({ bookingTermsText: termsResponse.bookingTermsText });
            setTermsForm(nextTerms);
            setTermsBaseline(nextTerms);
        }

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" /> Cargando configuración…
            </div>
        );
    }

    if (loadError) {
        return <PanelNotice tone="error">{loadError}</PanelNotice>;
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-6">
            <div className="space-y-4">
                <PanelBlockHeader
                    title={BUSINESS_PAYMENT_METHODS_PAGE.title}
                    description={BUSINESS_PAYMENT_METHODS_PAGE.description}
                    className="mb-0"
                />
                <BusinessPaymentMethodsEditor
                    value={paymentForm}
                    onChange={(next) => {
                        setSaved(false);
                        setPaymentForm(next);
                    }}
                    onSave={handleSave}
                    hideSaveButton
                    mercadoPago={{
                        mode: 'oauth',
                        connected: mpConnected,
                        integrationsHref: '/panel/mi-cuenta/integraciones',
                    }}
                />
            </div>

            <BusinessBookingPoliciesSection
                value={termsForm}
                onChange={(next) => {
                    setSaved(false);
                    setTermsForm(next);
                }}
                clientLabel="cliente"
                generating={generatingPolicies}
                onGenerate={handleGeneratePolicies}
            />

            <PanelSectionSaveFooter
                saving={saving}
                saved={saved}
                saveError={saveError}
                disabled={!hasChanges}
                onSave={handleSave}
            />
        </div>
    );
}
