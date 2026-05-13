'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '@simple/config';
import type { AddressBookEntry } from '@simple/types';
import { AddressBookManager, PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelNotice, PanelPageHeader, PanelStatusBadge, PanelAccountProfileCard, PanelConfigSection, type AddressBookManagerSubmitInput, type PanelConfigSectionItem } from '@simple/ui';
import { createAddressBookEntry, deleteAddressBookEntry, fetchAddressBook, getCommunesForRegion, LOCATION_REGIONS, resolveLocationNames, updateAddressBookEntry } from '@simple/utils';
import {
    IconBell,
    IconBrandGoogle,
    IconCamera,
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
import { type ActiveProfile, type ClientProfile, type CoordinatorProfile, type MusicianProfile, type SerenatasUser, serenatasApi } from '@/lib/serenatas-api';
import { confirmCheckout, fetchSubscriptionCatalog, startSubscriptionCheckout, type PaymentOrderStatus, type PaymentOrderView, type SubscriptionCatalogResponse } from '@/lib/payments';
import { FieldInput, FieldSelect, FieldTextarea, FormFeedback, InstrumentSelect, type FormStatus } from './shared';

type AccountSubsection = 'overview' | 'data' | 'addresses' | 'security' | 'subscription';
type WorkProfile = Exclude<ActiveProfile, 'client'>;
type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    coordinator: CoordinatorProfile | null;
};

const ACTIVE_PROFILE_KEY = 'serenatas-active-profile';
export function ProfileView({ profiles, profile, accountUser, refresh }: { profiles: Profiles; profile: ActiveProfile; accountUser: SerenatasUser | null; refresh: () => Promise<void> }) {
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [subsection, setSubsection] = useState<AccountSubsection>('overview');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [accountStatus, setAccountStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [bio, setBio] = useState('');
    const [instrument, setInstrument] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [availableNow, setAvailableNow] = useState(false);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [workingComunas, setWorkingComunas] = useState<string[]>([]);
    const [acceptsUrgent, setAcceptsUrgent] = useState(false);
    const [subscriptionCatalog, setSubscriptionCatalog] = useState<SubscriptionCatalogResponse | null>(null);
    const [subscriptionOrders, setSubscriptionOrders] = useState<PaymentOrderView[]>([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionBusyPlan, setSubscriptionBusyPlan] = useState<string | null>(null);
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const [addressBookSaving, setAddressBookSaving] = useState(false);
    const [addressBookDeletingId, setAddressBookDeletingId] = useState<string | null>(null);
    const [addressBookMessage, setAddressBookMessage] = useState<string | null>(null);
    const communes = useMemo(() => getCommunesForRegion(region), [region]);

    useEffect(() => {
        setName(accountUser?.name ?? '');
        setPhone(accountUser?.phone ?? profiles.client?.phone ?? '');
        setAvatarUrl(accountUser?.avatarUrl ?? accountUser?.avatar ?? '');
    }, [accountUser?.avatar, accountUser?.avatarUrl, accountUser?.name, accountUser?.phone, profiles.client?.phone]);

    useEffect(() => {
        if (profile === 'musician' && profiles.musician) {
            setRegion(profiles.musician.region ?? '');
            setComuna(profiles.musician.comuna ?? '');
            setBio(profiles.musician.bio ?? '');
            setInstrument(profiles.musician.instrument ?? '');
            setExperienceYears(profiles.musician.experienceYears ?? 0);
            setAvailableNow(Boolean(profiles.musician.availableNow));
            return;
        }
        if (profile === 'coordinator' && profiles.coordinator) {
            setRegion(profiles.coordinator.region ?? '');
            setComuna(profiles.coordinator.comuna ?? '');
            setBio(profiles.coordinator.bio ?? '');
            setMinPrice(profiles.coordinator.minPrice == null ? '' : String(profiles.coordinator.minPrice));
            setMaxPrice(profiles.coordinator.maxPrice == null ? '' : String(profiles.coordinator.maxPrice));
            setWorkingComunas(profiles.coordinator.workingComunas ?? []);
            setAcceptsUrgent(Boolean(profiles.coordinator.acceptsUrgent));
            return;
        }
        if (profile === 'client' && profiles.client) {
            setRegion(profiles.client.region ?? '');
            setComuna(profiles.client.comuna ?? '');
        }
    }, [profile, profiles.client, profiles.coordinator, profiles.musician]);

    async function saveAccount() {
        setAccountStatus({ loading: true, error: null, ok: null });
        const userResponse = await serenatasApi.updateUser({ name, phone, avatarUrl: avatarUrl || null });
        const clientResponse = profiles.client
            ? await serenatasApi.saveClientProfile({ phone, region: profiles.client.region, comuna: profiles.client.comuna })
            : null;
        if (!userResponse.ok || (clientResponse && !clientResponse.ok)) {
            setAccountStatus({ loading: false, error: userResponse.error ?? clientResponse?.error ?? 'No pudimos guardar tus datos.', ok: null });
            return;
        }
        setAccountStatus({ loading: false, error: null, ok: 'Datos de contacto guardados.' });
        await refresh();
    }

    async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        const response = await serenatasApi.uploadAvatar(file);
        setAvatarUploading(false);
        if (!response.ok || !response.url) {
            setAccountStatus({ loading: false, error: response.error ?? 'No pudimos subir tu foto.', ok: null });
            return;
        }
        setAvatarUrl(response.url);
        setAccountStatus({ loading: false, error: null, ok: null });
    }

    async function saveClient() {
        setStatus({ loading: true, error: null, ok: null });
        const names = resolveLocationNames(region, comuna);
        const [profileResponse, userResponse] = await Promise.all([
            serenatasApi.saveClientProfile({ phone, region: names.regionName, comuna: names.communeName }),
            serenatasApi.updateUser({ phone }),
        ]);
        if (!profileResponse.ok || !userResponse.ok) {
            setStatus({ loading: false, error: profileResponse.error ?? userResponse.error ?? 'No pudimos guardar.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Perfil cliente guardado.' });
        await refresh();
    }

    async function submit(kind: WorkProfile) {
        setStatus({ loading: true, error: null, ok: null });
        const names = resolveLocationNames(region, comuna);
        const response = kind === 'musician'
            ? await serenatasApi.saveMusicianProfile({
                instrument,
                instruments: instrument ? [instrument] : [],
                bio,
                region: names.regionName,
                comuna: names.communeName,
                experienceYears,
                isAvailable: true,
                availableNow,
            })
            : await serenatasApi.saveCoordinatorProfile({
                bio,
                region: names.regionName,
                comuna: names.communeName,
                workingComunas: workingComunas.length > 0 ? workingComunas : (names.communeName ? [names.communeName] : []),
                acceptsUrgent,
                minPrice: minPrice ? Number(minPrice) : null,
                maxPrice: maxPrice ? Number(maxPrice) : null,
            });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos guardar.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Perfil guardado.' });
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, kind);
        await refresh();
    }

    async function startCoordinatorTrial() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.startCoordinatorTrial();
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos iniciar la suscripción.', ok: null });
            return;
        }
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, 'coordinator');
        setStatus({ loading: false, error: null, ok: 'Coordinador activado con 30 días de prueba.' });
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
        if (!result.ok) setAddressBookMessage(result.error ?? 'No pudimos cargar tus direcciones.');
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
                if (!profiles.coordinator) await startCoordinatorTrial();
                setStatus({ loading: false, error: null, ok: 'Suscripción activada correctamente.' });
            } else if (result.status === 'pending') {
                setStatus({ loading: false, error: null, ok: 'Tu suscripción quedó pendiente de validación.' });
            } else {
                setStatus({ loading: false, error: 'La suscripción no pudo ser aprobada.', ok: null });
            }
            await loadSubscriptionCatalog();
            await refresh();
        })();
    }, [handledPurchaseId, profiles.coordinator, refresh, searchParams]);

    async function connectGoogle() {
        setAccountStatus({ loading: true, error: null, ok: null });
        try {
            const returnTo = '/?section=profile';
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

    const accountDone = Boolean(name.trim() && phone.trim() && accountUser?.email);
    const securityDone = accountUser?.status === 'verified';
    const profileDone = profile === 'client'
        ? Boolean(profiles.client?.region && profiles.client?.comuna)
        : profile === 'musician'
            ? Boolean(profiles.musician?.instrument && profiles.musician?.region && profiles.musician?.comuna)
            : Boolean(profiles.coordinator?.region && profiles.coordinator?.comuna);
    const accountProvider = accountUser?.provider === 'google' ? 'Google' : 'Email y contraseña';
    const profileLabel = profile === 'client' ? 'Cliente' : profile === 'musician' ? 'Músico' : 'Coordinador';
    const coordinatorTrialDate = profiles.coordinator?.trialEndsAt
        ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(profiles.coordinator.trialEndsAt))
        : null;
    const currentPaidSubscription = subscriptionCatalog?.currentSubscription ?? null;
    const coordinatorPlan = subscriptionCatalog?.plans.find((item) => item.id === 'pro') ?? null;
    const enterprisePlan = subscriptionCatalog?.plans.find((item) => item.id === 'enterprise') ?? null;
    const mercadoPagoEnabled = Boolean(subscriptionCatalog?.mercadoPagoEnabled);

    const backToOverview = (
        <button
            type="button"
            onClick={() => setSubsection('overview')}
            className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--fg-muted)' }}
        >
            <IconChevronLeft size={14} />
            Mi Cuenta
        </button>
    );

    const overviewSections: PanelConfigSectionItem[] = [
        {
            key: 'data',
            title: 'Datos',
            description: 'Nombre, foto, WhatsApp, ubicación y datos de tu perfil.',
            icon: <IconUser size={18} />,
            onClick: () => setSubsection('data'),
            badge: accountDone && profileDone ? 'Actualizado' : 'Revisar',
            required: true,
            done: accountDone && profileDone,
        },
        {
            key: 'security',
            title: 'Seguridad y acceso',
            description: `Correo, verificación y acceso actual por ${accountProvider}.`,
            icon: <IconShield size={18} />,
            onClick: () => setSubsection('security'),
            badge: securityDone ? 'Verificado' : 'Pendiente',
            required: true,
            done: securityDone,
        },
        {
            key: 'addresses',
            title: 'Direcciones',
            description: 'Direcciones guardadas para contratar serenatas más rápido.',
            icon: <IconMapPin size={18} />,
            onClick: () => setSubsection('addresses'),
            badge: addressBook.length > 0 ? `${addressBook.length}` : 'Agregar',
            required: false,
            done: addressBook.length > 0,
        },
        {
            key: 'subscription',
            title: 'Suscripción',
            description: profiles.coordinator ? 'Plan, prueba y reglas comerciales de coordinación.' : 'Activa un plan cuando quieras coordinar serenatas y grupos.',
            icon: <IconCreditCard size={18} />,
            onClick: () => setSubsection('subscription'),
            badge: profiles.coordinator ? profiles.coordinator.subscriptionStatus : 'Opcional',
            required: false,
        },
    ];

    const preferencesSections: PanelConfigSectionItem[] = [
        {
            key: 'notifications',
            title: 'Notificaciones',
            description: 'Invitaciones, cambios de agenda y avisos de cuenta.',
            icon: <IconBell size={18} />,
            disabled: true,
            badge: 'Próximo',
            required: false,
        },
        {
            key: 'more-services',
            title: 'Otros servicios',
            description: 'Explora otros servicios disponibles cuando quieras.',
            icon: <IconPlug size={18} />,
            disabled: true,
            badge: 'Opcional',
            required: false,
        },
    ];

    const accountLayoutClass = 'container-app panel-page grid w-full gap-5 py-4 lg:py-8';

    return (
        <div className={accountLayoutClass}>
            {subsection === 'overview' ? (
                <>
                    <PanelPageHeader
                        title="Mi Cuenta"
                        description="Configura tus datos, acceso y suscripción."
                        actions={<PanelStatusBadge tone="success" label={profileLabel} />}
                    />

                    <PanelConfigSection
                        title="Configuración"
                        items={overviewSections}
                        showProgress={true}
                    />

                    <PanelConfigSection
                        title="Preferencias"
                        items={preferencesSections}
                    />
                </>
            ) : null}

            {subsection === 'data' ? (
            <div>
            {backToOverview}
            <div className="mt-4">
                <PanelPageHeader
                    title="Datos personales"
                    description="Administra tu información personal, contacto y datos específicos de tu perfil."
                />
            </div>
            <PanelCard>
                <PanelBlockHeader
                    title="Datos personales"
                    description="Mantén actualizada tu información de contacto."
                    actions={<PanelStatusBadge tone={accountUser?.status === 'verified' ? 'success' : 'warning'} label={accountUser?.status === 'verified' ? 'Correo verificado' : 'Pendiente'} />}
                />
                <PanelAccountProfileCard
                    name={accountUser?.name || 'Usuario Simple'}
                    email={accountUser?.email || 'Sin correo'}
                    role={profile === 'client' ? 'Cliente' : profile === 'musician' ? 'Músico' : profile === 'coordinator' ? 'Coordinador' : 'Usuario'}
                />
                <div className="mt-4">
                    <PanelField label="WhatsApp">
                        <FieldInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9..." />
                    </PanelField>
                </div>
                <FormFeedback status={accountStatus} />
                <PanelButton className="mt-4 w-full md:w-auto" disabled={accountStatus.loading} onClick={() => void saveAccount()}>
                    {accountStatus.loading ? 'Guardando...' : 'Guardar datos personales'}
                </PanelButton>
            </PanelCard>

            <PanelCard className="mt-4">
                <PanelBlockHeader
                    title={`Datos de ${profileLabel.toLowerCase()}`}
                    description="Información específica para usar SimpleSerenatas."
                    actions={<PanelStatusBadge tone={profileDone ? 'success' : 'warning'} label={profileDone ? 'Completo' : 'Incompleto'} />}
                />
                {profile === 'client' ? (
                    <>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Mantén tu comuna y región actualizadas para futuras solicitudes de serenatas.
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <PanelField label="Región">
                                <FieldSelect value={region} onChange={(event) => { setRegion(event.target.value); setComuna(''); }}>
                                    <option value="">Seleccionar</option>
                                    {LOCATION_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </FieldSelect>
                            </PanelField>
                            <PanelField label="Comuna">
                                <FieldSelect value={comuna} onChange={(event) => setComuna(event.target.value)}>
                                    <option value="">Seleccionar</option>
                                    {communes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </FieldSelect>
                            </PanelField>
                        </div>
                        <FormFeedback status={status} />
                        <PanelButton className="mt-4 w-full md:w-auto" disabled={status.loading} onClick={() => void saveClient()}>
                            {status.loading ? 'Guardando...' : 'Guardar perfil cliente'}
                        </PanelButton>
                    </>
                ) : null}
                {profile === 'musician' ? (
                    <>
                        <ProfileFormFields
                            region={region}
                            comuna={comuna}
                            communes={communes}
                            bio={bio}
                            setRegion={setRegion}
                            setComuna={setComuna}
                            setBio={setBio}
                        />
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <PanelField label="Instrumento principal"><InstrumentSelect value={instrument} onChange={setInstrument} /></PanelField>
                            <PanelField label="Años de experiencia"><FieldInput type="number" min={0} value={experienceYears} onChange={(event) => setExperienceYears(Number(event.target.value))} /></PanelField>
                        </div>
                        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            <input type="checkbox" checked={availableNow} onChange={(event) => setAvailableNow(event.target.checked)} />
                            Disponible ahora
                        </label>
                        <FormFeedback status={status} />
                        <PanelButton className="mt-4 w-full md:w-auto" disabled={status.loading} onClick={() => void submit('musician')}>
                            Guardar perfil músico
                        </PanelButton>
                    </>
                ) : null}
                {profile === 'coordinator' ? (
                    <>
                        <ProfileFormFields
                            region={region}
                            comuna={comuna}
                            communes={communes}
                            bio={bio}
                            setRegion={setRegion}
                            setComuna={setComuna}
                            setBio={setBio}
                        />
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <PanelField label="Precio mínimo"><FieldInput type="number" min={0} value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></PanelField>
                            <PanelField label="Precio máximo"><FieldInput type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></PanelField>
                        </div>
                        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Zonas donde trabajas</p>
                                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        Las solicitudes de la aplicación se ofrecen primero a coordinadores activos en la comuna del evento.
                                    </p>
                                </div>
                                <PanelStatusBadge tone={workingComunas.length > 0 ? 'success' : 'warning'} label={`${workingComunas.length} seleccionada${workingComunas.length === 1 ? '' : 's'}`} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="rounded-xl border px-3 py-1.5 text-xs font-medium"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}
                                    onClick={() => setWorkingComunas(communes.map((item) => item.name))}
                                    disabled={communes.length === 0}
                                >
                                    Seleccionar todas
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border px-3 py-1.5 text-xs font-medium"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}
                                    onClick={() => setWorkingComunas(comuna ? [communes.find((item) => item.id === comuna)?.name ?? comuna] : [])}
                                >
                                    Solo mi comuna base
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border px-3 py-1.5 text-xs font-medium"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}
                                    onClick={() => setWorkingComunas([])}
                                >
                                    Limpiar
                                </button>
                            </div>
                            {workingComunas.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {workingComunas.slice(0, 8).map((name) => (
                                        <span key={name} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                            {name}
                                        </span>
                                    ))}
                                    {workingComunas.length > 8 ? (
                                        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            +{workingComunas.length - 8}
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                {communes.length === 0 ? (
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Selecciona una región para elegir comunas.</p>
                                ) : communes.map((item) => {
                                    const checked = workingComunas.includes(item.name);
                                    return (
                                        <label key={item.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: checked ? 'var(--accent-border)' : 'var(--border)', color: 'var(--fg-secondary)', background: checked ? 'var(--accent-soft)' : 'var(--surface)' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(event) => setWorkingComunas((current) => event.target.checked ? [...new Set([...current, item.name])] : current.filter((name) => name !== item.name))}
                                            />
                                            {item.name}
                                        </label>
                                    );
                                })}
                            </div>
                            <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <input type="checkbox" checked={acceptsUrgent} onChange={(event) => setAcceptsUrgent(event.target.checked)} />
                                Acepto solicitudes urgentes
                            </label>
                        </div>
                        <FormFeedback status={status} />
                        <PanelButton className="mt-4 w-full md:w-auto" disabled={status.loading} onClick={() => void submit('coordinator')}>
                            Guardar perfil coordinador
                        </PanelButton>
                    </>
                ) : null}
            </PanelCard>
            </div>
            ) : null}

            {subsection === 'addresses' ? (
            <div>
            {backToOverview}
            <div className="mt-4">
                <PanelPageHeader
                    title="Direcciones"
                    description="Guarda una o más direcciones de eventos. La predeterminada se usará al contratar una serenata."
                />
            </div>
            <AddressBookManager
                showHeader={false}
                googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                entries={addressBook}
                regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                getCommunes={(regionId) => getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name }))}
                loading={addressBookLoading}
                saving={addressBookSaving}
                deletingId={addressBookDeletingId}
                onSaveEntry={async (draft: AddressBookManagerSubmitInput) => {
                    setAddressBookSaving(true);
                    setAddressBookMessage(null);
                    const payload = {
                        kind: draft.kind,
                        label: draft.label.trim(),
                        countryCode: draft.location.countryCode,
                        regionId: draft.location.regionId,
                        regionName: draft.location.regionName,
                        communeId: draft.location.communeId,
                        communeName: draft.location.communeName,
                        neighborhood: draft.location.neighborhood,
                        addressLine1: draft.location.addressLine1,
                        addressLine2: draft.location.addressLine2,
                        postalCode: draft.location.postalCode,
                        arrivalInstructions: draft.location.arrivalInstructions,
                        geoPoint: draft.location.geoPoint,
                        isDefault: draft.isDefault,
                    };
                    const result = draft.id
                        ? await updateAddressBookEntry(draft.id, payload)
                        : await createAddressBookEntry(payload);
                    setAddressBookSaving(false);
                    if (!result.ok) {
                        setAddressBookMessage(result.error ?? 'No pudimos guardar la dirección.');
                        return false;
                    }
                    setAddressBook(result.items);
                    setAddressBookMessage(draft.id ? 'Dirección actualizada.' : 'Dirección agregada.');
                    return true;
                }}
                onDeleteEntry={async (entryId) => {
                    setAddressBookDeletingId(entryId);
                    setAddressBookMessage(null);
                    const result = await deleteAddressBookEntry(entryId);
                    setAddressBookDeletingId(null);
                    if (!result.ok) {
                        setAddressBookMessage(result.error ?? 'No pudimos eliminar la dirección.');
                        return;
                    }
                    setAddressBook(result.items);
                    setAddressBookMessage('Dirección eliminada.');
                }}
            />
            {addressBookMessage ? <PanelNotice className="mt-4">{addressBookMessage}</PanelNotice> : null}
            </div>
            ) : null}

            {subsection === 'security' ? (
            <div>
            {backToOverview}
            <div className="mt-4">
                <PanelPageHeader
                    title="Seguridad y acceso"
                    description="Controla tu correo, verificación, contraseña y conexiones de acceso."
                />
            </div>
            <PanelCard>
                <PanelBlockHeader
                    title="Seguridad y acceso"
                    description="Controla cómo entras a tu cuenta y qué conexiones tienes activas."
                />
                <div className="grid gap-3">
                    <SecurityRow
                        icon={securityDone ? IconCheck : IconMailCheck}
                        title="Correo electrónico"
                        description={accountUser?.email ?? 'Sin correo registrado'}
                        badge={<PanelStatusBadge tone={securityDone ? 'success' : 'warning'} label={securityDone ? 'Verificado' : 'Pendiente'} />}
                        done={securityDone}
                    />
                    <SecurityRow
                        icon={IconBrandGoogle}
                        title="Google"
                        description={accountUser?.provider === 'google' ? 'Tu cuenta usa Google como acceso principal.' : 'Puedes conectar Google para entrar más rápido.'}
                        badge={accountUser?.provider === 'google'
                            ? <PanelStatusBadge tone="success" label="Conectado" />
                            : <PanelButton variant="secondary" disabled={accountStatus.loading} onClick={() => void connectGoogle()}>Conectar Google</PanelButton>}
                    />
                    <SecurityRow
                        icon={IconKey}
                        title="Contraseña"
                        description="La recuperación se gestiona desde el modal de inicio de sesión."
                    />
                </div>
            </PanelCard>
            </div>
            ) : null}

            {subsection === 'subscription' ? (
            <>
            {backToOverview}
            <div className="mt-4">
                <PanelPageHeader
                    title="Suscripción"
                    description="Tu plan mensual para SimpleSerenatas."
                />
            </div>
            <div className="space-y-6">
            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Plan actual"
                    description="Gestiona tu suscripción mensual para coordinar serenatas."
                    actions={currentPaidSubscription ? <PanelStatusBadge tone="success" label="Suscripción activa" /> : profiles.coordinator ? <PanelStatusBadge tone="success" label={profiles.coordinator.subscriptionStatus} /> : <PanelStatusBadge tone="warning" label="Sin suscripción" />}
                />
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Actualmente activo</p>
                            <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                                {currentPaidSubscription?.planName ?? (profiles.coordinator ? 'Coordinador' : 'Sin plan activo')}
                            </h3>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                {currentPaidSubscription ? `${formatCurrency(currentPaidSubscription.priceMonthly)} / mes` : profiles.coordinator ? '$19.990 / mes IVA incluido' : 'Puedes usar tu cuenta como cliente o músico sin costo mensual.'}
                            </p>
                        </div>
                        <PanelStatusBadge
                            label={currentPaidSubscription ? 'Suscrito' : profiles.coordinator ? (profiles.coordinator.subscriptionStatus === 'trialing' ? 'Prueba activa' : 'Suscrito') : 'Base'}
                            tone={currentPaidSubscription || profiles.coordinator ? 'success' : 'neutral'}
                        />
                    </div>
                    {profiles.coordinator ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                            <SubscriptionFeature text="Crear serenatas propias con costo de plataforma $0." />
                            <SubscriptionFeature text="Crear y gestionar grupos por fecha." />
                            <SubscriptionFeature text="Mapa y rutas para la jornada." />
                            <SubscriptionFeature text="Aceptar serenatas de la aplicación con comisión de 8% + IVA." />
                        </div>
                    ) : null}
                    {!currentPaidSubscription && coordinatorTrialDate ? (
                        <p className="mt-4 text-xs" style={{ color: 'var(--fg-muted)' }}>Prueba vigente hasta {coordinatorTrialDate}.</p>
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
                            borderColor: !profiles.coordinator ? 'var(--fg)' : 'var(--border)',
                            background: !profiles.coordinator ? 'var(--bg-subtle)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Base</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>Para clientes y músicos.</p>
                            </div>
                            {!profiles.coordinator ? <PanelStatusBadge label="Actual" tone="neutral" size="sm" /> : null}
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
                            borderColor: profiles.coordinator ? 'var(--fg)' : 'var(--border)',
                            background: profiles.coordinator ? 'var(--bg-subtle)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Coordinador</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>Para operar grupos, agenda y rutas.</p>
                            </div>
                            <PanelStatusBadge label={currentPaidSubscription?.planId === 'pro' || profiles.coordinator ? 'Actual' : '30 días gratis'} tone={currentPaidSubscription?.planId === 'pro' || profiles.coordinator ? 'success' : 'info'} size="sm" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{formatCurrency(coordinatorPlan?.priceMonthly ?? 19990)}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>mensual</p>
                        <div className="mt-4 space-y-2">
                            <SubscriptionFeature text="Serenatas propias con costo de plataforma $0." />
                            <SubscriptionFeature text="Grupos, invitaciones y lineup del día." />
                            <SubscriptionFeature text="Mapa y rutas para coordinar jornadas." />
                            <SubscriptionFeature text="Oportunidades de la app con comisión de 8% + IVA." />
                        </div>
                        {profile === 'musician' && !profiles.coordinator && !currentPaidSubscription ? (
                            <PanelButton className="mt-5 w-full" disabled={status.loading || subscriptionBusyPlan === 'pro'} onClick={() => mercadoPagoEnabled ? void startPaidSubscription('pro') : void startCoordinatorTrial()}>
                                {status.loading || subscriptionBusyPlan === 'pro' ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                                {mercadoPagoEnabled ? 'Suscribirme' : 'Iniciar prueba'}
                            </PanelButton>
                        ) : (
                            <PanelButton className="mt-5 w-full" variant="secondary" disabled>
                                {profiles.coordinator || currentPaidSubscription ? 'Plan activo' : 'Disponible para músicos'}
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
            </>
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

function ProfileFormFields(props: {
    region: string;
    comuna: string;
    communes: ReturnType<typeof getCommunesForRegion>;
    bio: string;
    setRegion: (value: string) => void;
    setComuna: (value: string) => void;
    setBio: (value: string) => void;
}) {
    return (
        <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PanelField label="Región">
                    <FieldSelect value={props.region} onChange={(event) => { props.setRegion(event.target.value); props.setComuna(''); }}>
                        <option value="">Seleccionar</option>
                        {LOCATION_REGIONS.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
                    </FieldSelect>
                </PanelField>
                <PanelField label="Comuna">
                    <FieldSelect value={props.comuna} onChange={(event) => props.setComuna(event.target.value)}>
                        <option value="">Seleccionar</option>
                        {props.communes.map((commune) => <option key={commune.id} value={commune.id}>{commune.name}</option>)}
                    </FieldSelect>
                </PanelField>
            </div>
            <PanelField className="mt-3" label="Bio">
                <FieldTextarea rows={3} value={props.bio} onChange={(event) => props.setBio(event.target.value)} placeholder="Breve descripción para tu equipo." />
            </PanelField>
        </>
    );
}
