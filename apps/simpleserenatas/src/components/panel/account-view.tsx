'use client';

/** Mi cuenta — pestañas horizontales (PanelPillNav). Sin hub de configuración legacy ni pantalla overview. */
import { useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@simple/config';
import type { AddressBookEntry } from '@simple/types';
import {
    AvatarUpload,
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelField,
    PanelNotice,
    PanelPageHeader,
    PanelPillNav,
    PanelStatusBadge,
    PanelSwitch,
} from '@simple/ui';
import { fetchAddressBook } from '@simple/utils';
import {
    IconBell,
    IconBrandGoogle,
    IconCheck,
    IconChevronLeft,
    IconCreditCard,
    IconKey,
    IconLoader2,
    IconMapPin,
    IconMailCheck,
    IconPlug,
    IconShield,
    IconUser,
} from '@tabler/icons-react';
import {
    type ActiveProfile,
    type ClientProfile,
    type MusicianProfile,
    type OwnerProfile,
    type Profiles as ApiProfiles,
    type SerenatasUser,
    serenatasApi,
} from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { ownerFeaturesEnabled } from '@/lib/app-mode';
import type { Section } from '@/context/serenata-context';
import { type AccountTab, isAccountTab, readStoredAccountTab, profileSectionHref } from '@/lib/account-tab';
import {
    readEmailNotificationPrefs,
    writeEmailNotificationPrefs,
    type EmailNotificationPrefs,
} from '@/lib/account-notification-prefs';
import { OwnerOnboardingCard } from './owner-onboarding-card';
import { confirmCheckout, fetchSubscriptionCatalog, startSubscriptionCheckout, type PaymentOrderStatus, type PaymentOrderView, type SubscriptionCatalogResponse } from '@/lib/payments';
import { FieldInput, FieldTextarea, FormFeedback, InstrumentSelect, type FormStatus } from './shared';
import { RegionCommuneFields } from './region-commune-fields';
import { WorkZonesPicker } from './work-zones-picker';
import { AddressesSection, communesFromAddressBook } from './addresses-section';

type AccountSubsection = AccountTab;
type WorkProfile = Exclude<ActiveProfile, 'client'>;
type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    owner: OwnerProfile | null;
};

const ACTIVE_PROFILE_KEY = 'serenatas-active-profile';

const ACCOUNT_PILL_ITEMS: { key: AccountTab; label: string }[] = [
    { key: 'data', label: 'Datos' },
    { key: 'security', label: 'Seguridad' },
    { key: 'addresses', label: 'Direcciones' },
    { key: 'notifications', label: 'Notificaciones' },
    { key: 'integrations', label: 'Integraciones' },
    { key: 'subscription', label: 'Suscripción' },
];

function resolveAccountTab(urlTab: string | null): AccountTab {
    if (isAccountTab(urlTab)) return urlTab;
    return readStoredAccountTab() ?? 'data';
}

function whatsappPhoneValidation(enabled: boolean, phone: string): string | null {
    if (enabled && !phone.trim()) return 'Ingresa un número de teléfono para contactarte por WhatsApp.';
    return null;
}

function NotificationPrefToggle({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{description}</p>
            </div>
            <PanelSwitch checked={checked} onChange={onChange} size="sm" ariaLabel={title} />
        </div>
    );
}

function WhatsappContactToggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--fg)]">Contactarme por WhatsApp</p>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                    {enabled
                        ? 'Usaremos tu teléfono para avisos y coordinación por WhatsApp.'
                        : 'Si lo activas, usaremos el teléfono de arriba para escribirte por WhatsApp.'}
                </p>
            </div>
            <PanelSwitch
                checked={enabled}
                onChange={onChange}
                size="sm"
                ariaLabel={enabled ? 'Desactivar contacto por WhatsApp' : 'Activar contacto por WhatsApp'}
            />
        </div>
    );
}

function splitDisplayName(name: string | null | undefined) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

const EXPERIENCE_YEARS_MIN = 0;
const EXPERIENCE_YEARS_MAX = 80;

function experienceYearsValidation(value: number): string | null {
    if (!Number.isFinite(value)) return 'Indica un número válido.';
    if (value < EXPERIENCE_YEARS_MIN) return `Mínimo ${EXPERIENCE_YEARS_MIN} años.`;
    if (value > EXPERIENCE_YEARS_MAX) return `Máximo ${EXPERIENCE_YEARS_MAX} años.`;
    return null;
}

function resolveProfile(mode: AppMode | undefined, profiles: ApiProfiles, explicit?: ActiveProfile): ActiveProfile {
    if (explicit) return explicit;
    if (mode === 'client') return 'client';
    if (mode === 'work') {
        if (profiles.owner) return 'owner';
        if (profiles.musician) return 'musician';
        return 'musician';
    }
    if (profiles.client) return 'client';
    if (profiles.musician) return 'musician';
    if (profiles.owner) return 'owner';
    return 'client';
}

type ProfileViewProps = {
    profiles: ApiProfiles;
    mode?: AppMode;
    profile?: ActiveProfile;
    accountUser: SerenatasUser | null;
    refresh: () => Promise<void>;
    setSection?: (section: Section) => void;
};

export function ProfileView({
    profiles: apiProfiles,
    mode,
    profile: profileProp,
    accountUser,
    refresh,
    setSection,
}: ProfileViewProps) {
    const profiles = apiProfiles;
    const profile = resolveProfile(mode, apiProfiles, profileProp);
    const ownerActive = ownerFeaturesEnabled(profiles);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [subsection, setSubsection] = useState<AccountSubsection>(() => resolveAccountTab(searchParams.get('account_tab')));
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [emailNotificationPrefs, setEmailNotificationPrefs] = useState<EmailNotificationPrefs>(() => readEmailNotificationPrefs());
    const [notificationPrefsSaving, setNotificationPrefsSaving] = useState(false);
    const [notificationPrefsStatus, setNotificationPrefsStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    const selectSubsection = (tab: AccountTab) => {
        setSubsection(tab);
        if (typeof window !== 'undefined') window.localStorage.setItem('account_tab', tab);
        router.replace(profileSectionHref(tab), { scroll: false });
    };

    useEffect(() => {
        const urlTab = searchParams.get('account_tab');
        if (isAccountTab(urlTab)) setSubsection(urlTab);
    }, [searchParams]);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [accountStatus, setAccountStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [avatarUrl, setAvatarUrl] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [workZones, setWorkZones] = useState<string[]>([]);
    const [musicianBio, setMusicianBio] = useState('');
    const [clientRegion, setClientRegion] = useState('');
    const [clientComuna, setClientComuna] = useState('');
    const [musicianRegion, setMusicianRegion] = useState('');
    const [musicianComuna, setMusicianComuna] = useState('');
    const [instrument, setInstrument] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [saving, setSaving] = useState(false);
    const [subscriptionCatalog, setSubscriptionCatalog] = useState<SubscriptionCatalogResponse | null>(null);
    const [subscriptionOrders, setSubscriptionOrders] = useState<PaymentOrderView[]>([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionBusyPlan, setSubscriptionBusyPlan] = useState<string | null>(null);
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const appMode: AppMode = mode ?? (profile === 'client' ? 'client' : 'work');
    const isDualWorkProfile = appMode === 'work' && ownerActive && Boolean(profiles.musician);
    const showMusicianWorkFields =
        appMode === 'work' && Boolean(profiles.musician) && (!ownerActive || isDualWorkProfile);

    const experienceYearsError = useMemo(
        () => (showMusicianWorkFields ? experienceYearsValidation(experienceYears) : null),
        [showMusicianWorkFields, experienceYears],
    );

    useEffect(() => {
        const { firstName: nextFirst, lastName: nextLast } = splitDisplayName(accountUser?.name);
        setFirstName(nextFirst);
        setLastName(nextLast);
        setPhone(profiles.client?.phone?.trim() || accountUser?.phone?.trim() || '');
        setWhatsappEnabled(accountUser?.whatsappEnabled ?? false);
        setAvatarUrl(accountUser?.avatarUrl ?? accountUser?.avatar ?? '');
        setClientRegion(profiles.client?.region ?? '');
        setClientComuna(profiles.client?.comuna ?? '');
        setInstrument(profiles.musician?.instrument || '');
        setExperienceYears(profiles.musician?.experienceYears ?? 0);
        setMusicianRegion(profiles.musician?.region ?? '');
        setMusicianComuna(profiles.musician?.comuna ?? '');
        setWorkZones(profiles.musician?.workZones ?? []);
        setMusicianBio(profiles.musician?.bio ?? '');
    }, [accountUser, profiles, appMode]);

    const saveUserBasics = async () => {
        const fullName = `${firstName} ${lastName}`.trim();
        const userResponse = await serenatasApi.updateUser({
            name: fullName,
            phone,
            avatarUrl: avatarUrl || null,
            whatsappEnabled,
        });
        if (!userResponse.ok) {
            setAccountStatus({ loading: false, error: userResponse.error ?? 'No pudimos guardar tus datos.', ok: null });
            return false;
        }
        return true;
    };

    const handleSaveBasics = async () => {
        const whatsappError = whatsappPhoneValidation(whatsappEnabled, phone);
        if (whatsappError) {
            setAccountStatus({ loading: false, error: whatsappError, ok: null });
            return;
        }
        setAccountStatus({ loading: true, error: null, ok: null });
        if (!(await saveUserBasics())) {
            setAccountStatus((s) => ({ ...s, loading: false }));
            return;
        }
        await refresh();
        setAccountStatus({ loading: false, error: null, ok: 'Datos personales guardados.' });
    };

    const handleSaveClient = async () => {
        const whatsappError = whatsappPhoneValidation(whatsappEnabled, phone);
        if (whatsappError) {
            setStatus({ loading: false, error: whatsappError, ok: null });
            return;
        }
        setSaving(true);
        setStatus({ loading: true, error: null, ok: null });
        if (!(await saveUserBasics())) {
            setSaving(false);
            return;
        }
        const profileResponse = await serenatasApi.saveClientProfile({
            phone: phone.trim() || null,
            region: clientRegion.trim() || null,
            comuna: clientComuna.trim() || null,
        });
        if (!profileResponse.ok) {
            setStatus({ loading: false, error: profileResponse.error ?? 'No pudimos guardar tu perfil.', ok: null });
            setSaving(false);
            return;
        }
        await refresh();
        setSaving(false);
        setStatus({ loading: false, error: null, ok: 'Perfil guardado correctamente.' });
    };

    const handleSaveMusicianProfile = async () => {
        if (experienceYearsError) {
            setStatus({ loading: false, error: experienceYearsError, ok: null });
            return;
        }
        const whatsappError = whatsappPhoneValidation(whatsappEnabled, phone);
        if (whatsappError) {
            setStatus({ loading: false, error: whatsappError, ok: null });
            return;
        }
        setSaving(true);
        setStatus({ loading: true, error: null, ok: null });
        if (!(await saveUserBasics())) {
            setSaving(false);
            return;
        }
        const trimmedInstrument = instrument.trim();
        const musicianResponse = await serenatasApi.saveMusicianProfile({
            bio: musicianBio.trim() || null,
            instrument: trimmedInstrument || null,
            instruments: trimmedInstrument ? [trimmedInstrument] : [],
            experienceYears,
            region: musicianRegion.trim() || null,
            comuna: musicianComuna.trim() || null,
            workZones,
        });
        if (!musicianResponse.ok) {
            setStatus({ loading: false, error: musicianResponse.error ?? 'No pudimos guardar el perfil músico.', ok: null });
            setSaving(false);
            return;
        }
        await refresh();
        setSaving(false);
        setStatus({ loading: false, error: null, ok: 'Perfil de músico guardado.' });
    };

    async function startOwnerTrial() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.startOwnerTrial();
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos iniciar la suscripción.', ok: null });
            return;
        }
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, 'owner');
        setStatus({ loading: false, error: null, ok: 'Plan de dueño activado con 30 días de prueba.' });
        await refresh();
    }

    async function loadSubscriptionCatalog() {
        setSubscriptionLoading(true);
        const catalog = await fetchSubscriptionCatalog();
        setSubscriptionCatalog(catalog);
        setSubscriptionOrders(catalog?.orders ?? []);
        setSubscriptionLoading(false);
    }

    async function startPaidSubscription(planId: 'pro' | 'enterprise') {
        setSubscriptionBusyPlan(planId);
        setStatus({ loading: false, error: null, ok: null });
        const result = await startSubscriptionCheckout({
            planId,
            returnUrl: `${window.location.origin}/?section=profile`,
        });
        if (!result.ok || !result.checkoutUrl) {
            setSubscriptionBusyPlan(null);
            setStatus({ loading: false, error: result.error ?? 'No pudimos iniciar el pago.', ok: null });
            return;
        }
        window.location.assign(result.checkoutUrl);
    }

    useEffect(() => {
        void loadSubscriptionCatalog();
    }, []);

    async function loadAddressBook() {
        setAddressBookLoading(true);
        const result = await fetchAddressBook();
        setAddressBook(result.items);
        setAddressBookLoading(false);
        if (!result.ok) {
            // ignore; AddressesSection shows empty state
        }
    }

    useEffect(() => {
        void loadAddressBook();
    }, []);

    useEffect(() => {
        const purchaseId = searchParams.get('purchaseId');
        if (!purchaseId || handledPurchaseId === purchaseId) return;
        setHandledPurchaseId(purchaseId);
        void (async () => {
            const result = await confirmCheckout({
                orderId: purchaseId,
                paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id'),
            });
            if (!result.ok) {
                setStatus({ loading: false, error: result.error ?? 'No pudimos confirmar la suscripción.', ok: null });
                return;
            }
            if (result.status === 'authorized' || result.status === 'approved') {
                if (!profiles.owner) await startOwnerTrial();
                setStatus({ loading: false, error: null, ok: 'Suscripción activada correctamente.' });
            } else if (result.status === 'pending') {
                setStatus({ loading: false, error: null, ok: 'Tu suscripción quedó pendiente de validación.' });
            } else {
                setStatus({ loading: false, error: 'La suscripción no pudo ser aprobada.', ok: null });
            }
            await loadSubscriptionCatalog();
            await refresh();
        })();
    }, [handledPurchaseId, profiles.owner, refresh, searchParams]);

    async function connectGoogle() {
        setAccountStatus({ loading: true, error: null, ok: null });
        try {
            const returnTo = profileSectionHref('integrations');
            const response = await fetch(`${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`, {
                credentials: 'include',
            });
            const data = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;
            if (!response.ok || !data?.authUrl) {
                setAccountStatus({ loading: false, error: data?.error ?? 'No pudimos iniciar la conexión con Google.', ok: null });
                return;
            }
            window.location.href = data.authUrl;
        } catch {
            setAccountStatus({ loading: false, error: 'No pudimos iniciar la conexión con Google.', ok: null });
        }
    }

    const securityDone = accountUser?.status === 'verified';
    const canPrefillWorkZones = addressBook.length > 0;
    const handlePrefillWorkZonesFromAddresses = () => {
        const fromAddresses = communesFromAddressBook(addressBook);
        if (fromAddresses.length === 0) return;
        setWorkZones(fromAddresses);
    };
    const profileLabel =
        profile === 'client' ? 'Cliente' : profile === 'musician' ? 'Músico' : ownerActive ? 'Dueño del grupo' : 'Operación';
    const ownerTrialDate = profiles.owner?.trialEndsAt
        ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(profiles.owner.trialEndsAt))
        : null;
    const currentPaidSubscription = subscriptionCatalog?.currentSubscription ?? null;
    const ownerPlan = subscriptionCatalog?.plans.find((item) => item.id === 'pro') ?? null;
    const enterprisePlan = subscriptionCatalog?.plans.find((item) => item.id === 'enterprise') ?? null;
    const mercadoPagoEnabled = Boolean(subscriptionCatalog?.mercadoPagoEnabled);

    const accountLayoutClass = 'container-app panel-page grid w-full gap-5 py-4 lg:py-8';

    return (
        <div className={accountLayoutClass}>
            <PanelPageHeader
                title="Mi cuenta"
                description="Datos personales, acceso, direcciones y preferencias."
                actions={<PanelStatusBadge tone="success" label={profileLabel} />}
            />

            <PanelPillNav
                items={ACCOUNT_PILL_ITEMS.map((item) => ({
                    key: item.key,
                    label: item.label,
                }))}
                activeKey={subsection}
                onChange={(key) => {
                    if (isAccountTab(key)) selectSubsection(key);
                }}
                ariaLabel="Secciones de mi cuenta"
                showMobileDropdown
                breakpoint="md"
                size="sm"
            />

            {subsection === 'notifications' ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Notificaciones"
                    description="Invitaciones, cambios de agenda y avisos de cuenta."
                />
                <div className="mt-4 grid gap-3">
                    <NotificationPrefToggle
                        title="Invitaciones de grupo"
                        description="Cuando un mariachi te invite a unirte a su equipo."
                        checked={emailNotificationPrefs.invitations}
                        onChange={(invitations) => setEmailNotificationPrefs((p) => ({ ...p, invitations }))}
                    />
                    <NotificationPrefToggle
                        title="Agenda y serenatas"
                        description="Confirmaciones, cambios de horario y recordatorios de eventos."
                        checked={emailNotificationPrefs.agenda}
                        onChange={(agenda) => setEmailNotificationPrefs((p) => ({ ...p, agenda }))}
                    />
                    <NotificationPrefToggle
                        title="Cuenta y seguridad"
                        description="Verificación de correo, accesos y novedades de tu perfil."
                        checked={emailNotificationPrefs.account}
                        onChange={(account) => setEmailNotificationPrefs((p) => ({ ...p, account }))}
                    />
                </div>
                <PanelNotice tone="neutral" className="mt-4">
                    Los avisos de la campana del panel siguen activos aunque desactives el correo.
                </PanelNotice>
                <PanelButton
                    className="mt-4"
                    disabled={notificationPrefsSaving}
                    onClick={() => {
                        setNotificationPrefsSaving(true);
                        writeEmailNotificationPrefs(emailNotificationPrefs);
                        setNotificationPrefsSaving(false);
                        setNotificationPrefsStatus({ loading: false, error: null, ok: 'Preferencias guardadas.' });
                    }}
                >
                    {notificationPrefsSaving ? 'Guardando...' : 'Guardar preferencias'}
                </PanelButton>
                <FormFeedback status={notificationPrefsStatus} />
            </PanelCard>
            ) : null}

            {subsection === 'integrations' ? (
            <div className="grid gap-6">
                <PanelCard>
                    <PanelBlockHeader
                        title="Integraciones"
                        description="Conecta servicios para entrar más rápido y coordinar mejor."
                    />
                    <div className="mt-4 grid gap-3">
                        <SecurityRow
                            icon={IconBrandGoogle}
                            title="Google"
                            description={accountUser?.provider === 'google'
                                ? 'Tu cuenta usa Google como acceso principal.'
                                : 'Conecta Google para iniciar sesión con un clic.'}
                            badge={accountUser?.provider === 'google'
                                ? <PanelStatusBadge tone="success" label="Conectado" />
                                : <PanelButton variant="secondary" disabled={accountStatus.loading} onClick={() => void connectGoogle()}>Conectar Google</PanelButton>}
                        />
                    </div>
                </PanelCard>
                <PanelCard>
                    <PanelBlockHeader
                        title="Otros servicios Simple"
                        description="Explora otros productos del ecosistema cuando quieras."
                    />
                    <div className="mt-4 grid gap-2 text-sm text-[var(--fg-secondary)]">
                        <p>Simple Autos, Simple Propiedades y Simple Agenda comparten tu cuenta Simple cuando uses el mismo correo.</p>
                        <PanelButton
                            variant="secondary"
                            onClick={() => window.open('https://simpleplataforma.com', '_blank', 'noopener,noreferrer')}
                        >
                            Ver ecosistema Simple
                        </PanelButton>
                    </div>
                </PanelCard>
            </div>
            ) : null}

            {subsection === 'data' ? (
            <div className="grid gap-6">
            {appMode === 'work' && setSection ? (
                <OwnerOnboardingCard profiles={profiles} setSection={setSection} />
            ) : null}
            <PanelCard>
                <PanelBlockHeader
                    title="Información básica"
                    description="Datos públicos y de contacto."
                    actions={<PanelStatusBadge tone={accountUser?.status === 'verified' ? 'success' : 'warning'} label={accountUser?.status === 'verified' ? 'Correo verificado' : 'Pendiente'} />}
                />
                <div className="mt-4 grid gap-4">
                    <AvatarUpload
                        currentUrl={avatarUrl}
                        config={{
                            maxSize: 5120,
                            maxWidth: 80,
                            maxHeight: 80,
                            aspectRatio: 1,
                            circular: true,
                            onUpload: async (file, croppedBlob) => {
                                const uploadResult = await serenatasApi.uploadAvatar(
                                    croppedBlob,
                                    file.name || 'avatar.jpg',
                                );
                                if (uploadResult.ok && uploadResult.url) {
                                    await serenatasApi.updateUser({ avatarUrl: uploadResult.url });
                                    await refresh();
                                    return { url: uploadResult.url };
                                }
                                throw new Error(uploadResult.error || 'Error al subir el avatar');
                            },
                        }}
                        onSuccess={(url) => setAvatarUrl(url)}
                        onError={(error) => setAccountStatus({ loading: false, error, ok: null })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <PanelField label="Nombre">
                            <FieldInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Felipe" />
                        </PanelField>
                        <PanelField label="Apellido">
                            <FieldInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Jara" />
                        </PanelField>
                    </div>
                    {appMode === 'work' ? (
                        <>
                            <PanelField label="Teléfono">
                                <FieldInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9..." />
                            </PanelField>
                            <WhatsappContactToggle enabled={whatsappEnabled} onChange={setWhatsappEnabled} />
                        </>
                    ) : null}
                </div>
                <FormFeedback status={accountStatus} />
                {appMode === 'client' ? (
                    <PanelButton className="mt-4" onClick={() => void handleSaveBasics()} disabled={accountStatus.loading}>
                        {accountStatus.loading ? 'Guardando...' : 'Guardar cambios'}
                    </PanelButton>
                ) : null}
            </PanelCard>

            {appMode === 'client' ? (
                <PanelCard>
                    <PanelBlockHeader
                        title="Datos de cliente"
                        description="Teléfono y ubicación para coordinar tus serenatas."
                    />
                    <div className="mt-4 grid gap-4">
                        <PanelField label="Teléfono">
                            <FieldInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9..." />
                        </PanelField>
                        <WhatsappContactToggle enabled={whatsappEnabled} onChange={setWhatsappEnabled} />
                        <RegionCommuneFields
                            region={clientRegion}
                            comuna={clientComuna}
                            onRegionChange={setClientRegion}
                            onComunaChange={setClientComuna}
                            disabled={saving}
                        />
                    </div>
                    <FormFeedback status={status} />
                    <PanelButton className="mt-4" onClick={() => void handleSaveClient()} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar perfil'}
                    </PanelButton>
                </PanelCard>
            ) : null}

            {showMusicianWorkFields && !isDualWorkProfile ? (
                <PanelCard>
                    <PanelBlockHeader title="Datos de músico" description="Tu ficha profesional como integrante." />
                    <div className="mt-4 grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <PanelField label="Instrumento principal">
                                <InstrumentSelect value={instrument} onChange={setInstrument} />
                            </PanelField>
                            <PanelField label="Años de experiencia (opcional)">
                                <FieldInput
                                    type="number"
                                    min={EXPERIENCE_YEARS_MIN}
                                    max={EXPERIENCE_YEARS_MAX}
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                                />
                                {experienceYearsError ? (
                                    <p className="mt-1 text-xs text-[var(--danger)]">{experienceYearsError}</p>
                                ) : null}
                            </PanelField>
                        </div>
                        <RegionCommuneFields
                            region={musicianRegion}
                            comuna={musicianComuna}
                            onRegionChange={setMusicianRegion}
                            onComunaChange={setMusicianComuna}
                            disabled={saving}
                            optional
                        />
                        <PanelField label="Zonas de trabajo">
                            <WorkZonesPicker value={workZones} onChange={setWorkZones} disabled={saving} />
                        </PanelField>
                        <PanelField label="Bio de músico (opcional)">
                            <FieldTextarea
                                rows={3}
                                value={musicianBio}
                                onChange={(e) => setMusicianBio(e.target.value)}
                                placeholder="Estilo, repertorio y experiencia como músico."
                            />
                        </PanelField>
                        <PanelButton onClick={() => void handleSaveMusicianProfile()} disabled={saving || Boolean(experienceYearsError)}>
                            {saving ? 'Guardando...' : 'Guardar perfil músico'}
                        </PanelButton>
                    </div>
                </PanelCard>
            ) : null}

            {isDualWorkProfile ? (
                <PanelCard>
                    <PanelBlockHeader
                        title="Perfil de músico"
                        description="Tu ficha como integrante, independiente del perfil comercial."
                    />
                    <div className="mt-4 grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <PanelField label="Instrumento principal">
                                <InstrumentSelect value={instrument} onChange={setInstrument} />
                            </PanelField>
                            <PanelField label="Años de experiencia (opcional)">
                                <FieldInput
                                    type="number"
                                    min={EXPERIENCE_YEARS_MIN}
                                    max={EXPERIENCE_YEARS_MAX}
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                                />
                            </PanelField>
                        </div>
                        <RegionCommuneFields
                            region={musicianRegion}
                            comuna={musicianComuna}
                            onRegionChange={setMusicianRegion}
                            onComunaChange={setMusicianComuna}
                            disabled={saving}
                            optional
                        />
                        <PanelField label="Zonas de trabajo como músico">
                            <WorkZonesPicker value={workZones} onChange={setWorkZones} disabled={saving} />
                        </PanelField>
                        <PanelField label="Bio de músico (opcional)">
                            <FieldTextarea
                                rows={3}
                                value={musicianBio}
                                onChange={(e) => setMusicianBio(e.target.value)}
                                placeholder="Texto público en tu perfil de músico."
                            />
                        </PanelField>
                        <PanelButton onClick={() => void handleSaveMusicianProfile()} disabled={saving || Boolean(experienceYearsError)}>
                            {saving ? 'Guardando...' : 'Guardar perfil músico'}
                        </PanelButton>
                    </div>
                </PanelCard>
            ) : null}

            {appMode === 'work' && !isDualWorkProfile ? (
                <PanelButton onClick={() => void handleSaveBasics()} disabled={accountStatus.loading}>
                    {accountStatus.loading ? 'Guardando...' : 'Guardar datos personales'}
                </PanelButton>
            ) : null}

            {isDualWorkProfile ? (
                <PanelNotice tone="neutral">
                    Los datos básicos (nombre, teléfono y WhatsApp) se guardan con el botón del perfil de músico. Tu mariachi comercial está en Mi negocio.
                </PanelNotice>
            ) : null}
            </div>
            ) : null}

            {subsection === 'addresses' ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Direcciones"
                    description="Guarda direcciones para contratar serenatas más rápido."
                />
                <div className="mt-4">
                    <AddressesSection
                        entries={addressBook}
                        loading={addressBookLoading}
                        onEntriesChange={setAddressBook}
                    />
                </div>
            </PanelCard>
            ) : null}

            {subsection === 'security' ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Seguridad y acceso"
                    description="Correo, verificación y contraseña. Para Google, usa la pestaña Integraciones."
                />
                <div className="mt-4 grid gap-3">
                    <SecurityRow
                        icon={securityDone ? IconCheck : IconMailCheck}
                        title="Correo electrónico"
                        description={accountUser?.email ?? 'Sin correo registrado'}
                        badge={<PanelStatusBadge tone={securityDone ? 'success' : 'warning'} label={securityDone ? 'Verificado' : 'Pendiente'} />}
                        done={securityDone}
                    />
                    <SecurityRow
                        icon={IconKey}
                        title="Contraseña"
                        description="La recuperación se gestiona desde el modal de inicio de sesión."
                    />
                </div>
            </PanelCard>
            ) : null}

            {subsection === 'subscription' ? (
            <div className="grid gap-6">
            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Plan actual"
                    description="Gestiona tu suscripción mensual para coordinar serenatas."
                    actions={currentPaidSubscription ? <PanelStatusBadge tone="success" label="Suscripción activa" /> : profiles.owner ? <PanelStatusBadge tone="success" label={profiles.owner.subscriptionStatus} /> : <PanelStatusBadge tone="warning" label="Sin suscripción" />}
                />
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Actualmente activo</p>
                            <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                                {currentPaidSubscription?.planName ?? (profiles.owner ? 'Dueño del grupo' : 'Sin plan activo')}
                            </h3>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                {currentPaidSubscription ? `${formatCurrency(currentPaidSubscription.priceMonthly)} / mes` : profiles.owner ? '$19.990 / mes IVA incluido' : 'Puedes usar tu cuenta como cliente o músico sin costo mensual.'}
                            </p>
                        </div>
                        <PanelStatusBadge
                            label={currentPaidSubscription ? 'Suscrito' : profiles.owner ? (profiles.owner.subscriptionStatus === 'trialing' ? 'Prueba activa' : 'Suscrito') : 'Base'}
                            tone={currentPaidSubscription || profiles.owner ? 'success' : 'neutral'}
                        />
                    </div>
                    {profiles.owner ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                            <SubscriptionFeature text="Crear serenatas propias con costo de plataforma $0." />
                            <SubscriptionFeature text="Crear y gestionar grupos por fecha." />
                            <SubscriptionFeature text="Mapa y rutas para la jornada." />
                            <SubscriptionFeature text="Aceptar serenatas de la aplicación con comisión de 8% + IVA." />
                        </div>
                    ) : null}
                    {!currentPaidSubscription && ownerTrialDate ? (
                        <p className="mt-4 text-xs" style={{ color: 'var(--fg-muted)' }}>Prueba vigente hasta {ownerTrialDate}.</p>
                    ) : null}
                </div>
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Planes disponibles"
                    description="Elige el plan que quieres activar para coordinar serenatas."
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <article
                        className="rounded-2xl border p-5"
                        style={{
                            borderColor: !profiles.owner ? 'var(--fg)' : 'var(--border)',
                            background: !profiles.owner ? 'var(--bg-subtle)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Base</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>Para clientes y músicos.</p>
                            </div>
                            {!profiles.owner ? <PanelStatusBadge label="Actual" tone="neutral" size="sm" /> : null}
                        </div>
                        <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Gratis</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>sin facturación mensual</p>
                        <div className="mt-4 space-y-2">
                            <SubscriptionFeature text="Solicitar o revisar serenatas como cliente." />
                            <SubscriptionFeature text="Recibir invitaciones como músico." />
                            <SubscriptionFeature text="Gestionar tu perfil y disponibilidad." />
                        </div>
                        <PanelButton className="mt-5 w-full" variant="secondary" disabled>
                            Plan activo
                        </PanelButton>
                    </article>

                    <article
                        className="rounded-2xl border p-5"
                        style={{
                            borderColor: profiles.owner ? 'var(--fg)' : 'var(--border)',
                            background: profiles.owner ? 'var(--bg-subtle)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Dueño del grupo</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>Para operar grupos, agenda y rutas.</p>
                            </div>
                            <PanelStatusBadge label={currentPaidSubscription?.planId === 'pro' || profiles.owner ? 'Actual' : '30 días gratis'} tone={currentPaidSubscription?.planId === 'pro' || profiles.owner ? 'success' : 'info'} size="sm" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{formatCurrency(ownerPlan?.priceMonthly ?? 19990)}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>mensual</p>
                        <div className="mt-4 space-y-2">
                            <SubscriptionFeature text="Serenatas propias con costo de plataforma $0." />
                            <SubscriptionFeature text="Grupos, invitaciones y lineup del día." />
                            <SubscriptionFeature text="Mapa y rutas para coordinar jornadas." />
                            <SubscriptionFeature text="Oportunidades de la app con comisión de 8% + IVA." />
                        </div>
                        {profile === 'musician' && !profiles.owner && !currentPaidSubscription ? (
                            <PanelButton className="mt-5 w-full" disabled={status.loading || subscriptionBusyPlan === 'pro'} onClick={() => mercadoPagoEnabled ? void startPaidSubscription('pro') : void startOwnerTrial()}>
                                {status.loading || subscriptionBusyPlan === 'pro' ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                                {mercadoPagoEnabled ? 'Suscribirme' : 'Iniciar prueba'}
                            </PanelButton>
                        ) : (
                            <PanelButton className="mt-5 w-full" variant="secondary" disabled>
                                {profiles.owner || currentPaidSubscription ? 'Plan activo' : 'Disponible para músicos'}
                            </PanelButton>
                        )}
                    </article>

                    <article
                        className="rounded-2xl border p-5"
                        style={{ borderColor: currentPaidSubscription?.planId === 'enterprise' ? 'var(--fg)' : 'var(--border)', background: currentPaidSubscription?.planId === 'enterprise' ? 'var(--bg-subtle)' : 'var(--surface)' }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Empresa</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{enterprisePlan?.description ?? 'Para grupos con varios coordinadores.'}</p>
                            </div>
                            <PanelStatusBadge label={currentPaidSubscription?.planId === 'enterprise' ? 'Actual' : 'Empresa'} tone={currentPaidSubscription?.planId === 'enterprise' ? 'success' : 'info'} size="sm" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{formatCurrency(enterprisePlan?.priceMonthly ?? 59990)}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>mensual</p>
                        <div className="mt-4 space-y-2">
                            {(enterprisePlan?.features ?? ['Múltiples coordinadores por operación.', 'Gestión avanzada de músicos.', 'Soporte prioritario para jornadas grandes.']).map((feature) => (
                                <SubscriptionFeature key={feature} text={feature} />
                            ))}
                        </div>
                        <PanelButton className="mt-5 w-full" variant={currentPaidSubscription?.planId === 'enterprise' ? 'secondary' : 'primary'} disabled={currentPaidSubscription?.planId === 'enterprise' || subscriptionBusyPlan === 'enterprise' || !mercadoPagoEnabled} onClick={() => void startPaidSubscription('enterprise')}>
                            {subscriptionBusyPlan === 'enterprise' ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                            {currentPaidSubscription?.planId === 'enterprise' ? 'Plan activo' : 'Suscribirme'}
                        </PanelButton>
                    </article>
                </div>
                {!mercadoPagoEnabled && !subscriptionLoading ? <PanelNotice tone="warning">Mercado Pago aún no está disponible en este entorno. Puedes iniciar la prueba de coordinador.</PanelNotice> : null}
                <FormFeedback status={status} />
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Historial de cobros"
                    description="Seguimiento simple de tus órdenes de suscripción."
                />
                {subscriptionLoading ? (
                    <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : subscriptionOrders.length === 0 ? (
                    <PanelNotice tone="neutral">Aún no tienes órdenes de suscripción.</PanelNotice>
                ) : (
                    <div className="grid gap-3">
                        {subscriptionOrders.map((order) => (
                            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{order.title}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{formatCurrency(order.amount)} · {new Date(order.createdAt).toLocaleString('es-CL')}</p>
                                </div>
                                <PanelStatusBadge label={paymentStatusLabel(order.status)} tone={paymentStatusTone(order.status)} />
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
            </div>
            ) : null}
        </div>
    );
}

function SecurityRow(props: {
    icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties }>;
    title: string;
    description: string;
    badge?: ReactNode;
    done?: boolean;
}) {
    const Icon = props.icon;
    return (
        <div className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: props.done ? 'var(--accent)' : 'var(--bg-muted)', color: props.done ? '#fff' : 'var(--fg-muted)' }}>
                <Icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{props.title}</p>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{props.description}</p>
            </div>
            {props.badge ? <div className="shrink-0">{props.badge}</div> : null}
        </div>
    );
}

function formatCurrency(value: number): string {
    return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function paymentStatusLabel(status: PaymentOrderStatus): string {
    if (status === 'approved') return 'Aprobado';
    if (status === 'authorized') return 'Activo';
    if (status === 'pending') return 'Pendiente';
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'refunded') return 'Reembolsado';
    return 'Rechazado';
}

function paymentStatusTone(status: PaymentOrderStatus): 'success' | 'warning' | 'neutral' | 'info' {
    if (status === 'approved' || status === 'authorized') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'cancelled' || status === 'refunded') return 'neutral';
    return 'info';
}

function SubscriptionFeature({ text, muted = false }: { text: string; muted?: boolean }) {
    const color = muted ? 'var(--fg-muted)' : 'var(--fg-secondary)';
    return (
        <div className="flex items-start gap-2 text-sm">
            <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color }} />
            <span style={{ color }}>{text}</span>
        </div>
    );
}
