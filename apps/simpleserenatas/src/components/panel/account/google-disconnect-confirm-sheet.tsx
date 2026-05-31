'use client';

import { IconX } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';

export function GoogleDisconnectConfirmSheet({
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
                    <h2 className="text-lg font-semibold text-(--fg)">Desconectar Google</h2>
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
