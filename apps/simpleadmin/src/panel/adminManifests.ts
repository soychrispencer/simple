import type { PanelManifest } from '@simple/shared-types';

export const autosAdminManifest: PanelManifest = {
  vertical: 'autos',
  version: '2026.01.10',
  updatedAt: '2026-01-10',
  sidebar: [
    {
      id: 'general',
      title: 'General',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          href: '/',
          icon: 'dashboard',
          description: 'Resumen del panel',
          status: 'active',
        },
        {
          id: 'users',
          label: 'Usuarios',
          href: '/users',
          icon: 'user',
          description: 'Usuarios, planes y pagos',
          status: 'active',
        },
      ],
    },
    {
      id: 'autos',
      title: 'SimpleAutos',
      items: [
        {
          id: 'autos-home',
          label: 'Resumen',
          href: '/autos',
          icon: 'vehicles',
          description: 'Accesos y conteos del módulo',
          status: 'active',
        },
      ],
    },
    {
      id: 'catalog',
      title: 'Catálogo',
      items: [
        {
          id: 'brands',
          label: 'Marcas',
          href: '/autos/brands',
          icon: 'catalog',
          description: 'Marcas pendientes',
          status: 'active',
        },
        {
          id: 'models',
          label: 'Modelos',
          href: '/autos/models',
          icon: 'catalog',
          description: 'Modelos pendientes',
          status: 'active',
        },
      ],
    },
    {
      id: 'moderation',
      title: 'Moderación',
      items: [
        {
          id: 'reports',
          label: 'Reportes',
          href: '/autos/reports',
          icon: 'support',
          description: 'Reportes de publicaciones',
          status: 'active',
        },
      ],
    },
  ],
};

export const propertiesAdminManifest: PanelManifest = {
  vertical: 'properties',
  version: '2026.01.10',
  updatedAt: '2026-01-10',
  sidebar: [
    {
      id: 'general',
      title: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard', status: 'active' },
        { id: 'users', label: 'Usuarios', href: '/users', icon: 'user', status: 'active' },
      ],
    },
    {
      id: 'properties',
      title: 'SimplePropiedades',
      items: [
        {
          id: 'properties-home',
          label: 'Inicio',
          href: '/properties',
          icon: 'properties',
          description: 'Módulos administrativos (próximamente)',
          status: 'beta',
        },
      ],
    },
  ],
};

export const storesAdminManifest: PanelManifest = {
  vertical: 'stores',
  version: '2026.01.10',
  updatedAt: '2026-01-10',
  sidebar: [
    {
      id: 'general',
      title: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard', status: 'active' },
        { id: 'users', label: 'Usuarios', href: '/users', icon: 'user', status: 'active' },
      ],
    },
    {
      id: 'stores',
      title: 'SimpleTiendas',
      items: [
        {
          id: 'stores-home',
          label: 'Inicio',
          href: '/stores',
          icon: 'stores',
          description: 'Módulos administrativos (próximamente)',
          status: 'beta',
        },
      ],
    },
  ],
};

export const foodAdminManifest: PanelManifest = {
  vertical: 'food',
  version: '2026.01.10',
  updatedAt: '2026-01-10',
  sidebar: [
    {
      id: 'general',
      title: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard', status: 'active' },
        { id: 'users', label: 'Usuarios', href: '/users', icon: 'user', status: 'active' },
      ],
    },
    {
      id: 'food',
      title: 'SimpleFood',
      items: [
        {
          id: 'food-home',
          label: 'Inicio',
          href: '/food',
          icon: 'food',
          description: 'Módulos administrativos (próximamente)',
          status: 'beta',
        },
      ],
    },
  ],
};
