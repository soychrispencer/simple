'use client';

import Link from 'next/link';
import { IconX } from '@tabler/icons-react';
import { PanelButton, PanelField } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { FieldInput, FormFeedback, type FormStatus } from '@/components/panel/shared';

export function PasswordChangeModal({
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
                    <h2 className="text-lg font-semibold text-(--fg)">{title}</h2>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-(--fg-muted) hover:bg-(--bg-subtle)"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-(--fg-muted)">
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
                    <p className="mt-3 text-xs text-(--fg-muted)">
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
