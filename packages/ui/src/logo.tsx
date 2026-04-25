import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import {
  IconSteeringWheel,
  IconBuildingSkyscraper,
  IconCalendar,
  IconConfetti,
  IconShieldLock,
  IconBuilding,
} from '@tabler/icons-react';

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
    icon: IconSteeringWheel,
  },
  propiedades: {
    name: 'Propiedades',
    color: '#3b82f6',
    icon: IconBuildingSkyscraper,
  },
  agenda: {
    name: 'Agenda',
    color: '#0d9488',
    icon: IconCalendar,
  },
  serenatas: {
    name: 'Serenatas',
    color: '#E11D48',
    icon: IconConfetti,
  },
  admin: {
    name: 'Admin',
    color: '#4f46e5',
    icon: IconShieldLock,
  },
  plataforma: {
    name: 'Plataforma',
    color: '#475569',
    icon: IconBuilding,
  },
};

export function Logo({ brand = 'autos', href = '/', size = 'md', className = '' }: LogoProps) {
  const config = BRAND_CONFIG[brand];
  const Icon = config.icon;

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
        <Icon size={s.icon} />
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
