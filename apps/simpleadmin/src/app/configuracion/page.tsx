'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminSystemStatus, type AdminSystemStatus } from '@/lib/api';
import { adminScopeLabel, normalizeAdminScope } from '@/lib/admin-scope';
import { PanelList, PanelListRow, PanelNotice, PanelPageHeader, PanelStatusBadge } from '@simple/ui/panel';

export default function ConfiguracionPage() {
    return (
        <AdminProtectedPage>
            {() => <ConfiguracionContent />}
        </AdminProtectedPage>
    );
}

function ConfiguracionContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<AdminSystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const scope = normalizeAdminScope(searchParams.get('scope'));

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
        <div className="container-app panel-page py-7">
            <PanelPageHeader
                title="Configuración"
                description={`Estado técnico para ${adminScopeLabel(scope).toLowerCase()} con señales globales limpias.`}
            />
            {loading ? (
                <PanelNotice tone="neutral">Cargando estado del sistema...</PanelNotice>
            ) : !status ? (
                <PanelNotice tone="error">No pudimos leer el estado del backend.</PanelNotice>
            ) : (
                <PanelList className="max-w-3xl">
                    {items.map((item, index) => (
                        <PanelListRow key={item.label} divider={index > 0}>
                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.label}</span>
                                <PanelStatusBadge
                                    label={item.value}
                                    tone={item.value.includes('Falta') || item.value.includes('No configurado') ? 'warning' : 'success'}
                                    size="sm"
                                />
                            </div>
                        </PanelListRow>
                    ))}
                </PanelList>
            )}
        </div>
    );
}
