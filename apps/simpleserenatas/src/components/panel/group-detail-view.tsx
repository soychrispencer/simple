'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton } from '@simple/ui/panel';
import { IconArrowLeft } from '@tabler/icons-react';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import {
    bookingPolicySummary,
    contactAvailabilityLabel,
    formatPaymentMethods,
} from '@/lib/marketplace-group-display';
import { MariachiRepertoireSection } from '@/components/public/mariachi-repertoire-section';
import { EmptyBlock, FormFeedback, type FormStatus } from './shared';
import {
    MariachiProfileHero,
    MariachiProfileServicesList,
} from './mariachi-profile-layout';

export function GroupDetailView({
    slug,
    onBack,
    onRequest,
}: {
    slug: string;
    onBack: () => void;
    onRequest: (group: ProviderGroup, service: ProviderGroupService) => void;
}) {
    const [group, setGroup] = useState<ProviderGroup | null>(null);
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });

    useEffect(() => {
        let cancelled = false;
        setStatus({ loading: true, error: null, ok: null });
        void serenatasApi.marketplaceGroupBySlug(slug).then(async (groupResponse) => {
            if (cancelled) return;
            if (!groupResponse.ok || !groupResponse.item) {
                setStatus({ loading: false, error: groupResponse.error ?? 'Mariachi no encontrado', ok: null });
                return;
            }
            setGroup(groupResponse.item);
            const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
            if (cancelled) return;
            if (!servicesResponse.ok) {
                setStatus({ loading: false, error: servicesResponse.error ?? 'No pudimos cargar servicios', ok: null });
                return;
            }
            setServices(servicesResponse.items);
            setStatus({ loading: false, error: null, ok: null });
        });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const paymentMethods = group ? formatPaymentMethods(group) : [];
    const trustFooter = group ? (
        <p className="leading-relaxed">
            {[
                paymentMethods.length > 0 ? `Pagos: ${paymentMethods.join(' · ')}` : null,
                contactAvailabilityLabel(group),
                bookingPolicySummary(group).mode,
            ]
                .filter(Boolean)
                .join(' · ')}
        </p>
    ) : null;

    if (status.loading) {
        return <p className="text-sm text-fg-muted">Cargando mariachi…</p>;
    }

    if (!group) {
        return (
            <div className="grid gap-4">
                <EmptyBlock title="Mariachi no disponible" description={status.error ?? 'Intenta con otro mariachi.'} />
                <PanelButton variant="secondary" onClick={onBack}>Volver</PanelButton>
            </div>
        );
    }

    return (
        <div className="grid min-w-0 gap-5">
            <PanelButton className="w-fit" variant="ghost" onClick={onBack}>
                <IconArrowLeft size={16} />
                Volver a mariachis
            </PanelButton>

            <MariachiProfileHero group={group} />

            <div className="grid gap-4">
                {status.error ? <FormFeedback status={status} /> : null}
                <MariachiRepertoireSection groupSlug={group.slug} />
                <MariachiProfileServicesList
                    services={services}
                    footer={trustFooter}
                    renderAction={(service) => (
                        <PanelButton className="w-full sm:w-auto" onClick={() => onRequest(group, service)}>
                            Solicitar
                        </PanelButton>
                    )}
                />
            </div>
        </div>
    );
}
