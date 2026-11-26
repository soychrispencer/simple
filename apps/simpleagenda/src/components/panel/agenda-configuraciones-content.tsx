'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '@simple/config';
import { IconLoader2 } from '@tabler/icons-react';
import { MercadoPagoIntegrationCard } from '@simple/ui/integrations';
import {
    BusinessBookingResponseModeCard,
    BusinessBookingRulesFields,
    BusinessBookingPoliciesSection,
    PanelSectionSaveFooter,
    BusinessPaymentMethodsEditor,
    BUSINESS_PAYMENT_METHODS_PAGE,
    PanelBlockHeader,
    PanelNotice,
    PanelSwitch,
} from '@simple/ui/panel';
import {
    businessPaymentMethodsFromRecord,
    emptyBusinessPaymentMethodsValue,
    generateBusinessBookingPolicies,
    getBusinessPaymentMethodsSaveError,
    serializeBusinessPaymentMethodsWrite,
    bookingTermsFromRecord,
    serializeBookingTermsWrite,
    type BusinessPaymentMethodsValue,
} from '@simple/utils';
import { fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';
import {
    AgendaOperationalAlertsSettings,
    useAgendaProfessionalNotificationPrefs,
} from '@/components/panel/agenda-operational-alerts-settings';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

type BookingForm = {
    confirmationMode: 'auto' | 'manual';
    allowsRecurrentBooking: boolean;
    whatsappRemindersEnabled: boolean;
    bookingWindowDays: number;
    cancellationHours: number;
    bookingTermsText: string;
};

function applyProfileToBookingForm(profile: AgendaProfile): BookingForm {
    return {
        confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
        allowsRecurrentBooking: profile.allowsRecurrentBooking ?? true,
        whatsappRemindersEnabled: profile.whatsappRemindersEnabled ?? true,
        bookingWindowDays: profile.bookingWindowDays ?? 30,
        cancellationHours: profile.cancellationHours ?? 24,
        bookingTermsText: bookingTermsFromRecord(profile),
    };
}

function bookingFormDirty(profile: AgendaProfile, form: BookingForm): boolean {
    return form.confirmationMode !== ((profile.confirmationMode as 'auto' | 'manual') ?? 'auto')
        || form.allowsRecurrentBooking !== (profile.allowsRecurrentBooking ?? true)
        || form.whatsappRemindersEnabled !== (profile.whatsappRemindersEnabled ?? true)
        || form.bookingWindowDays !== (profile.bookingWindowDays ?? 30)
        || form.cancellationHours !== (profile.cancellationHours ?? 24)
        || form.bookingTermsText !== bookingTermsFromRecord(profile);
}

function paymentFormDirty(profile: AgendaProfile, form: BusinessPaymentMethodsValue): boolean {
    const baseline = businessPaymentMethodsFromRecord(profile);
    return JSON.stringify(form) !== JSON.stringify(baseline);
}

export function AgendaConfiguracionesContent({ section = 'all' }: { section?: 'all' | 'rules' | 'payments' }) {
    const vocab = useAgendaVocab();
    const showRules = section === 'all' || section === 'rules';
    const showPayments = section === 'all' || section === 'payments';
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [bookingForm, setBookingForm] = useState<BookingForm | null>(null);
    const [paymentForm, setPaymentForm] = useState<BusinessPaymentMethodsValue>(emptyBusinessPaymentMethodsValue());
    const [mpConnected, setMpConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const [generatingPolicies, setGeneratingPolicies] = useState(false);
    const notificationPrefs = useAgendaProfessionalNotificationPrefs();

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setLoadError(false);
            try {
                const loaded = await fetchAgendaProfile();
                if (!active) return;
                if (!loaded) {
                    setLoadError(true);
                    return;
                }
                setProfile(loaded);
                setBookingForm(applyProfileToBookingForm(loaded));
                setPaymentForm(businessPaymentMethodsFromRecord(loaded));
                setMpConnected(Boolean(loaded.mpConnected));
            } catch {
                if (active) setLoadError(true);
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [loadAttempt]);

    const setBooking = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
        setSaved(false);
        setBookingForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const rulesDirty = useMemo(() => {
        if (!profile || !bookingForm) return false;
        return bookingFormDirty(profile, bookingForm) || notificationPrefs.dirty;
    }, [profile, bookingForm, notificationPrefs.dirty]);

    const paymentsDirty = useMemo(() => {
        if (!profile) return false;
        return paymentFormDirty(profile, paymentForm);
    }, [profile, paymentForm]);

    const profileDirty = useMemo(() => {
        if (!profile || !bookingForm) return false;
        if (section === 'rules') return bookingFormDirty(profile, bookingForm);
        if (section === 'payments') return paymentFormDirty(profile, paymentForm);
        return bookingFormDirty(profile, bookingForm) || paymentFormDirty(profile, paymentForm);
    }, [profile, bookingForm, paymentForm, section]);

    const hasChanges = section === 'rules'
        ? rulesDirty
        : section === 'payments'
            ? paymentsDirty
            : (rulesDirty || paymentsDirty);

    const handleGeneratePolicies = async () => {
        if (!profile || !bookingForm) return;
        setGeneratingPolicies(true);
        setSaveError('');
        const result = await generateBusinessBookingPolicies({
            vertical: 'agenda',
            profession: profile.profession ?? '',
            displayName: profile.displayName ?? '',
            cancellationHours: bookingForm.cancellationHours,
            bookingWindowDays: bookingForm.bookingWindowDays,
            existingText: bookingForm.bookingTermsText,
            clientLabel: vocab.client,
        });
        setGeneratingPolicies(false);
        if (result.ok && result.text) {
            setBooking('bookingTermsText', result.text);
        } else if (result.error) {
            setSaveError(result.error);
        }
    };

    const handleSave = async () => {
        if (!bookingForm) return;
        if (showPayments) {
            const paymentError = getBusinessPaymentMethodsSaveError(paymentForm);
            if (paymentError) {
                setSaveError(paymentError);
                return;
            }
        }
        setSaving(true);
        setSaveError('');
        setSaved(false);

        if (profileDirty) {
            const payload: Record<string, unknown> = {
                ...(showRules ? {
                    ...bookingForm,
                    ...serializeBookingTermsWrite(bookingForm.bookingTermsText),
                } : {}),
                ...(showPayments ? serializeBusinessPaymentMethodsWrite(paymentForm) : {}),
            };
            const result = await saveAgendaProfile(payload);
            if (!result.ok) {
                setSaving(false);
                setSaveError(result.error ?? 'No se pudo guardar la configuración.');
                return;
            }
            const nextProfile = result.profile ?? (profile ? { ...profile, ...payload } as AgendaProfile : null);
            if (nextProfile) {
                setProfile(nextProfile);
                if (showRules) setBookingForm(applyProfileToBookingForm(nextProfile));
                if (showPayments) setPaymentForm(businessPaymentMethodsFromRecord(nextProfile));
            }
        }

        if (showRules && notificationPrefs.dirty) {
            const notificationError = await notificationPrefs.save();
            if (notificationError) {
                setSaving(false);
                setSaveError(notificationError);
                return;
            }
        }

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loadError) {
        return (
            <PanelNotice tone="error">
                <p>No pudimos cargar los ajustes de reservas.</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Reintentar</button>
            </PanelNotice>
        );
    }
    if (loading || !bookingForm || (showRules && notificationPrefs.loading)) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" /> Cargando configuración…
            </div>
        );
    }

    const automaticSelected = bookingForm.confirmationMode === 'auto';

    return (
        <div className="flex w-full min-w-0 flex-col gap-7">
            {showRules ? (
                <>
                    <section className="space-y-4">
                        <PanelBlockHeader
                            title="Condiciones de reserva"
                            description="Define cómo se confirman las citas y las condiciones que aceptan tus clientes."
                            className="mb-0"
                        />
                        <BusinessBookingResponseModeCard
                            title="Confirmación de citas"
                            description="Elige si las citas se confirman al instante o quedan pendientes de tu aprobación."
                            mode={automaticSelected ? 'automatic' : 'manual'}
                            onModeChange={(next) => setBooking('confirmationMode', next === 'automatic' ? 'auto' : 'manual')}
                            manualDescription="Cada cita queda pendiente para que la apruebes o rechaces desde el panel."
                            automaticTitle="Confirmar automáticamente"
                            automaticDescription="Si el horario está disponible, la cita se confirma sin intervención manual."
                            hasUnsavedChanges={hasChanges}
                        />

                        <BusinessBookingRulesFields
                            variant="agenda"
                            showQuickPresets
                            bookingWindowDays={bookingForm.bookingWindowDays}
                            cancellationHours={bookingForm.cancellationHours}
                            allowsRecurrentBooking={bookingForm.allowsRecurrentBooking}
                            recurrentDescription={`Tus ${vocab.clients} podrán agendar varias sesiones desde tu perfil público.`}
                            onBookingWindowDaysChange={(value) => setBooking('bookingWindowDays', value)}
                            onCancellationHoursChange={(value) => setBooking('cancellationHours', value)}
                            onAllowsRecurrentBookingChange={(value) => setBooking('allowsRecurrentBooking', value)}
                        />

                        <BusinessBookingPoliciesSection
                            value={bookingForm.bookingTermsText}
                            onChange={(next) => setBooking('bookingTermsText', next)}
                            clientLabel={vocab.client}
                            generating={generatingPolicies}
                            onGenerate={handleGeneratePolicies}
                        />
                    </section>

                    <AgendaOperationalAlertsSettings
                        prefs={notificationPrefs.prefs}
                        onPrefsChange={notificationPrefs.updatePrefs}
                        disabled={saving}
                    />

                    {profile?.whatsappQuota ? (
                        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        Recordatorios automáticos por WhatsApp
                                    </h3>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                        {profile.whatsappQuota.cloudConfigured
                                            ? 'Se envían 24 horas antes de la cita con botón de confirmación. Al agotarse la cuota del mes, siguen saliendo gratis por email y puedes enviar por wa.me en 1 clic.'
                                            : 'La conexión oficial de SimpleAgenda con WhatsApp está pendiente de configuración en Meta. Mientras tanto, los recordatorios por email y el contacto manual por wa.me siguen disponibles.'}
                                    </p>
                                </div>
                                {profile.whatsappQuota.planLimit > 0 && profile.whatsappQuota.cloudConfigured ? (
                                    <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer shrink-0" style={{ color: 'var(--fg)' }}>
                                        <input
                                            type="checkbox"
                                            checked={bookingForm.whatsappRemindersEnabled}
                                            onChange={(e) => setBooking('whatsappRemindersEnabled', e.target.checked)}
                                            disabled={saving}
                                        />
                                        <span>{bookingForm.whatsappRemindersEnabled ? 'Activados' : 'Pausados'}</span>
                                    </label>
                                ) : profile.whatsappQuota.planLimit > 0 ? (
                                    <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                        Configuración pendiente
                                    </span>
                                ) : null}
                            </div>

                            {profile.whatsappQuota.totalLimit > 0 ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--fg-secondary)' }}>
                                            Cuota mensual incluida
                                        </span>
                                        <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                                            {profile.whatsappQuota.used} / {profile.whatsappQuota.totalLimit} usados
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                        <div
                                            className="h-full rounded-full bg-[var(--accent)] transition-all"
                                            style={{
                                                width: `${Math.min(100, (profile.whatsappQuota.used / profile.whatsappQuota.totalLimit) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                            {profile.whatsappQuota.extraCredits > 0
                                                ? `Incluye ${profile.whatsappQuota.extraCredits} créditos prepago adicionales.`
                                                : '¿Necesitas más envíos este mes?'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const res = await fetch(`${API_BASE}/api/agenda/whatsapp-pack/checkout`, {
                                                    method: 'POST',
                                                    credentials: 'include',
                                                });
                                                const data = await res.json().catch(() => null) as { ok?: boolean; checkoutUrl?: string } | null;
                                                if (data?.ok && data.checkoutUrl) {
                                                    window.location.href = data.checkoutUrl;
                                                }
                                            }}
                                            className="text-xs font-semibold hover:underline"
                                            style={{ color: 'var(--accent-ink)' }}
                                        >
                                            Recargar +100 WhatsApps ($3.990 + IVA) →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Tu plan actual incluye recordatorios automáticos por email y envío manual por wa.me. Activa Pro (30/mes) o Pro+ (80/mes) para envíos automáticos por WhatsApp.
                                </p>
                            )}
                        </section>
                    ) : null}
                </>
            ) : null}

            {showPayments ? (
                <section id="cobros" className={`scroll-mt-24 space-y-4 ${showRules ? 'border-t border-[var(--border)] pt-6' : ''}`}>
                    <PanelBlockHeader
                        title="Cobros"
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
                            inlineCard: true,
                        }}
                        mercadoPagoSlot={(
                            <div id="mercadopago" className="scroll-mt-24">
                                <MercadoPagoIntegrationCard
                                    embedded
                                    vertical="agenda"
                                    description="Cobros online con tarjeta o débito en tu cuenta de MercadoPago. Sin comisión de Simple."
                                    subscriptionHref="/panel/mi-negocio/plan"
                                    lockedHint="Disponible con Pro, Pro+ o una prueba activa."
                                    onConnectionChange={setMpConnected}
                                    extraControl={(
                                        <PanelSwitch
                                            checked={paymentForm.acceptsMp}
                                            onChange={(next: boolean) => {
                                                setSaved(false);
                                                setPaymentForm((curr) => ({ ...curr, acceptsMp: next }));
                                            }}
                                            ariaLabel={paymentForm.acceptsMp ? 'Dejar de aceptar MercadoPago' : 'Aceptar MercadoPago'}
                                        />
                                    )}
                                />
                            </div>
                        )}
                        copy={{
                            advancePaymentDescription: `Aplica a cualquier método activo. El ${vocab.client} verá las instrucciones antes de confirmar.`,
                            advancePaymentInstructionsHint: `Se muestran al ${vocab.client} en la pantalla de confirmación.`,
                            transferDescription: `El ${vocab.client} recibirá tus datos para transferirte.`,
                        }}
                    />
                </section>
            ) : null}

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
