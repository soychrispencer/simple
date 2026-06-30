'use client';

import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import {
    toggleCatalogServiceId,
    type CatalogAppliesTo,
    type CatalogServiceOption,
} from './business-catalog-form-types.js';

export type BusinessCatalogAppliesToFieldProps = {
    appliesTo: CatalogAppliesTo;
    serviceIds: string[];
    services: CatalogServiceOption[];
    onAppliesToChange: (appliesTo: CatalogAppliesTo) => void;
    onServiceIdsChange: (serviceIds: string[]) => void;
    className?: string;
    servicesFieldClassName?: string;
};

export function BusinessCatalogAppliesToField({
    appliesTo,
    serviceIds,
    services,
    onAppliesToChange,
    onServiceIdsChange,
    className = 'md:col-span-2',
    servicesFieldClassName = 'md:col-span-2',
}: BusinessCatalogAppliesToFieldProps) {
    if (services.length === 0) return null;

    return (
        <>
            <PanelField label="Aplica a" className={className}>
                <PanelSelect
                    value={appliesTo}
                    onChange={(event) => {
                        const next = event.target.value as CatalogAppliesTo;
                        onAppliesToChange(next);
                        if (next === 'all') onServiceIdsChange([]);
                    }}
                >
                    <option value="all">Todo el catálogo</option>
                    <option value="services">Servicios específicos</option>
                </PanelSelect>
            </PanelField>
            {appliesTo === 'services' ? (
                <PanelField label="Servicios incluidos" className={servicesFieldClassName}>
                    <div className="flex flex-wrap gap-2">
                        {services.map((service) => (
                            <label
                                key={service.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={serviceIds.includes(service.id)}
                                    onChange={() => onServiceIdsChange(toggleCatalogServiceId(serviceIds, service.id))}
                                />
                                {service.name}
                            </label>
                        ))}
                    </div>
                </PanelField>
            ) : null}
        </>
    );
}
