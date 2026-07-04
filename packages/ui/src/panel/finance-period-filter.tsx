'use client';

import { PanelPillNav, type PanelPillNavItem } from './panel-navigation.js';

export type PeriodOption = {
    key: string;
    label: string;
};

export function FinancePeriodFilter({
    options,
    value,
    onChange,
}: {
    options: PeriodOption[];
    value: string;
    onChange: (key: string) => void;
}) {
    const items: PanelPillNavItem[] = options.map((opt) => ({
        key: opt.key,
        label: opt.label,
    }));

    return (
        <PanelPillNav
            items={items}
            activeKey={value}
            onChange={onChange}
            ariaLabel="Filtro de período"
            size="sm"
        />
    );
}
