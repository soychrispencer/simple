"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ssoUtils } from './client';
import { Button } from '@simple/ui';

interface Vertical {
  id: string;
  name: string;
  domain: string;
  description: string;
  icon?: string;
}

const AVAILABLE_VERTICALS: Vertical[] = [
  {
    id: 'autos',
    name: 'Simple Autos',
    domain: process.env.NEXT_PUBLIC_AUTOS_DOMAIN || 'http://localhost:3001',
    description: 'Compra y venta de vehículos'
  },
  {
    id: 'propiedades',
    name: 'Simple Propiedades',
    domain: process.env.NEXT_PUBLIC_PROPIEDADES_DOMAIN || 'http://localhost:3002',
    description: 'Inmuebles en venta y alquiler'
  },
  {
    id: 'tiendas',
    name: 'Simple Tiendas',
    domain: process.env.NEXT_PUBLIC_TIENDAS_DOMAIN || 'http://localhost:3003',
    description: 'Retail y servicios omnicanal'
  },
  {
    id: 'food',
    name: 'Simple Food',
    domain: process.env.NEXT_PUBLIC_FOOD_DOMAIN || 'http://localhost:3004',
    description: 'Delivery inteligente para restaurantes'
  },
  {
    id: 'crm',
    name: 'Simple CRM',
    domain: process.env.NEXT_PUBLIC_CRM_DOMAIN || 'http://localhost:3000',
    description: 'Gestión de clientes y ventas'
  }
];

export function VerticalSwitcher() {
  const { user } = useAuth();
  const [availableVerticals, setAvailableVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const loadAvailableVerticals = async () => {
      try {
        const verticals = await ssoUtils.getAvailableVerticals(userId);
        const filtered = AVAILABLE_VERTICALS.filter((v) =>
          verticals.some((av: any) => av.vertical === v.id)
        );
        setAvailableVerticals(filtered);
      } catch (error) {
        console.error('Error loading verticals:', error);
        // Fallback: mostrar todas las verticales
        setAvailableVerticals(AVAILABLE_VERTICALS);
      }
    };

    loadAvailableVerticals();
  }, [user?.id]);

  const switchToVertical = async (vertical: Vertical) => {
    if (!user) return;

    setLoading(true);
    try {
      // Generar token de SSO para el dominio destino
      const token = await ssoUtils.generateCrossDomainToken(user.id, vertical.domain);

      // Redirigir con token de SSO
      const ssoUrl = new URL('/auth/sso', vertical.domain);
      ssoUrl.searchParams.set('token', token);
      ssoUrl.searchParams.set('from', window.location.hostname);

      window.open(ssoUrl.toString(), '_blank');
    } catch (error) {
      console.error('Error switching vertical:', error);
      // Fallback: redirigir directamente
      window.open(vertical.domain, '_blank');
    } finally {
      setLoading(false);
    }
  };

  if (!user || availableVerticals.length === 0) {
    return null;
  }

  const currentVertical = window.location.hostname.includes('autos') ? 'autos' :
                         window.location.hostname.includes('propiedades') ? 'propiedades' :
                         window.location.hostname.includes('tiendas') ? 'tiendas' :
                         window.location.hostname.includes('food') ? 'food' :
                         window.location.hostname.includes('crm') ? 'crm' : null;

  const otherVerticals = availableVerticals.filter(v => v.id !== currentVertical);

  if (otherVerticals.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border/60 pt-4 mt-4">
      <h3 className="text-sm font-medium text-lighttext dark:text-darktext mb-3">
        Acceder a otras plataformas
      </h3>
      <div className="space-y-2">
        {otherVerticals.map((vertical) => (
          <Button
            key={vertical.id}
            variant="outline"
            size="sm"
            onClick={() => switchToVertical(vertical)}
            disabled={loading}
            className="w-full justify-start text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-primary-a10)] rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {vertical.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-lighttext dark:text-darktext truncate">
                  {vertical.name}
                </div>
                <div className="text-xs text-lighttext/70 dark:text-darktext/70 truncate">
                  {vertical.description}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
