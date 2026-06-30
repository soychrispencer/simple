'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import {
    BUSINESS_CATALOG_EDITOR_SECTION,
    BusinessCatalogTabs,
    PanelConfirmProvider,
    type BusinessCatalogTabKey,
} from '@simple/ui/panel';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { ProviderServicesEditor } from '@/components/panel/provider-services-editor';
import { ProviderGroupPacksEditor } from '@/components/panel/provider-group-packs-editor';
import { ProviderGroupPromotionsEditor } from '@/components/panel/provider-group-promotions-editor';

export function ProviderGroupServicesCatalog({
    group,
    ensureGroup,
    onSaved,
}: {
    group: ProviderGroup | null;
    ensureGroup: () => Promise<ProviderGroup | null>;
    onSaved: () => Promise<void>;
}) {
    const [tab, setTab] = useState<BusinessCatalogTabKey>('services');
    const [services, setServices] = useState<ProviderGroupService[]>([]);
    const [servicesLoading, setServicesLoading] = useState(true);

    const loadServices = useCallback(async () => {
        if (!group?.id) {
            setServices([]);
            setServicesLoading(false);
            return;
        }
        setServicesLoading(true);
        const response = await serenatasApi.providerGroupServices(group.id);
        setServices(response.ok ? response.items : []);
        setServicesLoading(false);
    }, [group?.id]);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    useEffect(() => {
        setTab('services');
    }, [group?.id]);

    const handleSaved = async () => {
        await loadServices();
        await onSaved();
    };

    return (
        <PanelConfirmProvider>
            <div className="w-full space-y-6">
                <p className="text-sm text-fg-secondary">{BUSINESS_CATALOG_EDITOR_SECTION.description}</p>

                <BusinessCatalogTabs
                    active={tab}
                    variant="buttons"
                    onChange={setTab}
                    counts={{
                        services: services.filter((service) => service.isActive).length,
                    }}
                />

                {tab === 'services' ? (
                    <ProviderServicesEditor
                        group={group}
                        ensureGroup={ensureGroup}
                        onSaved={handleSaved}
                    />
                ) : null}

                {tab === 'packs' ? (
                    servicesLoading ? (
                        <p className="flex items-center gap-2 text-sm text-fg-muted">
                            <IconLoader2 size={16} className="animate-spin" />
                            Cargando servicios…
                        </p>
                    ) : (
                        <ProviderGroupPacksEditor group={group} services={services} onSaved={handleSaved} />
                    )
                ) : null}

                {tab === 'promotions' ? (
                    servicesLoading ? (
                        <p className="flex items-center gap-2 text-sm text-fg-muted">
                            <IconLoader2 size={16} className="animate-spin" />
                            Cargando servicios…
                        </p>
                    ) : (
                        <ProviderGroupPromotionsEditor group={group} services={services} onSaved={handleSaved} />
                    )
                ) : null}
            </div>
        </PanelConfirmProvider>
    );
}
