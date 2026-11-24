'use client';

import { useEffect, useMemo, useState } from 'react';
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
    bookingWindowDays: number;
    cancellationHours: number;
    bookingTermsText: string;
};

function applyProfileToBookingForm(profile: AgendaProfile): BookingForm {
    return {
        confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
        allowsRecurrentBooking: profile.allowsRecurrentBooking ?? true,
        bookingWindowDays: profile.bookingWindowDays ?? 30,
        cancellationHours: profile.cancellationHours ?? 24,
        bookingTermsText: bookingTermsFromRecord(profile),
    };
}

function bookingFormDirty(profile: AgendaProfile, form: BookingForm): boolean {
    return form.confirmationMode !== ((profile.confirmationMode as 'auto' | 'manual') ?? 'auto')
        || form.allowsRecurrentBooking !== (profile.allowsRecurrentBooking ?? true)
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

    const profileDirty = useMemo(() => {
        if (!profile || !bookingForm) return false;
        return bookingFormDirty(profile, bookingForm) || paymentFormDirty(profile, paymentForm);
    }, [profile, bookingForm, paymentForm]);

    const hasChanges = profileDirty || notificationPrefs.dirty;

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
        const paymentError = getBusinessPaymentMethodsSaveError(paymentForm);
        if (paymentError) {
            setSaveError(paymentError);
            return;
        }
        setSaving(true);
        setSaveError('');
        setSaved(false);

        if (profileDirty) {
            const result = await saveAgendaProfile({
                ...bookingForm,
                ...serializeBookingTermsWrite(bookingForm.bookingTermsText),
                ...serializeBusinessPaymentMethodsWrite(paymentForm),
            });
            if (!result.ok) {
                setSaving(false);
                setSaveError(result.error ?? 'No se pudo guardar la configuración.');
                return;
            }
            const nextProfile = result.profile ?? (profile ? { ...profile, ...bookingForm, ...serializeBusinessPaymentMethodsWrite(paymentForm) } : null);
            if (nextProfile) {
                setProfile(nextProfile);
                setBookingForm(applyProfileToBookingForm(nextProfile));
                const payment = businessPaymentMethodsFromRecord(nextProfile);
                setPaymentForm(payment);
            }
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
    if (loading || !bookingForm || notificationPrefs.loading) {
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
            ) : null}

            {showPayments ? (
                <>
                    <section id="cobros" className={`scroll-mt-24 space-y-4 ${showRules ? 'border-t border-[var(--border)] pt-6' : ''}`}>
                        <PanelBlockHeader
                            title="Cobros"
                            description={BUSINESS_PAYMENT_METHODS_PAGE.description}
                            className="mb-0"
                        />
                        <p className="text-sm text-fg-muted">
                            Conecta la cuenta que recibirá los pagos. Luego activa Mercado Pago como método de cobro cuando quieras ofrecerlo a tus clientes.
                        </p>
                        <div id="mercadopago" className="scroll-mt-24">
                            <MercadoPagoIntegrationCard
                                vertical="agenda"
                                subscriptionHref="/panel/mi-negocio/plan"
                                lockedHint="Disponible con Pro, Pro+ o una prueba activa."
                                onConnectionChange={setMpConnected}
                            />
                        </div>
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
                                integrationsHref: '/panel/mi-negocio/agenda#mercadopago',
                            }}
                            copy={{
                                advancePaymentDescription: `Aplica a cualquier método activo. El ${vocab.client} verá las instrucciones antes de confirmar.`,
                                advancePaymentInstructionsHint: `Se muestran al ${vocab.client} en la pantalla de confirmación.`,
                                transferDescription: `El ${vocab.client} recibirá tus datos para transferirte.`,
                            }}
                        />
                    </section>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-4">
                        <PanelBlockHeader
                            title="Avisos operativos"
                            description="Configura qué notificaciones recibes sobre nuevas citas, cancelaciones y pagos."
                            className="mb-0"
                        />
                        <AgendaOperationalAlertsSettings
                            prefs={notificationPrefs.prefs}
                            onPrefsChange={notificationPrefs.updatePrefs}
                            disabled={saving}
                        />
                    </div>
                </>
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
