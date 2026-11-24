'use client';

import { Fragment, type ReactNode } from 'react';
import type { SimpleAppId } from '@simple/config';
import { BrandLogo } from '@simple/ui/brand';
import { PanelButton } from '@simple/ui/panel';
import { useAuth } from './auth-context';
import { EmailVerificationGate } from './email-verification-gate';

type PanelAuthGuardProps = {
    children: ReactNode;
    appLabel: string;
    brandAppId: SimpleAppId;
    /** Permite mostrar solo una vista pública y acotada, como aceptar una invitación. */
    allowAnonymous?: boolean;
    /** Solo Agenda: superadmin puede entrar sin verificar correo. */
    allowUnverifiedSuperadmin?: boolean;
};

const ACCESS_COPY: Partial<Record<SimpleAppId, { title: string; description: string }>> = {
    simplepropiedades: {
        title: 'Todo tu trabajo inmobiliario, en un solo espacio',
        description: 'Publica inmuebles, organiza consultas y coordina visitas desde tu espacio Simple.',
    },
    simpleautos: {
        title: 'Toda tu operación automotriz, en un solo espacio',
        description: 'Publica vehículos, atiende consultas y sigue tus oportunidades desde tu espacio Simple.',
    },
    simpleagenda: {
        title: 'Tu agenda profesional, conectada a tu negocio',
        description: 'Administra servicios, clientes y agenda desde el espacio de trabajo que elijas.',
    },
};

export function PanelAuthGuard({ children, appLabel, brandAppId, allowAnonymous = false, allowUnverifiedSuperadmin = false }: PanelAuthGuardProps) {
    const { isLoggedIn, authLoading, openAuth, user, logout, refreshSession } = useAuth();

    if (authLoading) {
        return (
            <div
                className="container-app flex min-h-[70vh] items-center justify-center py-20"
                role="status"
                aria-live="polite"
            >
                <div className="flex flex-col items-center text-center">
                    <BrandLogo appId={brandAppId} size="md" className="mb-6" />
                    <span
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
                    />
                    <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Preparando tu espacio…
                    </p>
                    <span className="sr-only">Verificando tu sesión.</span>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        if (allowAnonymous) return <Fragment>{children}</Fragment>;
        return (
            <div className="container-app py-20 text-center">
                <div className="mx-auto flex max-w-2xl flex-col items-center">
                    <BrandLogo appId={brandAppId} size="md" className="mb-6" />
                    <h2 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--fg)' }}>
                        {ACCESS_COPY[brandAppId]?.title ?? 'Tu espacio de trabajo Simple'}
                    </h2>
                    <p className="mb-2 text-sm leading-6 sm:text-base" style={{ color: 'var(--fg-secondary, var(--fg-muted))' }}>
                        {ACCESS_COPY[brandAppId]?.description ?? 'Simple reúne las herramientas que necesitas para trabajar en un mismo espacio.'}
                    </p>
                    <p className="mb-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Crea tu cuenta para elegir cómo trabajas o inicia sesión para continuar.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <PanelButton onClick={() => openAuth('register')} variant="primary" className="h-11 px-6 text-sm">
                            Crear cuenta
                        </PanelButton>
                        <PanelButton onClick={() => openAuth('login')} variant="secondary" className="h-11 px-6 text-sm">
                            Iniciar sesión
                        </PanelButton>
                    </div>
                </div>
            </div>
        );
    }

    const canBypassVerification = allowUnverifiedSuperadmin && user?.role === 'superadmin';
    if (!canBypassVerification && user?.status !== 'verified') {
        return (
            <EmailVerificationGate
                appLabel={appLabel}
                email={user?.email ?? ''}
                logout={logout}
                refreshSession={refreshSession}
            />
        );
    }

    return <Fragment key={user?.id ?? 'authenticated'}>{children}</Fragment>;
}
