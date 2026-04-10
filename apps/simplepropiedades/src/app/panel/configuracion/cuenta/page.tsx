'use client';

import { useEffect, useState } from 'react';
import { IconUser } from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { updateAccountProfile } from '@/lib/account-profile';
import { PanelPageHeader, PanelCard, PanelField, PanelButton, PanelNotice } from '@simple/ui';

export default function CuentaPage() {
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { user, refreshSession, requireAuth } = useAuth();

    useEffect(() => {
        setProfileName(user?.name || '');
        setProfilePhone(user?.phone || '');
    }, [user]);

    const saveProfile = async () => {
        const normalizedName = profileName.trim();
        if (normalizedName.length < 2) {
            setMessage('Ingresa un nombre valido.');
            return;
        }
        setSaving(true);
        setMessage(null);
        const result = await updateAccountProfile({ name: normalizedName, phone: profilePhone });
        setSaving(false);
        if (!result.ok) {
            if (result.unauthorized) requireAuth();
            setMessage(result.error || 'No se pudo actualizar tu perfil.');
            return;
        }
        await refreshSession();
        setMessage('Perfil actualizado.');
    };

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Cuenta"
                description="Datos base de tu sesion y tu informacion principal."
            />

            <div className="flex flex-col gap-6">
                <PanelCard size="md">
                    <div className="flex items-center gap-4 mb-5">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
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
                        <PanelField label="Nombre">
                            <input
                                className="form-input"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Tu nombre"
                            />
                        </PanelField>
                        <PanelField label="Telefono">
                            <input
                                className="form-input"
                                value={profilePhone}
                                onChange={(e) => setProfilePhone(e.target.value)}
                                placeholder="+56 9 1234 5678"
                            />
                        </PanelField>
                        <PanelField label="Correo electronico">
                            <div className="form-input flex items-center">{user?.email || '-'}</div>
                        </PanelField>
                        <PanelField label="Rol">
                            <div className="form-input flex items-center">{user?.role || '-'}</div>
                        </PanelField>
                    </div>
                </PanelCard>

                {message && <PanelNotice>{message}</PanelNotice>}

                <PanelButton variant="accent" onClick={() => void saveProfile()} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </PanelButton>
            </div>
        </div>
    );
}
