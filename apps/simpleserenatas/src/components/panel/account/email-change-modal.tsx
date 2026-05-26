'use client';

import { IconX } from '@tabler/icons-react';
import { PanelButton, PanelField } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { FieldInput, FormFeedback, type FormStatus } from '@/components/panel/shared';

export function EmailChangeModal({
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
