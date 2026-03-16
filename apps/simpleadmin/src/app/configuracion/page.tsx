'use client';

import { useEffect, useState } from 'react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminSystemStatus, type AdminSystemStatus } from '@/lib/api';

export default function ConfiguracionPage() {
    return (
        <AdminProtectedPage>
            {() => <ConfiguracionContent />}
        </AdminProtectedPage>
    );
}

function ConfiguracionContent() {
    const [status, setStatus] = useState<AdminSystemStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const run = async () => {
            const next = await fetchAdminSystemStatus();
            if (!active) return;
            setStatus(next);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    const items = status ? [
        { label: 'Entorno', value: status.nodeEnv },
        { label: 'Base de datos', value: status.databaseConfigured ? 'Configurada' : 'Falta configurar' },
        { label: 'Sesión', value: status.sessionConfigured ? 'Configurada' : 'Falta configurar' },
        { label: 'SMTP', value: status.smtpConfigured ? 'Configurado' : 'No configurado' },
        { label: 'Mercado Pago', value: status.mercadoPagoConfigured ? 'Configurado' : 'No configurado' },
        { label: 'Instagram', value: status.instagramConfigured ? 'Configurado' : 'No configurado' },
        { label: 'Ingesta de leads', value: status.leadIngestConfigured ? 'Configurada' : 'No configurada' },
        { label: 'Google OAuth', value: status.googleOAuthConfigured ? 'Configurado' : 'No configurado' },
    ] : [];

    return (
        <>
            <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--fg)' }}>Configuración</h1>
            <p className="text-xs mb-6" style={{ color: 'var(--fg-muted)' }}>Estado real de la configuración operativa</p>

            <div className="max-w-2xl rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
                {loading ? (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando estado del sistema...</p>
                ) : !status ? (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No pudimos leer el estado del backend.</p>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-4">
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.label}</span>
                                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
