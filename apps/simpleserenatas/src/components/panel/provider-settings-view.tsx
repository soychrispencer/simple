'use client';

import { useEffect, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import {
    BusinessBookingResponseModeCard,
    BusinessBookingRulesFields,
    BusinessBookingPoliciesSection,
    BusinessMiNegocioConfiguracionesLayout,
    BusinessPaymentMethodsEditor,
    BUSINESS_PAYMENT_METHODS_PAGE,
    PanelBlockHeader,
    PanelButton,
    PanelNotice,
    PanelSectionSaveFooter,
} from '@simple/ui/panel';
import {
    businessPaymentMethodsFromRecord,
    businessBookingRulesFromRecord,
    businessBookingRulesEqual,
    bookingTermsFromRecord,
    emptyBusinessPaymentMethodsValue,
    fetchMercadoPagoIntegrationStatus,
    generateBusinessBookingPolicies,
    getBusinessPaymentMethodsSaveError,
    serializeBusinessPaymentMethodsWrite,
    serializeBookingTermsWrite,
    type BusinessPaymentMethodsValue,
} from '@simple/utils';
import {
    serenatasApi,
    type ProviderBookingMode,
    type ProviderGroup,
} from '@/lib/serenatas-api';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import {
    OwnerOperationalAlertsSettings,
    useOwnerBusinessNotificationPrefs,
} from '@/components/panel/owner-business-notification-settings';

function applyGroupToBookingForm(group: ProviderGroup) {
    return {
        bookingMode: (group.bookingMode ?? 'manual') as ProviderBookingMode,
        ...businessBookingRulesFromRecord(group),
        bookingTermsText: bookingTermsFromRecord(group),
    };
}

function bookingRulesDirty(group: ProviderGroup, form: ReturnType<typeof applyGroupToBookingForm>): boolean {
    const baseline = businessBookingRulesFromRecord(group);
    const rulesDirty = !businessBookingRulesEqual(form, baseline, { includeSla: true });
    const termsDirty = form.bookingTermsText !== bookingTermsFromRecord(group);
    return rulesDirty || termsDirty;
}

function paymentFormDirty(group: ProviderGroup, form: BusinessPaymentMethodsValue): boolean {
    return JSON.stringify(form) !== JSON.stringify(businessPaymentMethodsFromRecord(group));
}

export function ProviderSettingsView({ refresh }: { refresh: () => Promise<void> }) {
    const { group, loading, error, refresh: refreshAll, ensureGroup } = useProviderGroupScope(refresh);
    const notificationPrefs = useOwnerBusinessNotificationPrefs();
    const [bookingForm, setBookingForm] = useState(() => ({
        bookingMode: 'manual' as ProviderBookingMode,
        ...businessBookingRulesFromRecord(null),
        bookingTermsText: '',
    }));
    const [paymentForm, setPaymentForm] = useState<BusinessPaymentMethodsValue>(emptyBusinessPaymentMethodsValue());
    const [mpConnected, setMpConnected] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const [autoAcceptEligible, setAutoAcceptEligible] = useState<boolean | null>(null);
    const [blockingCount, setBlockingCount] = useState(0);
    const [loadingEligibility, setLoadingEligibility] = useState(true);
    const [generatingPolicies, setGeneratingPolicies] = useState(false);

    useEffect(() => {
        if (!group) return;
        setBookingForm(applyGroupToBookingForm(group));
        setPaymentForm(businessPaymentMethodsFromRecord(group));
        setSaveError('');
        setSaved(false);
    }, [group?.id, group?.updatedAt]);

    useEffect(() => {
        if (!group?.id) {
            setAutoAcceptEligible(null);
            setBlockingCount(0);
            setLoadingEligibility(false);
            return undefined;
        }
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
    }, [group?.id]);

    useEffect(() => {
        void fetchMercadoPagoIntegrationStatus('serenatas').then((status) => {
            setMpConnected(Boolean(status?.connected || group?.mpConnected));
        });
    }, [group?.id, group?.mpConnected]);

    const bookingModeDirty = group
        ? bookingForm.bookingMode !== (group.bookingMode ?? 'manual')
        : bookingForm.bookingMode !== 'manual';
    const groupDirty = group
        ? bookingModeDirty || bookingRulesDirty(group, bookingForm) || paymentFormDirty(group, paymentForm)
        : false;
    const hasChanges = groupDirty || notificationPrefs.dirty;
    const automaticSelected = bookingForm.bookingMode === 'auto_if_available';

    const handleGeneratePolicies = async () => {
        if (!group) return;
        setGeneratingPolicies(true);
        setSaveError('');
        const result = await generateBusinessBookingPolicies({
            vertical: 'serenatas',
            displayName: group.name,
            businessName: group.name,
            cancellationHours: bookingForm.cancellationHours,
            bookingWindowDays: bookingForm.bookingWindowDays,
            existingText: bookingForm.bookingTermsText,
            clientLabel: 'cliente',
        });
        setGeneratingPolicies(false);
        if (result.ok && result.text) {
            setSaved(false);
            setBookingForm((prev) => ({ ...prev, bookingTermsText: result.text ?? '' }));
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

        if (groupDirty) {
            const activeGroup = group ?? await ensureGroup();
            if (!activeGroup) {
                setSaveError('No pudimos guardar la configuración.');
                setSaving(false);
                return;
            }

            const wantsAutoAccept = bookingForm.bookingMode === 'auto_if_available';
            if (wantsAutoAccept && activeGroup.id === group?.id && !autoAcceptEligible) {
                setSaveError('No puedes activar la aceptación automática mientras tengas serenatas confirmadas o pendientes de asignar.');
                setSaving(false);
                return;
            }

            const response = await serenatasApi.updateProviderGroup(activeGroup.id, {
                ...serializeBusinessPaymentMethodsWrite(paymentForm),
                ...serializeBookingTermsWrite(bookingForm.bookingTermsText),
                acceptsCash: false,
                bookingMode: wantsAutoAccept && autoAcceptEligible !== false ? 'auto_if_available' : 'manual',
                bookingWindowDays: bookingForm.bookingWindowDays,
                cancellationHours: bookingForm.cancellationHours,
                slaHours: bookingForm.slaHours,
            });

            if (!response.ok || !response.item) {
                setSaving(false);
                setSaveError(response.error ?? 'No se pudo guardar la configuración.');
                return;
            }

            setBookingForm(applyGroupToBookingForm(response.item));
            setPaymentForm(businessPaymentMethodsFromRecord(response.item));
        }

        if (notificationPrefs.dirty) {
            const notificationError = await notificationPrefs.save();
            if (notificationError) {
                setSaving(false);
                setSaveError(notificationError);
                return;
            }
        }

        setSaving(false);
        setSaved(true);
        await refreshAll();
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading || notificationPrefs.loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshAll()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    return (
        <BusinessMiNegocioConfiguracionesLayout>
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
                    showSubscriptionNotice={false}
                    mercadoPago={{
                        mode: 'oauth',
                        connected: mpConnected,
                        integrationsHref: '/panel/mi-cuenta/integraciones',
                    }}
                    copy={{
                        advancePaymentDescription: 'Opcional. El cliente verá las instrucciones antes de confirmar la solicitud.',
                        transferDescription: 'Visible en tu perfil público para quien reserve contigo.',
                        paymentLinkDescription: 'Tu link de Flow, Khipu u otro procesador.',
                    }}
                />
            </div>

            <div className="w-full space-y-4">
                <BusinessBookingResponseModeCard
                    title="Respuesta a solicitudes"
                    description="Elige si cada solicitud queda para revisión manual o si se acepta sola cuando el horario está disponible."
                    mode={automaticSelected ? 'automatic' : 'manual'}
                    onModeChange={(next) => {
                        setSaved(false);
                        setBookingForm((prev) => ({
                            ...prev,
                            bookingMode: next === 'automatic' ? 'auto_if_available' : 'manual',
                        }));
                    }}
                    automaticTitle="Aceptar automáticamente"
                    automaticDescription="Si el cliente paga y el horario está libre, la solicitud se acepta sin que tengas que responderla a mano."
                    manualDescription="Cada solicitud pagada queda pendiente para que la aceptes, rechaces o coordines desde el panel."
                    automaticDisabled={loadingEligibility || autoAcceptEligible === false}
                    hasUnsavedChanges={hasChanges}
                    footer={loadingEligibility || !autoAcceptEligible ? (
                        <p className="text-sm leading-relaxed text-fg-muted">
                            {loadingEligibility
                                ? 'Verificando tu calendario y solicitudes activas...'
                                : blockingCount > 0
                                    ? `La aceptación automática no está disponible: tienes ${blockingCount} serenata${blockingCount === 1 ? '' : 's'} confirmada${blockingCount === 1 ? '' : 's'} o pendiente${blockingCount === 1 ? '' : 's'} de asignar. Completa o cancela esas solicitudes antes de activarla.`
                                    : 'La aceptación automática no está disponible en este momento.'}
                        </p>
                    ) : null}
                />

                <BusinessBookingRulesFields
                    variant="serenatas"
                    bookingWindowDays={bookingForm.bookingWindowDays}
                    cancellationHours={bookingForm.cancellationHours}
                    slaHours={bookingForm.slaHours}
                    onBookingWindowDaysChange={(value) => {
                        setSaved(false);
                        setBookingForm((prev) => ({ ...prev, bookingWindowDays: value }));
                    }}
                    onCancellationHoursChange={(value) => {
                        setSaved(false);
                        setBookingForm((prev) => ({ ...prev, cancellationHours: value }));
                    }}
                    onSlaHoursChange={(value) => {
                        setSaved(false);
                        setBookingForm((prev) => ({ ...prev, slaHours: value }));
                    }}
                />

                <BusinessBookingPoliciesSection
                    value={bookingForm.bookingTermsText}
                    onChange={(next) => {
                        setSaved(false);
                        setBookingForm((prev) => ({ ...prev, bookingTermsText: next }));
                    }}
                    clientLabel="cliente"
                    generating={generatingPolicies}
                    onGenerate={handleGeneratePolicies}
                    disabled={saving}
                />

                <OwnerOperationalAlertsSettings
                    value={notificationPrefs.categoryPrefs}
                    onChange={notificationPrefs.updateCategoryPrefs}
                    disabled={saving}
                />
            </div>

            <PanelSectionSaveFooter
                saving={saving}
                saved={saved}
                saveError={saveError}
                disabled={!hasChanges}
                onSave={handleSave}
            />
        </div>
        </BusinessMiNegocioConfiguracionesLayout>
    );
}
