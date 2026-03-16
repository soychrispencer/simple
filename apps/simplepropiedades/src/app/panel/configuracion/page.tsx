'use client';

import { useEffect, useState } from 'react';
import {
    IconMail,
    IconMapPin,
    IconNotebook,
    IconPhone,
    IconPlugConnected,
    IconUser,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import InstagramIntegrationCard from '@/components/panel/instagram-integration-card';
import PublicProfileEditor from '@/components/panel/public-profile-editor';
import { updateAccountProfile } from '@/lib/account-profile';
import type { AddressBookEntry } from '@simple/types';
import type { AddressBookManagerSubmitInput } from '@simple/ui';
import { AddressBookManager, PanelBlockHeader, PanelButton, PanelNotice, PanelPillNav } from '@simple/ui';
import {
    createAddressBookEntry,
    deleteAddressBookEntry,
    fetchAddressBook,
    getCommunesForRegion,
    LOCATION_REGIONS,
    updateAddressBookEntry,
} from '@simple/utils';

type ConfigTab = 'cuenta' | 'pagina' | 'direcciones' | 'integraciones';

const INTEGRATION_HASH = '#integraciones';

export default function ConfiguracionPage() {
    const [tab, setTab] = useState<ConfigTab>('cuenta');
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [addressBookLoading, setAddressBookLoading] = useState(true);
    const [addressBookSaving, setAddressBookSaving] = useState(false);
    const [addressBookDeletingId, setAddressBookDeletingId] = useState<string | null>(null);
    const [addressMessage, setAddressMessage] = useState<string | null>(null);
    const { user, refreshSession, requireAuth } = useAuth();

    useEffect(() => {
        const syncFromHash = () => {
            if (window.location.hash === INTEGRATION_HASH) {
                setTab('integraciones');
            }
        };

        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    useEffect(() => {
        setProfileName(user?.name || '');
        setProfilePhone(user?.phone || '');
    }, [user]);

    useEffect(() => {
        let active = true;
        const loadAddresses = async () => {
            const result = await fetchAddressBook();
            if (!active) return;
            setAddressBook(result.items);
            setAddressBookLoading(false);
            if (!result.ok && result.error) {
                setAddressMessage(result.error);
            }
        };
        void loadAddresses();
        return () => {
            active = false;
        };
    }, []);

    const saveProfile = async () => {
        const normalizedName = profileName.trim();
        if (normalizedName.length < 2) {
            setProfileMessage('Ingresa un nombre válido.');
            return;
        }

        setProfileSaving(true);
        setProfileMessage(null);
        const result = await updateAccountProfile({
            name: normalizedName,
            phone: profilePhone,
        });
        setProfileSaving(false);

        if (!result.ok) {
            if (result.unauthorized) {
                requireAuth();
            }
            setProfileMessage(result.error || 'No se pudo actualizar tu perfil.');
            return;
        }

        await refreshSession();
        setProfileMessage('Perfil actualizado.');
    };

    function handleTabChange(next: ConfigTab) {
        setTab(next);
        const url = new URL(window.location.href);
        if (next === 'integraciones') {
            window.history.replaceState(null, '', `${url.pathname}${url.search}${INTEGRATION_HASH}`);
            return;
        }
        if (url.hash) {
            window.history.replaceState(null, '', `${url.pathname}${url.search}`);
        }
    }

    const navItems = [
        { key: 'cuenta', label: 'Cuenta', icon: <IconUser size={14} /> },
        { key: 'pagina', label: 'Página pública', icon: <IconNotebook size={14} /> },
        { key: 'direcciones', label: 'Direcciones', icon: <IconMapPin size={14} /> },
        { key: 'integraciones', label: 'Integraciones', icon: <IconPlugConnected size={14} /> },
    ] as const;

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader
                title="Configuración"
                description="Gestiona tu cuenta y preferencias"
            />

            <div className="w-full max-w-5xl space-y-6">
                <PanelPillNav
                    items={navItems.map((item) => ({
                        key: item.key,
                        label: item.label,
                        leading: item.icon,
                    }))}
                    activeKey={tab}
                    onChange={(key) => handleTabChange(key as ConfigTab)}
                    ariaLabel="Secciones de configuración"
                    mobileLabel="Sección de configuración"
                    breakpoint="md"
                    size="sm"
                />

                <div className="min-w-0">
                    {tab === 'cuenta' && (
                        <div className="space-y-6">
                            <PanelBlockHeader
                                title="Cuenta"
                                description="Datos base de tu sesión y tu información principal."
                                className="mb-0"
                            />

                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                >
                                    <IconUser size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        {user?.name || 'Usuario Simple'}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        {user?.email || 'Sin correo'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Nombre" icon={<IconUser size={13} />}>
                                    <input
                                        className="form-input"
                                        value={profileName}
                                        onChange={(event) => setProfileName(event.target.value)}
                                        placeholder="Tu nombre"
                                    />
                                </Field>
                                <Field label="Teléfono" icon={<IconPhone size={13} />}>
                                    <input
                                        className="form-input"
                                        value={profilePhone}
                                        onChange={(event) => setProfilePhone(event.target.value)}
                                        placeholder="+56 9 1234 5678"
                                    />
                                </Field>
                                <Field label="Correo electrónico" icon={<IconMail size={13} />}><div className="form-input flex items-center">{user?.email || '-'}</div></Field>
                                <Field label="Rol" icon={<IconUser size={13} />}><div className="form-input flex items-center">{user?.role || '-'}</div></Field>
                                <Field label="Sesión" icon={<IconPhone size={13} />}><div className="form-input flex items-center">{user ? 'Activa' : 'No autenticada'}</div></Field>
                            </div>

                            <div className="flex items-center gap-3">
                                <PanelButton type="button" onClick={() => void saveProfile()} disabled={profileSaving}>
                                    {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                                </PanelButton>
                                {profileMessage ? <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{profileMessage}</span> : null}
                            </div>
                        </div>
                    )}

                    {tab === 'pagina' && <PublicProfileEditor />}

                    {tab === 'direcciones' && (
                        <div className="space-y-4">
                            <AddressBookManager
                                entries={addressBook}
                                regions={LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }))}
                                getCommunes={(regionId) => getCommunesForRegion(regionId).map((item) => ({ value: item.id, label: item.name }))}
                                loading={addressBookLoading}
                                saving={addressBookSaving}
                                deletingId={addressBookDeletingId}
                                onSaveEntry={async (draft: AddressBookManagerSubmitInput) => {
                                    setAddressBookSaving(true);
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
                                        geoPoint: draft.location.geoPoint,
                                        contactName: draft.contactName,
                                        contactPhone: draft.contactPhone,
                                        isDefault: draft.isDefault,
                                    };
                                    const result = draft.id
                                        ? await updateAddressBookEntry(draft.id, payload)
                                        : await createAddressBookEntry(payload);
                                    setAddressBookSaving(false);
                                    if (!result.ok) {
                                        setAddressMessage(result.error || 'No se pudo guardar la dirección.');
                                        return false;
                                    }
                                    setAddressBook(result.items);
                                    setAddressMessage(draft.id ? 'Dirección actualizada.' : 'Dirección agregada.');
                                    return true;
                                }}
                                onDeleteEntry={async (entryId) => {
                                    setAddressBookDeletingId(entryId);
                                    const result = await deleteAddressBookEntry(entryId);
                                    setAddressBookDeletingId(null);
                                    if (!result.ok) {
                                        setAddressMessage(result.error || 'No se pudo eliminar la dirección.');
                                        return;
                                    }
                                    setAddressBook(result.items);
                                    setAddressMessage('Dirección eliminada.');
                                }}
                            />
                            {addressMessage ? <PanelNotice>{addressMessage}</PanelNotice> : null}
                        </div>
                    )}

                    {tab === 'integraciones' && (
                        <div id="integraciones" className="space-y-6">
                            <PanelBlockHeader
                                title="Integraciones"
                                description="Conecta servicios externos para potenciar campañas, difusión y captación de leads."
                                className="mb-0"
                            />

                            <InstagramIntegrationCard />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-sm font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--fg-secondary)' }}>
                {icon}
                {label}
            </label>
            {children}
        </div>
    );
}
