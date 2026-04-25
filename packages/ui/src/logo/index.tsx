import Link from 'next/link';
import type { ComponentType } from 'react';

export interface LogoProps {
    brand?: 'autos' | 'propiedades' | 'agenda' | 'serenatas' | 'admin' | 'plataforma';
    href?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const BRAND_CONFIG = {
    autos: {
        name: 'Autos',
        color: '#ff3600',
        iconName: 'IconSteeringWheel',
    },
    propiedades: {
        name: 'Propiedades',
        color: '#3b82f6',
        iconName: 'IconBuildingSkyscraper',
    },
    agenda: {
        name: 'Agenda',
        color: '#0d9488',
        iconName: 'IconCalendar',
    },
    serenatas: {
        name: 'Serenatas',
        color: '#E11D48',
        iconName: 'IconConfettiFilled',
    },
    admin: {
        name: 'Admin',
        color: '#4f46e5',
        iconName: 'IconShieldLock',
    },
    plataforma: {
        name: 'Plataforma',
        color: '#475569',
        iconName: 'IconBuilding',
    },
};

// Dynamic icon imports map - these will be imported dynamically
const ICON_IMPORTS: Record<string, () => Promise<{ default: ComponentType<{ size?: number; style?: React.CSSProperties }> }>> = {
    IconSteeringWheel: () => import('@tabler/icons-react').then(m => ({ default: m.IconSteeringWheel })),
    IconBuildingSkyscraper: () => import('@tabler/icons-react').then(m => ({ default: m.IconBuildingSkyscraper })),
    IconCalendar: () => import('@tabler/icons-react').then(m => ({ default: m.IconCalendar })),
    IconConfettiFilled: () => import('@tabler/icons-react').then(m => ({ default: m.IconConfettiFilled })),
    IconShieldLock: () => import('@tabler/icons-react').then(m => ({ default: m.IconShieldLock })),
    IconBuilding: () => import('@tabler/icons-react').then(m => ({ default: m.IconBuilding })),
};

import { useEffect, useState } from 'react';

export function Logo({ brand = 'autos', href = '/', size = 'md', className = '' }: LogoProps) {
    const config = BRAND_CONFIG[brand];
    const [Icon, setIcon] = useState<ComponentType<{ size?: number; style?: React.CSSProperties }> | null>(null);

    useEffect(() => {
        const loadIcon = async () => {
            const iconLoader = ICON_IMPORTS[config.iconName];
            if (iconLoader) {
                const { default: LoadedIcon } = await iconLoader();
                setIcon(() => LoadedIcon);
            }
        };
        loadIcon();
    }, [config.iconName]);

    const sizes = {
        sm: { button: 'w-8 h-8', icon: 16, text: 'text-[0.95rem]' },
        md: { button: 'w-9 h-9', icon: 18, text: 'text-[1.05rem]' },
        lg: { button: 'w-10 h-10', icon: 20, text: 'text-lg' },
    };

    const s = sizes[size];

    const content = (
        <>
            <span
                className={`${s.button} rounded-[10px] border flex items-center justify-center transition-colors group-hover:opacity-80`}
                style={{ borderColor: config.color, color: config.color }}
            >
                {Icon && <Icon size={s.icon} />}
            </span>
            <span className={`inline-flex items-baseline gap-[0.08rem] ${s.text} tracking-tight`} style={{ color: 'var(--fg)' }}>
                <span className="font-semibold leading-none">Simple</span>
                <span className="font-normal leading-none" style={{ color: config.color }}>{config.name}</span>
            </span>
        </>
    );

    const baseClasses = `flex items-center gap-2 group shrink-0 ${className}`;

    if (href) {
        return (
            <Link href={href} className={baseClasses}>
                {content}
            </Link>
        );
    }

    return <div className={baseClasses}>{content}</div>;
}

export { BRAND_CONFIG };
