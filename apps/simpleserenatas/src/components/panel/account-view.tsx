'use client';

/** Mi cuenta — pestañas horizontales (PanelPillNav). Sin hub de configuración legacy ni pantalla overview. */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@simple/config';
import { resolveAvatarDisplayUrl } from '@/lib/resolve-avatar-url';
import type { AddressBookEntry } from '@simple/types';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelField, PanelNotice, PanelPageHeader, PanelPersonalDataList, PanelPersonalDataRow, PanelPillNav, PanelStatusBadge, PanelSwitch, usePanelConfirm } from '@simple/ui/panel';
import { AvatarUpload } from '@simple/ui/media';
import { fetchAddressBook } from '@simple/utils';
import {
    IconBrandGoogle,
    IconCalendar,
    IconCheck,
    IconChevronLeft,
    IconLoader2,
    IconX,
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
import {
    type AccountTab,
    getAccountPillItems,
    isAccountTab,
    isAccountTabVisible,
    normalizeAccountTab,
    profileSectionHref,
    resolveAccountTab,
} from '@/lib/account-tab';
import {
    anyWhatsAppCategoryEnabled,
    buildNotificationSaveMessage,
    categoryNotificationPrefsFromUser,
    getNotificationCategoryRowsForContext,
    notificationPrefsContextDescription,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
    type CategoryNotificationPrefs,
    type NotificationPrefsSnapshot,
    whatsappPhoneValidation,
} from '@/lib/account-notification-prefs';
import { formatChileMobileHint, validateChileMobilePhone } from '@/lib/chile-phone';
import { OwnerOnboardingCard } from './owner-onboarding-card';
import { FieldInput, FieldTextarea, FormFeedback, InstrumentSelect, type FormStatus } from './shared';
import { RegionCommuneFields } from './region-commune-fields';
import { AddressesSection } from './addresses-section';
import { PanelSheet } from './panel-sheet';
import { SubscriptionSection } from './subscription-section';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';

type AccountSubsection = AccountTab;
type WorkProfile = Exclude<ActiveProfile, 'client'>;
type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    owner: OwnerProfile | null;
};

function isValidEmail(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 255) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function NotificationCategoryRow({
    title,
    hint,
    emailChecked,
    whatsappChecked,
    whatsappAvailable = true,
    disabled,
    onEmailChange,
    onWhatsappChange,
}: {
    title: string;
    hint?: string;
    emailChecked: boolean;
    whatsappChecked: boolean;
    whatsappAvailable?: boolean;
    disabled?: boolean;
    onEmailChange: (value: boolean) => void;
    onWhatsappChange: (value: boolean) => void;
}) {
    return (
        <div className={`py-3 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
                    {hint ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{hint}</p>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--fg-muted)]">Correo</span>
                        <PanelSwitch
                            checked={emailChecked}
                            onChange={onEmailChange}
                            size="sm"
                            ariaLabel={`${title} por correo`}
                            disabled={disabled}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--fg-muted)]">WhatsApp</span>
                        {whatsappAvailable ? (
                            <PanelSwitch
                                checked={whatsappChecked}
                                onChange={onWhatsappChange}
                                size="sm"
                                ariaLabel={`${title} por WhatsApp`}
                                disabled={disabled}
                            />
                        ) : (
                            <span className="text-xs text-[var(--fg-muted)]" title="No disponible para esta categoría">
                                —
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
function NotificationPrefsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]" aria-hidden="true">
            {Array.from({ length: rows }, (_, i) => i + 1).map((key) => (
                <div key={key} className="h-14 animate-pulse bg-[var(--bg-subtle)]/60" />
            ))}
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

function resolveProfile(profiles: ApiProfiles): ActiveProfile {
    if (profiles.owner) return 'owner';
    if (profiles.musician) return 'musician';
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
    const profile = profileProp ?? resolveProfile(apiProfiles);
    const ownerActive = ownerFeaturesEnabled(profiles);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [subsection, setSubsection] = useState<AccountSubsection>(() => resolveAccountTab(searchParams.get('account_tab')));
    const [categoryNotificationPrefs, setCategoryNotificationPrefs] = useState<CategoryNotificationPrefs>(() =>
        categoryNotificationPrefsFromUser(accountUser),
    );
    const [notificationPrefsSaving, setNotificationPrefsSaving] = useState(false);
    const [notificationPrefsStatus, setNotificationPrefsStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [notificationPrefsTouched, setNotificationPrefsTouched] = useState(false);
    const savedNotificationPrefsRef = useRef<NotificationPrefsSnapshot | null>(null);
    const [emailChangeModalOpen, setEmailChangeModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailChangeSaving, setEmailChangeSaving] = useState(false);
    const [emailChangeStatus, setEmailChangeStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [googleBusy, setGoogleBusy] = useState(false);
    const [googleStatus, setGoogleStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [googleLinkNotice, setGoogleLinkNotice] = useState<string | null>(null);
    const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deleteAccountConfirmPhrase, setDeleteAccountConfirmPhrase] = useState('');
    const [deleteAccountSaving, setDeleteAccountSaving] = useState(false);
    const [deleteAccountStatus, setDeleteAccountStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeSaving, setPasswordChangeSaving] = useState(false);
    const [passwordChangeStatus, setPasswordChangeStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [phoneFieldError, setPhoneFieldError] = useState<string | null>(null);
    const [googleDisconnectOpen, setGoogleDisconnectOpen] = useState(false);
    const [emailPendingBusy, setEmailPendingBusy] = useState<'resend' | 'cancel' | null>(null);
    const [gcConnected, setGcConnected] = useState(false);
    const [gcLoading, setGcLoading] = useState(false);
    const [gcDisconnecting, setGcDisconnecting] = useState(false);
    const [gcFlash, setGcFlash] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const { confirm } = usePanelConfirm();
    const logoutAndGoHome = useLogoutAndGoHome();

    const notificationPrefsDirty = useMemo(() => {
        if (!accountUser || !savedNotificationPrefsRef.current) return notificationPrefsTouched;
        const digestFrequency =
            savedNotificationPrefsRef.current?.emailDigestFrequency
            ?? notificationPrefsSnapshotFromUser(accountUser).emailDigestFrequency;
        const current: NotificationPrefsSnapshot = {
            emailDigestFrequency: digestFrequency,
            categoryPrefs: categoryNotificationPrefs,
        };
        return (
            notificationPrefsTouched
            || !notificationPrefsSnapshotsEqual(current, savedNotificationPrefsRef.current)
        );
    }, [
        accountUser,
        notificationPrefsTouched,
        categoryNotificationPrefs,
    ]);

    const applyNotificationPrefsFromUser = (user: SerenatasUser | null) => {
        const snapshot = notificationPrefsSnapshotFromUser(user);
        setCategoryNotificationPrefs(snapshot.categoryPrefs);
        savedNotificationPrefsRef.current = snapshot;
    };

    const markNotificationPrefsTouched = () => setNotificationPrefsTouched(true);

    const selectSubsection = async (tab: AccountTab) => {
        if (
            subsection === 'notifications'
            && tab !== 'notifications'
            && notificationPrefsDirty
        ) {
            const leave = await confirm({
                title: 'Cambios sin guardar',
                message: 'Tienes cambios sin guardar en Notificaciones. ¿Salir sin guardar?',
                confirmLabel: 'Salir sin guardar',
                tone: 'danger',
            });
            if (!leave) return;
            setNotificationPrefsTouched(false);
            if (accountUser) applyNotificationPrefsFromUser(accountUser);
        }
        setSubsection(tab);
        if (typeof window !== 'undefined') window.localStorage.setItem('account_tab', tab);
        router.replace(profileSectionHref(tab), { scroll: false });
    };

    useEffect(() => {
        const tab = normalizeAccountTab(searchParams.get('account_tab'));
        if (tab) setSubsection(tab);
    }, [searchParams]);

    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [accountStatus, setAccountStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [avatarUrl, setAvatarUrl] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [musicianBio, setMusicianBio] = useState('');
    const [musicianRegion, setMusicianRegion] = useState('');
    const [musicianComuna, setMusicianComuna] = useState('');
    const [instrument, setInstrument] = useState('');
    const [secondInstrument, setSecondInstrument] = useState('');
    const [hasInstrument, setHasInstrument] = useState(false);
    const [hasMariachiAttire, setHasMariachiAttire] = useState(false);
    const [experienceYears, setExperienceYears] = useState(0);
    const [saving, setSaving] = useState(false);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const appMode: AppMode = mode ?? (profile === 'client' ? 'client' : 'work');
    const accountPillItems = useMemo(() => getAccountPillItems(appMode, profiles), [appMode, profiles]);
    const notificationCategoryRows = useMemo(
        () => getNotificationCategoryRowsForContext(appMode, profiles),
        [appMode, profiles],
    );

    useEffect(() => {
        if (isAccountTabVisible(subsection, appMode, profiles)) return;
        const fallback = accountPillItems[0]?.key ?? 'data';
        setSubsection(fallback);
        router.replace(profileSectionHref(fallback), { scroll: false });
    }, [subsection, appMode, profiles, accountPillItems, router]);

    const showMusicianProfileTab = appMode === 'work' && Boolean(profiles.musician);

    const experienceYearsError = useMemo(
        () => (showMusicianProfileTab ? experienceYearsValidation(experienceYears) : null),
        [showMusicianProfileTab, experienceYears],
    );

    useEffect(() => {
        const { firstName: nextFirst, lastName: nextLast } = splitDisplayName(accountUser?.name);
        setFirstName(nextFirst);
        setLastName(nextLast);
        const preferredPhone =
            appMode === 'client'
                ? (profiles.client?.phone?.trim() || accountUser?.phone?.trim() || '')
                : (accountUser?.phone?.trim() || profiles.client?.phone?.trim() || '');
        setPhone(preferredPhone);
        setAvatarUrl(resolveAvatarDisplayUrl(accountUser?.avatarUrl ?? accountUser?.avatar ?? '') ?? '');
        const musicianInstruments = profiles.musician?.instruments ?? [];
        const primaryInstrument = profiles.musician?.instrument?.trim()
            || musicianInstruments[0]?.trim()
            || '';
        setInstrument(primaryInstrument);
        setSecondInstrument(
            musicianInstruments[1]?.trim()
            && musicianInstruments[1]?.trim() !== primaryInstrument
                ? musicianInstruments[1].trim()
                : '',
        );
        setHasInstrument(
            profiles.musician?.hasInstrument
            ?? Boolean(primaryInstrument || musicianInstruments.length > 0),
        );
        setHasMariachiAttire(profiles.musician?.hasMariachiAttire ?? false);
        setExperienceYears(profiles.musician?.experienceYears ?? 0);
        setMusicianRegion(profiles.musician?.region ?? '');
        setMusicianComuna(profiles.musician?.comuna ?? '');
        setMusicianBio(profiles.musician?.bio ?? '');
        if (!notificationPrefsTouched) {
            applyNotificationPrefsFromUser(accountUser);
        }
    }, [accountUser, profiles, appMode, notificationPrefsTouched]);

    const openEmailChangeModal = () => {
        setNewEmail(accountUser?.pendingEmail ?? '');
        setEmailChangeStatus({ loading: false, error: null, ok: null });
        setEmailChangeModalOpen(true);
    };

    const closeEmailChangeModal = () => {
        setEmailChangeModalOpen(false);
        setNewEmail('');
        if (!emailChangeStatus.ok) {
            setEmailChangeStatus({ loading: false, error: null, ok: null });
        }
    };

    const handleRequestEmailChange = async () => {
        const trimmed = newEmail.trim();
        if (!isValidEmail(trimmed)) {
            setEmailChangeStatus({ loading: false, error: 'Ingresa un correo válido.', ok: null });
            return;
        }
        setEmailChangeSaving(true);
        setEmailChangeStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.requestEmailChange(trimmed);
        setEmailChangeSaving(false);
        if (!response.ok) {
            setEmailChangeStatus({
                loading: false,
                error: response.error ?? 'No pudimos solicitar el cambio de correo.',
                ok: null,
            });
            return;
        }
        await refresh();
        setEmailChangeModalOpen(false);
        setNewEmail('');
        setEmailChangeStatus({
            loading: false,
            error: null,
            ok: `Enviamos un enlace de confirmación a ${response.pendingEmail ?? trimmed}.`,
        });
    };

    const saveUserBasics = async () => {
        const fullName = `${firstName} ${lastName}`.trim();
        const userResponse = await serenatasApi.updateUser({
            name: fullName,
            phone,
            avatarUrl: avatarUrl || null,
        });
        if (!userResponse.ok) {
            setAccountStatus({ loading: false, error: userResponse.error ?? 'No pudimos guardar tus datos.', ok: null });
            return false;
        }
        return true;
    };

    const handleSaveBasics = async () => {
        const phoneError = phone.trim() ? validateChileMobilePhone(phone) : null;
        if (phoneError) {
            setPhoneFieldError(phoneError);
            setAccountStatus({ loading: false, error: null, ok: null });
            return;
        }
        setPhoneFieldError(null);
        setAccountStatus({ loading: true, error: null, ok: null });
        if (!(await saveUserBasics())) {
            setAccountStatus((s) => ({ ...s, loading: false }));
            return;
        }
        if (appMode === 'client') {
            const profileResponse = await serenatasApi.saveClientProfile({
                phone: phone.trim() || null,
            });
            if (!profileResponse.ok) {
                setAccountStatus({
                    loading: false,
                    error: profileResponse.error ?? 'No pudimos guardar tu contacto.',
                    ok: null,
                });
                return;
            }
        }
        await refresh();
        setAccountStatus({ loading: false, error: null, ok: 'Datos personales guardados.' });
    };

    const handleSaveNotificationPrefs = async () => {
        const sanitizedPrefs: CategoryNotificationPrefs = { ...categoryNotificationPrefs };
        for (const row of notificationCategoryRows) {
            if (row.whatsappAvailable === false) {
                sanitizedPrefs[row.key] = { ...sanitizedPrefs[row.key], whatsapp: false };
            }
        }
        const whatsappError = whatsappPhoneValidation(sanitizedPrefs, phone);
        if (whatsappError) {
            setNotificationPrefsStatus({ loading: false, error: whatsappError, ok: null });
            return;
        }
        const before: NotificationPrefsSnapshot = savedNotificationPrefsRef.current ?? notificationPrefsSnapshotFromUser(accountUser);
        const after: NotificationPrefsSnapshot = {
            emailDigestFrequency: before.emailDigestFrequency,
            categoryPrefs: sanitizedPrefs,
        };
        setNotificationPrefsSaving(true);
        setNotificationPrefsStatus({ loading: true, error: null, ok: null });
        const trimmedPhone = phone.trim();
        const response = await serenatasApi.updateUser(
            notificationPrefsToApiPayload(after, trimmedPhone || accountUser?.phone || ''),
        );
        setNotificationPrefsSaving(false);
        if (!response.ok) {
            setNotificationPrefsStatus({
                loading: false,
                error: response.error ?? 'No pudimos guardar tus preferencias.',
                ok: null,
            });
            return;
        }
        setNotificationPrefsTouched(false);
        savedNotificationPrefsRef.current = after;
        await refresh();
        setNotificationPrefsStatus({
            loading: false,
            error: null,
            ok: buildNotificationSaveMessage(before, after, { mode: appMode, profiles }),
        });
    };

    const handleSaveMusicianProfile = async () => {
        if (experienceYearsError) {
            setStatus({ loading: false, error: experienceYearsError, ok: null });
            return;
        }
        const phoneError = phone.trim() ? validateChileMobilePhone(phone) : null;
        if (phoneError) {
            setStatus({ loading: false, error: phoneError, ok: null });
            return;
        }
        setSaving(true);
        setStatus({ loading: true, error: null, ok: null });
        if (!(await saveUserBasics())) {
            setSaving(false);
            return;
        }
        const trimmedPrimary = instrument.trim();
        const trimmedSecond = secondInstrument.trim();
        if (hasInstrument && !trimmedPrimary) {
            setStatus({ loading: false, error: 'Indica tu instrumento principal.', ok: null });
            setSaving(false);
            return;
        }
        const instruments = hasInstrument
            ? [trimmedPrimary, trimmedSecond].filter((value, index, list) => value && list.indexOf(value) === index)
            : [];
        const musicianResponse = await serenatasApi.saveMusicianProfile({
            bio: musicianBio.trim() || null,
            hasInstrument,
            hasMariachiAttire,
            instrument: instruments[0] ?? null,
            instruments,
            experienceYears,
            region: musicianRegion.trim() || null,
            comuna: musicianComuna.trim() || null,
            workZones: [],
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
        const googleError = searchParams.get('google_error');
        const googleLinked = searchParams.get('google_linked');
        const oauthParams = ['google_error', 'google_error_message', 'google_linked'] as const;
        const hasOauthQuery = oauthParams.some((key) => searchParams.has(key));
        if (!hasOauthQuery) return;

        const accountEmail = accountUser?.email?.trim();
        const cleanOauthParams = () => {
            const params = new URLSearchParams(searchParams.toString());
            for (const key of oauthParams) params.delete(key);
            const rawTab = params.get('account_tab');
            const tab: AccountTab = isAccountTab(rawTab) ? rawTab : 'data';
            const qs = params.toString();
            const base = profileSectionHref(tab);
            router.replace(qs ? `${base.split('?')[0]}?${qs}` : base, { scroll: false });
        };

        if (googleError === 'email_mismatch') {
            const emailHint = accountEmail || 'tu cuenta';
            setGoogleLinkNotice(
                `El Google que elegiste usa otro correo. Usa la misma cuenta que ${emailHint} o inicia sesión con Google desde Acceso.`,
            );
            setGoogleStatus({ loading: false, error: null, ok: null });
            if (subsection !== 'data') setSubsection('data');
            cleanOauthParams();
            return;
        }

        setGoogleLinkNotice(null);
        if (googleError) {
            const detail = searchParams.get('google_error_message');
            setGoogleStatus({
                loading: false,
                error: detail ? decodeURIComponent(detail) : 'No pudimos vincular Google.',
                ok: null,
            });
            cleanOauthParams();
            return;
        }

        if (googleLinked === '1') {
            setGoogleStatus({ loading: false, error: null, ok: 'Google vinculado correctamente.' });
            void refresh();
            cleanOauthParams();
        }
    }, [searchParams, accountUser?.email, refresh, router, subsection]);

    useEffect(() => {
        if (subsection !== 'integrations') return;
        const gcParam = searchParams.get('gc');
        const gcMessage = searchParams.get('message');
        if (gcParam === 'connected') {
            setGcFlash({ loading: false, error: null, ok: 'Google Calendar conectado correctamente.' });
        } else if (gcParam === 'error') {
            setGcFlash({
                loading: false,
                error: gcMessage ? decodeURIComponent(gcMessage) : 'Error al conectar con Google Calendar.',
                ok: null,
            });
        }
        let cancelled = false;
        setGcLoading(true);
        void serenatasApi.googleCalendarStatus().then((status) => {
            if (cancelled) return;
            setGcConnected(status.connected);
            setGcLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [subsection, searchParams]);

    const handleDisconnectGoogleCalendar = async () => {
        setGcDisconnecting(true);
        setGcFlash({ loading: false, error: null, ok: null });
        const result = await serenatasApi.disconnectGoogleCalendar();
        setGcDisconnecting(false);
        if (!result.ok) {
            setGcFlash({ loading: false, error: 'No pudimos desconectar Google Calendar.', ok: null });
            return;
        }
        setGcConnected(false);
        setGcFlash({ loading: false, error: null, ok: 'Google Calendar desconectado.' });
    };

    const googleConnected = accountUser?.provider === 'google';
    const hasPassword = accountUser?.hasPassword === true;

    const handleDeleteAccount = async () => {
        setDeleteAccountSaving(true);
        setDeleteAccountStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.deleteAccount(
            hasPassword
                ? { password: deleteAccountPassword }
                : { confirmPhrase: deleteAccountConfirmPhrase },
        );
        setDeleteAccountSaving(false);
        if (!response.ok) {
            setDeleteAccountStatus({
                loading: false,
                error: response.error ?? 'No pudimos eliminar tu cuenta.',
                ok: null,
            });
            return;
        }
        setDeleteAccountOpen(false);
        await logoutAndGoHome();
    };

    const displayName = useMemo(
        () => `${firstName} ${lastName}`.trim() || accountUser?.name?.trim() || 'Tu cuenta',
        [accountUser?.name, firstName, lastName],
    );
    const showProfileSave = appMode === 'client' || appMode === 'work';
    const emailVerified = accountUser?.status === 'verified';

    const openPasswordChangeModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordChangeStatus({ loading: false, error: null, ok: null });
        setPasswordChangeModalOpen(true);
    };

    const closePasswordChangeModal = () => {
        setPasswordChangeModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (!passwordChangeStatus.ok) {
            setPasswordChangeStatus({ loading: false, error: null, ok: null });
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            setPasswordChangeStatus({ loading: false, error: 'La contraseña debe tener al menos 8 caracteres.', ok: null });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordChangeStatus({ loading: false, error: 'Las contraseñas no coinciden.', ok: null });
            return;
        }
        if (hasPassword && !currentPassword.trim()) {
            setPasswordChangeStatus({ loading: false, error: 'Ingresa tu contraseña actual.', ok: null });
            return;
        }
        setPasswordChangeSaving(true);
        setPasswordChangeStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.changePassword({
            ...(hasPassword ? { currentPassword } : {}),
            newPassword,
            confirmPassword,
        });
        setPasswordChangeSaving(false);
        if (!response.ok) {
            setPasswordChangeStatus({
                loading: false,
                error: response.error ?? 'No pudimos actualizar tu contraseña.',
                ok: null,
            });
            return;
        }
        await refresh();
        setPasswordChangeModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordChangeStatus({
            loading: false,
            error: null,
            ok: hasPassword ? 'Contraseña actualizada.' : 'Contraseña creada. Ya puedes entrar con tu correo.',
        });
    };

    async function connectGoogle() {
        setGoogleBusy(true);
        setGoogleStatus({ loading: true, error: null, ok: null });
        try {
            const returnTo =
                typeof window !== 'undefined'
                    ? `${window.location.origin}${profileSectionHref('data')}`
                    : profileSectionHref('data');
            sessionStorage.setItem('auth.returnTo', returnTo);
            const response = await fetch(
                `${API_BASE}/api/auth/google?mode=link&returnTo=${encodeURIComponent(returnTo)}`,
                { credentials: 'include' },
            );
            const data = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;
            if (!response.ok || !data?.authUrl) {
                setGoogleBusy(false);
                setGoogleStatus({ loading: false, error: data?.error ?? 'No pudimos iniciar la conexión con Google.', ok: null });
                return;
            }
            window.location.href = data.authUrl;
        } catch {
            setGoogleBusy(false);
            setGoogleStatus({ loading: false, error: 'No pudimos iniciar la conexión con Google.', ok: null });
        }
    }

    async function disconnectGoogle() {
        setGoogleDisconnectOpen(false);
        setGoogleBusy(true);
        setGoogleStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.disconnectGoogle();
        setGoogleBusy(false);
        if (!response.ok) {
            setGoogleStatus({
                loading: false,
                error: response.error ?? 'No pudimos desconectar Google.',
                ok: null,
            });
            return;
        }
        await refresh();
        setGoogleStatus({
            loading: false,
            error: null,
            ok: response.disconnected ? 'Google desconectado. Entra con tu correo y contraseña.' : null,
        });
    }

    function handleGoogleAccess() {
        if (googleConnected) {
            setGoogleDisconnectOpen(true);
            return;
        }
        void connectGoogle();
    }

    const handleResendPendingEmail = async () => {
        const pending = accountUser?.pendingEmail?.trim();
        if (!pending) return;
        setEmailPendingBusy('resend');
        setEmailChangeStatus({ loading: false, error: null, ok: null });
        const response = await serenatasApi.requestEmailChange(pending);
        setEmailPendingBusy(null);
        if (!response.ok) {
            setEmailChangeStatus({
                loading: false,
                error: response.error ?? 'No pudimos reenviar el correo.',
                ok: null,
            });
            return;
        }
        setEmailChangeStatus({
            loading: false,
            error: null,
            ok: `Reenviamos el enlace a ${response.pendingEmail ?? pending}.`,
        });
    };

    const handleCancelPendingEmail = async () => {
        setEmailPendingBusy('cancel');
        setEmailChangeStatus({ loading: false, error: null, ok: null });
        const response = await serenatasApi.cancelEmailChange();
        setEmailPendingBusy(null);
        if (!response.ok) {
            setEmailChangeStatus({
                loading: false,
                error: response.error ?? 'No pudimos cancelar el cambio.',
                ok: null,
            });
            return;
        }
        await refresh();
        setEmailChangeStatus({ loading: false, error: null, ok: 'Cambio de correo cancelado.' });
    };

    const profileLabel =
        profile === 'client' ? 'Cliente' : profile === 'musician' ? 'Músico' : ownerActive ? 'Dueño del grupo' : 'Operación';
    const notificationsReady = accountUser !== null;
    const notificationTogglesDisabled = !notificationsReady || notificationPrefsSaving;

    return (
        <div className="grid w-full min-w-0 max-w-full gap-5 lg:gap-6">
            <PanelPageHeader
                title="Mi cuenta"
                description="Datos personales, acceso, direcciones y preferencias."
                actions={<PanelStatusBadge tone="success" label={profileLabel} />}
            />

            <PanelPillNav
                items={accountPillItems}
                activeKey={subsection}
                onChange={(key) => {
                    if (isAccountTab(key)) void selectSubsection(key);
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
                    actions={
                        notificationsReady ? (
                            <>
                                {notificationPrefsDirty ? (
                                    <span className="text-xs text-[var(--fg-muted)]">Sin guardar</span>
                                ) : null}
                                <PanelButton
                                    type="button"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    disabled={notificationPrefsSaving || !notificationPrefsDirty}
                                    onClick={() => void handleSaveNotificationPrefs()}
                                >
                                    {notificationPrefsSaving ? 'Guardando…' : 'Guardar'}
                                </PanelButton>
                            </>
                        ) : null
                    }
                />
                <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
                    {notificationPrefsContextDescription(appMode, profiles)}
                </p>
                {!notificationsReady ? (
                    <NotificationPrefsSkeleton rows={notificationCategoryRows.length} />
                ) : (
                <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                    {notificationCategoryRows.map(({ key, label, hint, whatsappAvailable }) => (
                        <NotificationCategoryRow
                            key={key}
                            title={label}
                            hint={hint}
                            emailChecked={categoryNotificationPrefs[key].email}
                            whatsappChecked={categoryNotificationPrefs[key].whatsapp}
                            whatsappAvailable={whatsappAvailable !== false}
                            disabled={notificationTogglesDisabled}
                            onEmailChange={(email) => {
                                markNotificationPrefsTouched();
                                setCategoryNotificationPrefs((p) => ({
                                    ...p,
                                    [key]: { ...p[key], email },
                                }));
                            }}
                            onWhatsappChange={(whatsapp) => {
                                markNotificationPrefsTouched();
                                setCategoryNotificationPrefs((p) => ({
                                    ...p,
                                    [key]: { ...p[key], whatsapp },
                                }));
                            }}
                        />
                    ))}
                    {notificationCategoryRows.some(
                        (row) => row.whatsappAvailable !== false && categoryNotificationPrefs[row.key].whatsapp,
                    )
                    && whatsappPhoneValidation(
                        categoryNotificationPrefs,
                        phone.trim() || accountUser?.phone || '',
                    ) ? (
                        <p className="py-3 text-xs leading-relaxed text-[var(--fg-muted)]">
                            Para WhatsApp necesitas un móvil chileno en{' '}
                            <button
                                type="button"
                                className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                                onClick={() => void selectSubsection('data')}
                            >
                                Datos personales
                            </button>
                            .
                        </p>
                    ) : null}
                </div>
                )}
                <FormFeedback status={notificationPrefsStatus} />
            </PanelCard>
            ) : null}

            {subsection === 'integrations' ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Integraciones"
                    description="Conecta herramientas para coordinar tu negocio (agenda en Google Calendar)."
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'rgba(66,133,244,0.1)', color: '#4285F4' }}
                            aria-hidden
                        >
                            <IconCalendar size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-[var(--fg)]">Google Calendar</h3>
                                {!gcLoading && gcConnected ? (
                                    <PanelStatusBadge tone="success" label="Conectado" size="sm" />
                                ) : null}
                                {!gcLoading && !gcConnected ? (
                                    <PanelStatusBadge tone="neutral" label="No conectado" size="sm" />
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 sm:ml-4">
                        {gcLoading ? (
                            <p className="flex items-center justify-center gap-2 text-sm text-[var(--fg-muted)] sm:justify-end">
                                <IconLoader2 size={14} className="animate-spin" aria-hidden />
                                <span className="hidden sm:inline">Verificando…</span>
                            </p>
                        ) : gcConnected ? (
                            <PanelButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                                disabled={gcDisconnecting}
                                onClick={() => void handleDisconnectGoogleCalendar()}
                            >
                                {gcDisconnecting ? (
                                    <>
                                        <IconLoader2 size={14} className="animate-spin" />
                                        Desconectando…
                                    </>
                                ) : (
                                    <>
                                        <IconX size={14} />
                                        Desconectar
                                    </>
                                )}
                            </PanelButton>
                        ) : (
                            <a
                                href={serenatasApi.googleCalendarAuthUrl()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
                                style={{ background: '#4285F4' }}
                            >
                                <IconBrandGoogle size={15} />
                                Conectar con Google
                            </a>
                        )}
                    </div>
                </div>
                <FormFeedback status={gcFlash} />
            </PanelCard>
            ) : null}

            {subsection === 'subscription' && ownerActive ? (
                <SubscriptionSection />
            ) : null}

            {subsection === 'data' ? (
            <div className="grid gap-6">
            {appMode === 'work' && setSection ? (
                <OwnerOnboardingCard profiles={profiles} setSection={setSection} />
            ) : null}
            <PanelCard>
                <PanelBlockHeader
                    title="Datos personales"
                    description={
                        appMode === 'client'
                            ? 'Tu nombre, contacto y acceso a la cuenta.'
                            : 'Identidad, acceso y contacto.'
                    }
                />
                <div className="mt-5 space-y-6">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
                        <AvatarUpload
                            variant="overlay"
                            currentUrl={avatarUrl}
                            config={{
                                maxSize: 5120,
                                maxWidth: 96,
                                maxHeight: 96,
                                aspectRatio: 1,
                                circular: true,
                                onUpload: async (file, croppedBlob) => {
                                    const uploadResult = await serenatasApi.uploadAvatar(
                                        croppedBlob,
                                        file.name || 'avatar.webp',
                                    );
                                    if (uploadResult.ok && uploadResult.url) {
                                        await serenatasApi.updateUser({ avatarUrl: uploadResult.url });
                                        await refresh();
                                        return { url: uploadResult.url };
                                    }
                                    throw new Error(uploadResult.error || 'Error al subir el avatar');
                                },
                            }}
                            onSuccess={(url) => setAvatarUrl(resolveAvatarDisplayUrl(url) ?? '')}
                            onError={(error) => setAccountStatus({ loading: false, error, ok: null })}
                        />
                        <div className="min-w-0 text-center sm:text-left">
                            <p className="truncate text-lg font-semibold text-[var(--fg)]">{displayName}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <PanelStatusBadge
                                    tone={emailVerified ? 'success' : 'warning'}
                                    label={emailVerified ? 'Correo verificado' : 'Correo pendiente'}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-6">
                        <p className="mb-3 text-sm font-medium text-[var(--fg)]">Tu perfil</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <PanelField label="Nombre">
                                <FieldInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Felipe" />
                            </PanelField>
                            <PanelField label="Apellido">
                                <FieldInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Jara" />
                            </PanelField>
                        </div>
                        {appMode === 'client' ? (
                            <PanelField label="Teléfono" className="mt-3">
                                <FieldInput
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        if (phoneFieldError) setPhoneFieldError(null);
                                    }}
                                    placeholder={formatChileMobileHint()}
                                    aria-invalid={phoneFieldError ? true : undefined}
                                />
                                {phoneFieldError ? (
                                    <p className="text-xs text-[var(--color-error,#b91c1c)]">{phoneFieldError}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                                        Para que el mariachi te contacte al coordinar la serenata. La dirección del evento la
                                        indicas al solicitar o en la pestaña{' '}
                                        <strong className="font-medium text-[var(--fg)]">Direcciones</strong>.
                                    </p>
                                )}
                            </PanelField>
                        ) : appMode === 'work' ? (
                            <PanelField label="Teléfono personal" className="mt-3">
                                <FieldInput
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        if (phoneFieldError) setPhoneFieldError(null);
                                    }}
                                    placeholder={formatChileMobileHint()}
                                    aria-invalid={phoneFieldError ? true : undefined}
                                />
                                {phoneFieldError ? (
                                    <p className="text-xs text-[var(--color-error,#b91c1c)]">{phoneFieldError}</p>
                                ) : null}
                            </PanelField>
                        ) : null}
                        {showProfileSave ? (
                            <>
                                <PanelButton
                                    className="mt-4 w-full sm:w-auto"
                                    onClick={() => void handleSaveBasics()}
                                    disabled={accountStatus.loading}
                                >
                                    {accountStatus.loading ? 'Guardando...' : 'Guardar datos personales'}
                                </PanelButton>
                                <FormFeedback status={accountStatus} />
                            </>
                        ) : null}
                    </div>

                    <div className="border-t border-[var(--border)] pt-6">
                        <p className="mb-2 text-sm font-medium text-[var(--fg)]">Inicio de sesión</p>
                        <PanelPersonalDataList>
                            <PanelPersonalDataRow
                                label="Correo"
                                value={accountUser?.pendingEmail ?? accountUser?.email ?? '—'}
                                valueHint={
                                    accountUser?.pendingEmail
                                        ? `Correo actual: ${accountUser.email}. Confirma el enlace en el buzón nuevo.`
                                        : undefined
                                }
                                valueStatus={accountUser?.pendingEmail ? 'warning' : undefined}
                                actions={
                                    accountUser?.pendingEmail
                                        ? [
                                              {
                                                  label: 'Reenviar',
                                                  onClick: () => void handleResendPendingEmail(),
                                                  loading: emailPendingBusy === 'resend',
                                                  disabled: emailPendingBusy !== null,
                                                  ariaLabel: 'Reenviar correo de confirmación',
                                              },
                                              {
                                                  label: 'Cancelar',
                                                  onClick: () => void handleCancelPendingEmail(),
                                                  loading: emailPendingBusy === 'cancel',
                                                  disabled: emailPendingBusy !== null,
                                                  ariaLabel: 'Cancelar cambio de correo',
                                              },
                                          ]
                                        : [
                                              {
                                                  label: 'Cambiar',
                                                  onClick: openEmailChangeModal,
                                                  ariaLabel: 'Cambiar correo electrónico',
                                              },
                                          ]
                                }
                            />
                            <PanelPersonalDataRow
                                label="Google"
                                value={googleConnected ? 'Conectado' : 'No vinculado'}
                                valueStatus={googleConnected ? 'success' : 'neutral'}
                                valueHint={
                                    !googleConnected && accountUser?.email
                                        ? `Elige en Google la cuenta ${accountUser.email}. Si usas otro correo, se abrirá otra cuenta distinta.`
                                        : undefined
                                }
                                actions={[
                                    {
                                        label: googleConnected ? 'Desconectar' : 'Conectar',
                                        onClick: handleGoogleAccess,
                                        loading: googleBusy,
                                        disabled: googleBusy,
                                        ariaLabel: googleConnected ? 'Desconectar Google' : 'Conectar cuenta de Google',
                                    },
                                ]}
                            />
                            <PanelPersonalDataRow
                                label="Contraseña"
                                value={hasPassword ? 'Configurada' : 'Sin configurar'}
                                valueHint={
                                    googleConnected && !hasPassword
                                        ? 'Recomendado para entrar sin Google.'
                                        : undefined
                                }
                                actions={[
                                    {
                                        label: hasPassword ? 'Cambiar' : 'Crear',
                                        onClick: openPasswordChangeModal,
                                        ariaLabel: hasPassword ? 'Cambiar contraseña' : 'Crear contraseña',
                                    },
                                ]}
                            />
                        </PanelPersonalDataList>
                        <div className="mt-2 space-y-1">
                            {googleLinkNotice ? (
                                <PanelNotice tone="warning" className="!px-3 !py-2.5">
                                    {googleLinkNotice}
                                </PanelNotice>
                            ) : null}
                            <FormFeedback status={emailChangeStatus} />
                            <FormFeedback status={googleStatus} />
                            <FormFeedback status={passwordChangeStatus} />
                        </div>
                    </div>

                    {googleDisconnectOpen ? (
                        <GoogleDisconnectConfirmSheet
                            hasPassword={hasPassword}
                            busy={googleBusy}
                            onClose={() => setGoogleDisconnectOpen(false)}
                            onConfirm={() => void disconnectGoogle()}
                            onCreatePassword={() => {
                                setGoogleDisconnectOpen(false);
                                openPasswordChangeModal();
                            }}
                        />
                    ) : null}
                    {emailChangeModalOpen ? (
                        <EmailChangeModal
                            currentEmail={accountUser?.email ?? ''}
                            newEmail={newEmail}
                            pendingEmail={accountUser?.pendingEmail}
                            saving={emailChangeSaving}
                            status={emailChangeStatus}
                            onNewEmailChange={setNewEmail}
                            onClose={closeEmailChangeModal}
                            onSubmit={() => void handleRequestEmailChange()}
                        />
                    ) : null}
                    {passwordChangeModalOpen ? (
                        <PasswordChangeModal
                            hasPassword={hasPassword}
                            currentPassword={currentPassword}
                            newPassword={newPassword}
                            confirmPassword={confirmPassword}
                            saving={passwordChangeSaving}
                            status={passwordChangeStatus}
                            onCurrentPasswordChange={setCurrentPassword}
                            onNewPasswordChange={setNewPassword}
                            onConfirmPasswordChange={setConfirmPassword}
                            onClose={closePasswordChangeModal}
                            onSubmit={() => void handleChangePassword()}
                        />
                    ) : null}
                </div>
            </PanelCard>

            <PanelCard className="border-[var(--danger,#b91c1c)]/30">
                <PanelBlockHeader
                    title="Eliminar cuenta"
                    description="Borra tu usuario, perfiles de músico/cliente/dueño, mariachis, grupos, direcciones e imágenes subidas a Simple. Esta acción no se puede deshacer."
                />
                <PanelNotice tone="warning" className="mt-4 !px-3 !py-2.5">
                    <p className="text-xs leading-relaxed">
                        Las serenatas y datos de negocio de <strong className="font-medium">otros usuarios</strong> no se
                        eliminan; solo dejas de aparecer en ellos. Copias de respaldo del servidor pueden conservarse un
                        tiempo según la operación de la plataforma.
                    </p>
                </PanelNotice>
                <PanelButton
                    type="button"
                    variant="danger"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => {
                        setDeleteAccountPassword('');
                        setDeleteAccountConfirmPhrase('');
                        setDeleteAccountStatus({ loading: false, error: null, ok: null });
                        setDeleteAccountOpen(true);
                    }}
                >
                    Eliminar mi cuenta
                </PanelButton>
            </PanelCard>

            {deleteAccountOpen ? (
                <DeleteAccountSheet
                    hasPassword={hasPassword}
                    password={deleteAccountPassword}
                    confirmPhrase={deleteAccountConfirmPhrase}
                    saving={deleteAccountSaving}
                    status={deleteAccountStatus}
                    onPasswordChange={setDeleteAccountPassword}
                    onConfirmPhraseChange={setDeleteAccountConfirmPhrase}
                    onClose={() => setDeleteAccountOpen(false)}
                    onSubmit={() => void handleDeleteAccount()}
                />
            ) : null}

            </div>
            ) : null}

            {subsection === 'musician' && showMusicianProfileTab ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Perfil público"
                    description="Lo que ven los dueños de mariachi al invitarte o revisar tu ficha. Tu nombre y foto salen de Datos personales."
                />
                <div className="mt-4 grid gap-5">
                    <div className="grid gap-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                            Quién eres
                        </p>
                        <PanelField label="Presentación pública (opcional)">
                            <FieldTextarea
                                rows={3}
                                value={musicianBio}
                                onChange={(e) => setMusicianBio(e.target.value)}
                                placeholder="Estilo, repertorio y experiencia que verán al revisar tu perfil."
                                disabled={saving}
                            />
                        </PanelField>
                        <PanelField label="Años de experiencia (opcional)">
                            <FieldInput
                                type="number"
                                min={EXPERIENCE_YEARS_MIN}
                                max={EXPERIENCE_YEARS_MAX}
                                value={experienceYears}
                                onChange={(e) => setExperienceYears(Number(e.target.value))}
                                disabled={saving}
                            />
                            {experienceYearsError ? (
                                <p className="mt-1 text-xs text-[var(--danger)]">{experienceYearsError}</p>
                            ) : null}
                        </PanelField>
                    </div>

                    <div className="grid gap-3 border-t border-[var(--border)] pt-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                            Dónde te ubican
                        </p>
                        <RegionCommuneFields
                            region={musicianRegion}
                            comuna={musicianComuna}
                            onRegionChange={setMusicianRegion}
                            onComunaChange={setMusicianComuna}
                            disabled={saving}
                            optional
                        />
                        <p className="text-xs text-[var(--fg-muted)]">
                            La comuna base aparece en el directorio de músicos. La cobertura del mariachi se configura en
                            Mi negocio.
                        </p>
                    </div>

                    <div className="grid gap-3 border-t border-[var(--border)] pt-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                            Para integrar grupos
                        </p>
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--fg)]">¿Cuentas con instrumento propio?</p>
                                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                                    Los dueños ven qué instrumentos aportas al armar el grupo.
                                </p>
                            </div>
                            <PanelSwitch
                                checked={hasInstrument}
                                onChange={(value) => {
                                    setHasInstrument(value);
                                    if (!value) {
                                        setInstrument('');
                                        setSecondInstrument('');
                                    }
                                }}
                                size="sm"
                                ariaLabel="Cuenta con instrumento propio"
                                disabled={saving}
                            />
                        </div>
                        {hasInstrument ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PanelField label="Instrumento principal">
                                    <InstrumentSelect value={instrument} onChange={setInstrument} />
                                </PanelField>
                                <PanelField label="Segundo instrumento (opcional)">
                                    <InstrumentSelect
                                        value={secondInstrument}
                                        onChange={setSecondInstrument}
                                        placeholder="Sin segundo instrumento"
                                    />
                                </PanelField>
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--fg)]">¿Cuentas con tenida de mariachi?</p>
                                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                                    Traje o vestimenta típica para presentaciones formales.
                                </p>
                            </div>
                            <PanelSwitch
                                checked={hasMariachiAttire}
                                onChange={setHasMariachiAttire}
                                size="sm"
                                ariaLabel="Cuenta con tenida de mariachi"
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <FormFeedback status={status} />
                    <PanelButton
                        onClick={() => void handleSaveMusicianProfile()}
                        disabled={saving || Boolean(experienceYearsError)}
                    >
                        {saving ? 'Guardando...' : 'Guardar perfil público'}
                    </PanelButton>
                </div>
            </PanelCard>
            ) : null}

            {subsection === 'addresses' ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Direcciones"
                    description={
                        appMode === 'client'
                            ? 'Guarda direcciones para contratar serenatas más rápido.'
                            : 'Direcciones guardadas en tu cuenta (útiles al publicar o coordinar eventos).'
                    }
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

        </div>
    );
}

function DeleteAccountSheet({
    hasPassword,
    password,
    confirmPhrase,
    saving,
    status,
    onPasswordChange,
    onConfirmPhraseChange,
    onClose,
    onSubmit,
}: {
    hasPassword: boolean;
    password: string;
    confirmPhrase: string;
    saving: boolean;
    status: FormStatus;
    onPasswordChange: (value: string) => void;
    onConfirmPhraseChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    return (
        <PanelSheet onClose={onClose} ariaLabel="Eliminar cuenta" maxWidthClass="sm:max-w-md">
            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--fg)]">Eliminar cuenta</h2>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                    Se borrarán tus datos en SimpleSerenatas y en la plataforma compartida (perfiles, mariachis, fotos
                    subidas, mensajes y suscripciones vinculadas a tu usuario).
                </p>
                {hasPassword ? (
                    <PanelField label="Contraseña" className="mt-4">
                        <FieldInput
                            type="password"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            placeholder="Tu contraseña actual"
                            autoComplete="current-password"
                        />
                    </PanelField>
                ) : (
                    <PanelField label='Escribe "ELIMINAR" para confirmar' className="mt-4">
                        <FieldInput
                            value={confirmPhrase}
                            onChange={(e) => onConfirmPhraseChange(e.target.value)}
                            placeholder="ELIMINAR"
                            autoComplete="off"
                        />
                    </PanelField>
                )}
                <FormFeedback status={status} />
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <PanelButton type="button" variant="secondary" className="w-full" onClick={onClose} disabled={saving}>
                        Cancelar
                    </PanelButton>
                    <PanelButton
                        type="button"
                        variant="danger"
                        className="w-full"
                        disabled={saving || (hasPassword ? !password.trim() : confirmPhrase.trim().toUpperCase() !== 'ELIMINAR')}
                        onClick={onSubmit}
                    >
                        {saving ? 'Eliminando...' : 'Eliminar definitivamente'}
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}

function GoogleDisconnectConfirmSheet({
    hasPassword,
    busy,
    onClose,
    onConfirm,
    onCreatePassword,
}: {
    hasPassword: boolean;
    busy: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onCreatePassword: () => void;
}) {
    return (
        <PanelSheet onClose={onClose} ariaLabel="Desconectar Google" maxWidthClass="sm:max-w-sm">
            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--fg)]">Desconectar Google</h2>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                    {hasPassword
                        ? 'Ya no podrás entrar con Google. Podrás usar tu correo y contraseña.'
                        : 'Sin contraseña no podrás volver a entrar. Créala antes de desconectar Google.'}
                </p>
                <div className="mt-5 grid gap-2">
                    {hasPassword ? (
                        <PanelButton type="button" className="w-full" disabled={busy} onClick={onConfirm}>
                            {busy ? 'Desconectando...' : 'Desconectar Google'}
                        </PanelButton>
                    ) : (
                        <PanelButton type="button" className="w-full" onClick={onCreatePassword}>
                            Crear contraseña
                        </PanelButton>
                    )}
                    <PanelButton type="button" variant="secondary" className="w-full" disabled={busy} onClick={onClose}>
                        Cancelar
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}

function PasswordChangeModal({
    hasPassword,
    currentPassword,
    newPassword,
    confirmPassword,
    saving,
    status,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onClose,
    onSubmit,
}: {
    hasPassword: boolean;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    saving: boolean;
    status: FormStatus;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    const title = hasPassword ? 'Cambiar contraseña' : 'Crear contraseña';
    const submitLabel = hasPassword ? 'Guardar contraseña' : 'Crear contraseña';

    return (
        <PanelSheet onClose={onClose} ariaLabel={title} maxWidthClass="sm:max-w-sm">
            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                    {hasPassword
                        ? 'Usa una clave segura de al menos 8 caracteres.'
                        : 'Así podrás entrar con tu correo además de Google.'}
                </p>
                <div className="mt-5 grid gap-3">
                    {hasPassword ? (
                        <PanelField label="Contraseña actual">
                            <FieldInput
                                type="password"
                                autoComplete="current-password"
                                value={currentPassword}
                                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                            />
                        </PanelField>
                    ) : null}
                    <PanelField label="Nueva contraseña">
                        <FieldInput
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => onNewPasswordChange(e.target.value)}
                        />
                    </PanelField>
                    <PanelField label="Confirmar contraseña">
                        <FieldInput
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        />
                    </PanelField>
                </div>
                {hasPassword ? (
                    <p className="mt-3 text-xs text-[var(--fg-muted)]">
                        ¿La olvidaste?{' '}
                        <Link href="/auth/restablecer" className="font-medium underline underline-offset-2" onClick={onClose}>
                            Restablecer acceso
                        </Link>
                    </p>
                ) : null}
                <FormFeedback status={status} />
                <div className="mt-5 grid gap-2">
                    <PanelButton type="button" className="w-full" disabled={saving} onClick={onSubmit}>
                        {saving ? 'Guardando...' : submitLabel}
                    </PanelButton>
                    <PanelButton type="button" variant="secondary" className="w-full" disabled={saving} onClick={onClose}>
                        Cancelar
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}

function EmailChangeModal({
    currentEmail,
    newEmail,
    pendingEmail,
    saving,
    status,
    onNewEmailChange,
    onClose,
    onSubmit,
}: {
    currentEmail: string;
    newEmail: string;
    pendingEmail?: string | null;
    saving: boolean;
    status: FormStatus;
    onNewEmailChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    return (
        <PanelSheet onClose={onClose} ariaLabel="Cambiar correo" maxWidthClass="sm:max-w-sm">
            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--fg)]">Cambiar correo</h2>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                    Actual: <span className="text-[var(--fg)]">{currentEmail || 'Sin correo'}</span>
                </p>
                {pendingEmail ? (
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                        Pendiente: <span className="font-medium text-[var(--fg)]">{pendingEmail}</span>
                    </p>
                ) : null}
                <PanelField label="Nuevo correo" className="mt-5">
                    <FieldInput
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => onNewEmailChange(e.target.value)}
                        placeholder="nuevo@correo.com"
                    />
                </PanelField>
                <p className="mt-2 text-xs text-[var(--fg-muted)]">Te enviaremos un enlace para confirmar el cambio.</p>
                <FormFeedback status={status} />
                <div className="mt-5 grid gap-2">
                    <PanelButton type="button" className="w-full" disabled={saving} onClick={onSubmit}>
                        {saving ? 'Enviando...' : 'Enviar enlace'}
                    </PanelButton>
                    <PanelButton type="button" variant="secondary" className="w-full" disabled={saving} onClick={onClose}>
                        Cancelar
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}
