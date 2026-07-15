'use client';

import { useEffect, useState } from 'react';
import {
    IconAnchor,
    IconBus,
    IconCar,
    IconMotorbike,
    IconPlane,
    IconPlus,
    IconTractor,
    IconTruck,
} from '@tabler/icons-react';
import { PanelChoiceCard } from '@simple/ui/panel';
import type { VehicleCatalogType } from '@/lib/publish-wizard-catalog';

export const SIMULADOR_VEHICLE_TYPES = [
    { value: 'car' as const, label: 'Auto / SUV', Icon: IconCar },
    { value: 'motorcycle' as const, label: 'Moto', Icon: IconMotorbike },
    { value: 'truck' as const, label: 'Camión', Icon: IconTruck },
    { value: 'bus' as const, label: 'Bus', Icon: IconBus },
    { value: 'machinery' as const, label: 'Maquinaria', Icon: IconTractor },
    { value: 'nautical' as const, label: 'Náutico', Icon: IconAnchor },
    { value: 'aerial' as const, label: 'Aéreo', Icon: IconPlane },
];

const BY_VALUE = Object.fromEntries(
    SIMULADOR_VEHICLE_TYPES.map((item) => [item.value, item]),
) as Record<VehicleCatalogType, (typeof SIMULADOR_VEHICLE_TYPES)[number]>;

export function SimuladorVehicleTypePicker({
    value,
    onChange,
}: {
    value: VehicleCatalogType;
    onChange: (value: VehicleCatalogType) => void;
}) {
    const isOtherMobile = value !== 'car';
    const isOtherDesktop = value !== 'car' && value !== 'motorcycle';
    const [showOthersMobile, setShowOthersMobile] = useState(isOtherMobile);
    const [showOthersDesktop, setShowOthersDesktop] = useState(isOtherDesktop);

    useEffect(() => {
        if (isOtherMobile) setShowOthersMobile(true);
        if (isOtherDesktop) setShowOthersDesktop(true);
    }, [isOtherMobile, isOtherDesktop]);

    const mobileOthers = SIMULADOR_VEHICLE_TYPES.filter((item) => item.value !== 'car');
    const desktopOthers = SIMULADOR_VEHICLE_TYPES.filter(
        (item) => item.value !== 'car' && item.value !== 'motorcycle',
    );

    const renderTypeCard = (
        item: (typeof SIMULADOR_VEHICLE_TYPES)[number],
        options?: { collapseOthers?: 'mobile' | 'desktop'; label?: string },
    ) => (
        <PanelChoiceCard
            key={item.value}
            onClick={() => {
                onChange(item.value);
                if (options?.collapseOthers === 'mobile') setShowOthersMobile(false);
                if (options?.collapseOthers === 'desktop') setShowOthersDesktop(false);
            }}
            selected={value === item.value}
            className="min-h-[52px] px-3"
        >
            <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                    <item.Icon size={15} />
                </span>
                <p className="truncate text-sm font-medium text-[var(--fg)]">
                    {options?.label ?? item.label}
                </p>
            </div>
        </PanelChoiceCard>
    );

    return (
        <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5 md:hidden">
                {renderTypeCard(BY_VALUE.car, { collapseOthers: 'mobile', label: 'Auto' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersMobile((current) => !current)}
                    selected={isOtherMobile}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium text-[var(--fg)]">Otro tipo</p>
                    </div>
                </PanelChoiceCard>
            </div>
            {showOthersMobile ? (
                <div className="grid grid-cols-2 gap-2 md:hidden">
                    {mobileOthers.map((item) => renderTypeCard(item))}
                </div>
            ) : null}

            <div className="hidden grid-cols-3 gap-2 md:grid">
                {renderTypeCard(BY_VALUE.car, { collapseOthers: 'desktop' })}
                {renderTypeCard(BY_VALUE.motorcycle, { collapseOthers: 'desktop' })}
                <PanelChoiceCard
                    onClick={() => setShowOthersDesktop((current) => !current)}
                    selected={isOtherDesktop}
                    className="min-h-[52px] px-3"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full panel-publish-icon">
                            <IconPlus size={15} />
                        </span>
                        <p className="truncate text-sm font-medium text-[var(--fg)]">Otro tipo</p>
                    </div>
                </PanelChoiceCard>
            </div>
            {showOthersDesktop ? (
                <div className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-3">
                    {desktopOthers.map((item) => renderTypeCard(item))}
                </div>
            ) : null}
        </div>
    );
}

export function labelForVehicleType(value: VehicleCatalogType): string {
    return BY_VALUE[value]?.label ?? value;
}
