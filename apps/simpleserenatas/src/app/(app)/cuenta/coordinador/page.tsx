'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconUsersGroup,
  IconWallet,
  IconMapPin,
  IconCreditCard,
  IconSettings,
  IconChevronRight
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import Link from 'next/link';

const sections = [
  {
    id: 'cuadrilla',
    label: 'Mi Cuadrilla',
    description: 'Gestiona tus músicos fijos',
    icon: IconUsersGroup,
    href: '/cuenta/coordinador/cuadrilla',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    description: 'Ingresos y pagos',
    icon: IconWallet,
    href: '/cuenta/coordinador/finanzas',
  },
  {
    id: 'rutas',
    label: 'Rutas',
    description: 'Optimización de grupos',
    icon: IconMapPin,
    href: '/cuenta/coordinador/rutas',
  },
  {
    id: 'suscripcion',
    label: 'Suscripción',
    description: 'Administra tu plan',
    icon: IconCreditCard,
    href: '/suscripcion',
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    description: 'Perfil y preferencias',
    icon: IconSettings,
    href: '/cuenta',
  },
];

export default function CoordinadorCuentaPage() {
  const { coordinatorProfile } = useAuth();

  return (
    <SerenatasPageShell fullWidth>
      <SerenatasPageHeader 
        title="Panel de Coordinador"
        description="Gestiona tu operación"
      />
      
      <div className="p-4 space-y-3">
        {/* Estado de suscripción */}
        <div 
          className="p-4 rounded-xl border-l-4"
          style={{ 
            borderColor: coordinatorProfile?.subscriptionStatus === 'active' ? '#10b981' : '#f59e0b',
            background: 'var(--bg-elevated)'
          }}
        >
          <p className="text-sm text-gray-500">Estado de suscripción</p>
          <p className="font-medium capitalize">
            {coordinatorProfile?.subscriptionStatus === 'active' 
              ? 'Activa' 
              : coordinatorProfile?.subscriptionStatus === 'paused'
              ? 'Pausada'
              : 'Inactiva'}
          </p>
        </div>

        {/* Grid de secciones */}
        <div className="grid grid-cols-1 gap-3">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <div 
                className="p-3 rounded-xl"
                style={{ background: 'var(--accent-soft)' }}
              >
                <section.icon size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{section.label}</h3>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
              <IconChevronRight size={20} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </SerenatasPageShell>
  );
}
