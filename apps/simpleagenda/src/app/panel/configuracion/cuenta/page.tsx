'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@simple/auth';
import { updateAccountProfile } from '@/lib/account-profile';
import { PanelPageHeader, PanelAccountProfileCard, PanelField, PanelButton, PanelNotice, PanelCard, PanelBlockHeader } from '@simple/ui';

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
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Datos personales"
                description="Nombre, correo y teléfono de tu cuenta."
            />

            <div className="flex flex-col gap-6">
                <PanelAccountProfileCard
                    name={user?.name || 'Usuario Simple'}
                    email={user?.email || 'Sin correo'}
                    role={user?.role || 'Profesional'}
                />

                <PanelCard>
                    <PanelBlockHeader title="Información de contacto" />
                    <div className="flex flex-col gap-4">
                        <PanelField label="Nombre completo">
                            <input
                                className="form-input"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Tu nombre completo"
                            />
                        </PanelField>
                        <PanelField label="Teléfono">
                            <input
                                className="form-input"
                                value={profilePhone}
                                onChange={(e) => setProfilePhone(e.target.value)}
                                placeholder="+56 9 1234 5678"
                            />
                        </PanelField>
                        <PanelButton variant="accent" onClick={() => void saveProfile()} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </PanelButton>
                        {message && (
                            <PanelNotice tone={message.includes('actualizado') ? 'success' : 'error'}>
                                {message}
                            </PanelNotice>
                        )}
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}