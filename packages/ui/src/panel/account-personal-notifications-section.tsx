'use client';

import Link from 'next/link';
import { IconBell, IconCheck, IconLoader2, IconMail } from '@tabler/icons-react';
import { PanelButton } from './panel-button';
import { PanelCard } from './panel-card';
import { PanelNotice, PanelSwitch } from './panel-primitives';

export type AccountPersonalNotificationPrefs = {
    inAppNotificationsEnabled: boolean;
    emailNotifyAccount: boolean;
};

function PrefRow({
    title,
    description,
    checked,
    onChange,
    disabled,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div
            className="flex items-start justify-between gap-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
        >
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{title}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
            </div>
            <PanelSwitch
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                size="sm"
                ariaLabel={title}
            />
        </div>
    );
}

export type PanelAccountPersonalNotificationsSectionProps = {
    loading?: boolean;
    saving?: boolean;
    saved?: boolean;
    error?: string | null;
    prefs: AccountPersonalNotificationPrefs;
    onPrefsChange: (patch: Partial<AccountPersonalNotificationPrefs>) => void;
    onSave: () => void | Promise<void>;
    hasChanges?: boolean;
    personalDataHref?: string;
    appLabel?: string;
    children?: React.ReactNode;
};

export function PanelAccountPersonalNotificationsSection({
    loading = false,
    saving = false,
    saved = false,
    error = null,
    prefs,
    onPrefsChange,
    onSave,
    hasChanges = true,
    personalDataHref = '/panel/mi-cuenta',
    appLabel = 'Simple',
    children = null,
}: PanelAccountPersonalNotificationsSectionProps) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" /> Cargando preferencias…
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <PanelCard size="md">
                <div className="mb-2 flex items-center gap-2">
                    <IconBell size={18} className="text-accent" />
                    <h2 className="text-sm font-semibold text-fg">Panel</h2>
                </div>
                <PrefRow
                    title="Notificaciones en el panel"
                    description={`Campana y avisos dentro de ${appLabel}.`}
                    checked={prefs.inAppNotificationsEnabled}
                    onChange={(v) => onPrefsChange({ inAppNotificationsEnabled: v })}
                />
            </PanelCard>

            <PanelCard size="md">
                <div className="mb-2 flex items-center gap-2">
                    <IconMail size={18} className="text-accent" />
                    <h2 className="text-sm font-semibold text-fg">Correo electrónico</h2>
                </div>
                <PrefRow
                    title="Cuenta y seguridad"
                    description="Accesos, cambios de email y avisos de la plataforma (no incluye verificación ni reset de contraseña)."
                    checked={prefs.emailNotifyAccount}
                    onChange={(v) => onPrefsChange({ emailNotifyAccount: v })}
                />
                <p className="pt-2 text-xs text-fg-muted">
                    Para actualizar tu correo de contacto, ve a{' '}
                    <Link href={personalDataHref} className="font-medium text-accent hover:underline">
                        Datos personales
                    </Link>
                    .
                </p>
            </PanelCard>

            {children}

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {saved ? (
                <PanelNotice tone="success">
                    <span className="flex items-center gap-2">
                        <IconCheck size={15} /> Preferencias guardadas
                    </span>
                </PanelNotice>
            ) : null}

            <div>
                <PanelButton variant="accent" onClick={() => void onSave()} disabled={saving || !hasChanges}>
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando…' : 'Guardar preferencias'}
                </PanelButton>
            </div>
        </div>
    );
}
