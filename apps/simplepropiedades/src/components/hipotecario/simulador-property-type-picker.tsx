'use client';

import { useEffect, useState } from 'react';
import {
    IconBuildingCommunity,
    IconBuildingSkyscraper,
    IconBuildingStore,
    IconHome2,
    IconMapPin,
    IconPlus,
} from '@tabler/icons-react';
import { PanelChoiceCard } from '@simple/ui/panel';

export const SIMULADOR_PROPERTY_TYPES = [
    { value: 'Departamento', label: 'Departamento', icon: <IconBuildingSkyscraper size={16} /> },
    { value: 'Casa', label: 'Casa', icon: <IconHome2 size={16} /> },
    { value: 'Oficina', label: 'Oficina', icon: <IconBuildingCommunity size={16} /> },
    { value: 'Local comercial', label: 'Local comercial', icon: <IconBuildingStore size={16} /> },
    { value: 'Bodega', label: 'Bodega', icon: <IconBuildingCommunity size={16} /> },
    { value: 'Terreno', label: 'Terreno', icon: <IconMapPin size={16} /> },
    { value: 'Parcela', label: 'Parcela', icon: <IconMapPin size={16} /> },
] as const;

export type SimuladorPropertyType = (typeof SIMULADOR_PROPERTY_TYPES)[number]['value'];

const BY_VALUE = Object.fromEntries(
    SIMULADOR_PROPERTY_TYPES.map((item) => [item.value, item]),
) as Record<SimuladorPropertyType, (typeof SIMULADOR_PROPERTY_TYPES)[number]>;

const PRIMARY = ['Departamento', 'Casa'] as const;

export function SimuladorPropertyTypePicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const isOther = !PRIMARY.includes(value as (typeof PRIMARY)[number]);
    const [showOthers, setShowOthers] = useState(isOther);

    useEffect(() => {
        if (isOther) setShowOthers(true);
    }, [isOther]);

    const others = SIMULADOR_PROPERTY_TYPES.filter(
        (item) => !PRIMARY.includes(item.value as (typeof PRIMARY)[number]),
    );

    const renderTypeCard = (
        item: (typeof SIMULADOR_PROPERTY_TYPES)[number],
        options?: { collapseOthers?: boolean },
    ) => (
        <PanelChoiceCard
            key={item.value}
            onClick={() => {
                onChange(item.value);
                if (options?.collapseOthers) setShowOthers(false);
            }}
            selected={value === item.value}
            className="min-h-[64px] px-3.5 py-3"
        >
            <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                    {item.icon}
                </span>
                <p className="text-sm font-medium leading-snug text-[var(--fg)]">{item.label}</p>
            </div>
        </PanelChoiceCard>
    );

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRIMARY.map((key) => renderTypeCard(BY_VALUE[key], { collapseOthers: true }))}
            </div>

            <PanelChoiceCard
                onClick={() => setShowOthers((current) => !current)}
                selected={isOther || showOthers}
                className="min-h-[56px] px-3.5 py-3"
            >
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                        <IconPlus size={16} />
                    </span>
                    <p className="text-sm font-medium text-[var(--fg)]">
                        {showOthers ? 'Ocultar otros tipos' : 'Otro tipo de propiedad'}
                    </p>
                </div>
            </PanelChoiceCard>

            {showOthers ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {others.map((item) => renderTypeCard(item))}
                </div>
            ) : null}
        </div>
    );
}
