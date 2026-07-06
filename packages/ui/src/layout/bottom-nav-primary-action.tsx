'use client';

import type { ComponentType, CSSProperties } from 'react';
import {
    bottomNavPrimaryActionStyleWithShadow,
    bottomNavStandardActiveColor,
    bottomNavStandardMutedColor,
    BOTTOM_NAV_ITEM_CLASS,
    BOTTOM_NAV_ITEM_COMPACT_CLASS,
    BOTTOM_NAV_LABEL_CLASS,
    BOTTOM_NAV_LABEL_COMPACT_CLASS,
} from './bottom-nav-styles';

type TablerIconProps = {
    size?: number;
    strokeWidth?: number;
    stroke?: number;
    style?: CSSProperties;
};

export type BottomNavPrimaryActionProps = {
    icon: ComponentType<TablerIconProps>;
    label: string;
    active?: boolean;
    boxShadow?: string;
    labelClassName?: string;
};

export function BottomNavPrimaryAction({
    icon: Icon,
    label,
    active: _active = false,
    boxShadow,
    labelClassName = BOTTOM_NAV_LABEL_CLASS,
}: BottomNavPrimaryActionProps) {
    return (
        <>
            <div
                className="flex h-11 w-11 items-center justify-center rounded-button"
                style={bottomNavPrimaryActionStyleWithShadow(boxShadow)}
            >
                <Icon size={18} strokeWidth={2.5} stroke={2.5} />
            </div>
            <span className={labelClassName} style={{ color: 'var(--fg)' }}>
                {label}
            </span>
        </>
    );
}

export type BottomNavStandardItemProps = {
    icon: ComponentType<TablerIconProps>;
    label: string;
    active?: boolean;
    labelClassName?: string;
};

export function BottomNavStandardItem({
    icon: Icon,
    label,
    active = false,
    labelClassName = BOTTOM_NAV_LABEL_CLASS,
}: BottomNavStandardItemProps) {
    const color = active ? bottomNavStandardActiveColor : bottomNavStandardMutedColor;

    return (
        <>
            <Icon size={18} strokeWidth={active ? 2 : 1.5} stroke={active ? 2 : 1.5} style={{ color }} />
            <span className={labelClassName} style={{ color, fontWeight: active ? 500 : 400 }}>
                {label}
            </span>
        </>
    );
}

export function bottomNavItemClassName(active: boolean, compact: boolean): string {
    const base = compact ? BOTTOM_NAV_ITEM_COMPACT_CLASS : BOTTOM_NAV_ITEM_CLASS;
    return active ? `${base} bottom-nav-item--active` : base;
}
