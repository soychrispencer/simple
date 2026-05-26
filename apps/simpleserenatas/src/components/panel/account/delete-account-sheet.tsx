'use client';

import { IconX } from '@tabler/icons-react';
import { PanelButton, PanelField } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { FieldInput, FormFeedback, type FormStatus } from '@/components/panel/shared';

export function DeleteAccountSheet({
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
