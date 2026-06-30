'use client';

import { useRouter } from 'next/navigation';
import { PanelPillNav, type PanelPillNavItem } from './panel-navigation.js';

export type PanelSectionTabItem = PanelPillNavItem & {
    href: string;
};

export type PanelSectionTabsProps = {
    items: PanelSectionTabItem[];
    activeKey: string;
    ariaLabel?: string;
    onChange?: (key: string) => void;
};

export function PanelSectionTabs({
    items,
    activeKey,
    ariaLabel = 'Secciones',
    onChange,
}: PanelSectionTabsProps) {
    const router = useRouter();

    return (
        <PanelPillNav
            items={items.map(({ key, label, badge, disabled, leading, tone }) => ({
                key,
                label,
                badge,
                disabled,
                leading,
                tone,
            }))}
            activeKey={activeKey}
            onChange={(key) => {
                if (onChange) {
                    onChange(key);
                    return;
                }
                const item = items.find((entry) => entry.key === key);
                if (item && !item.disabled) router.push(item.href);
            }}
            ariaLabel={ariaLabel}
            showMobileDropdown
            breakpoint="md"
            size="sm"
        />
    );
}
