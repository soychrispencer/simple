'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { resolveSafeInternalPath } from '@simple/auth';
import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { AdminAuthFrame } from '@/components/admin-auth-frame';
import { completeAdminGoogleCallback } from '@/lib/api';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [returnTo, setReturnTo] = useState('/');

    useEffect(() => {
        const complete = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const nextReturnTo = resolveSafeInternalPath(params.get('returnTo') || sessionStorage.getItem('admin.auth.returnTo'), '/');
                setReturnTo(nextReturnTo);
                if (!code) throw new Error('No se recibió el código de autorización.');

                await completeAdminGoogleCallback({ code, state: params.get('state') });
                setStatus('success');
                window.setTimeout(() => {
                    sessionStorage.removeItem('admin.auth.returnTo');
                    window.location.replace(nextReturnTo);
                }, 800);
            } catch (error) {
                console.error('Google callback error:', error);
                setStatus('error');
            }
        };
        void complete();
    }, []);

    return (
        <AdminAuthFrame>
            {status === 'loading' ? <CallbackState title="Conectando con Google" description="Estamos verificando tu cuenta." /> : null}
            {status === 'success' ? <CallbackState title="Conexión exitosa" description="Redirigiendo..." icon={<IconCheck size={22} />} /> : null}
            {status === 'error' ? (
                <div className="text-center">
                    <StateIcon><IconX size={22} /></StateIcon>
                    <h1 className="text-xl font-semibold text-[var(--fg)]">Error de conexión</h1>
                    <PanelNotice tone="error" className="my-4 text-left">No se pudo conectar con Google. Inténtalo de nuevo.</PanelNotice>
                    <PanelButton className="w-full" onClick={() => router.push(returnTo)}>Volver al inicio</PanelButton>
                </div>
            ) : null}
        </AdminAuthFrame>
    );
}

function CallbackState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
    return (
        <div className="text-center">
            {icon ? <StateIcon>{icon}</StateIcon> : <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--fg)]" />}
            <h1 className="text-xl font-semibold text-[var(--fg)]">{title}</h1>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{description}</p>
        </div>
    );
}

function StateIcon({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--fg)]">{children}</div>;
}
