'use client';

import { IconLock, IconX } from '@tabler/icons-react';
import { PanelButton, PanelCard } from '@simple/ui';
import { useAuth } from '@simple/auth';
import { persistSignupProfile } from '@/lib/signup-profile';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { money } from '@/components/panel/shared';

export function SerenataRequestModalGuest({
    group,
    service,
    onClose,
}: {
    group: ProviderGroup;
    service: ProviderGroupService;
    onClose: () => void;
}) {
    const { openAuth } = useAuth();

    function openLogin() {
        openAuth('login');
    }

    function openRegister() {
        persistSignupProfile('client');
        openAuth('register');
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold text-fg">Solicitar serenata</p>
                    <p className="mt-1 text-sm text-fg-muted">
                        Inicia sesión o crea una cuenta de cliente para enviar tu solicitud a {group.name}.
                    </p>
                </div>
                <button
                    type="button"
                    className="shrink-0 rounded-xl bg-bg-subtle p-2 text-fg-muted transition-colors hover:text-fg"
                    onClick={onClose}
                    aria-label="Cerrar"
                >
                    <IconX size={18} />
                </button>
            </div>

            <PanelCard>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">Servicio seleccionado</p>
                <h3 className="mt-2 text-xl font-semibold text-fg">{service.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{group.name}</p>
                <p className="mt-3 text-lg font-semibold text-accent">{money(service.price)}</p>
            </PanelCard>

            <div className="rounded-card border border-border bg-bg-subtle px-4 py-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted">
                    <IconLock size={22} />
                </div>
                <p className="text-sm text-fg-muted">
                    Guardamos el servicio que elegiste. Al entrar podrás completar fecha, dirección y pago.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <PanelButton className="w-full" variant="primary" onClick={openLogin}>
                    Iniciar sesión
                </PanelButton>
                <PanelButton className="w-full" variant="secondary" onClick={openRegister}>
                    Crear cuenta de cliente
                </PanelButton>
            </div>
        </div>
    );
}
