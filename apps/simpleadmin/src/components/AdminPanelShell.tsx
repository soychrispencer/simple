'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

import { PanelShell, PanelSidebar } from '@simple/ui';
import type { VerticalName } from '@simple/config';

import {
  autosAdminManifest,
  propertiesAdminManifest,
  storesAdminManifest,
  foodAdminManifest,
} from '@/panel/adminManifests';

const DEFAULT_VERTICAL: Exclude<VerticalName, 'admin'> = 'autos';

function resolveVerticalFromPath(pathname: string | null): Exclude<VerticalName, 'admin'> {
  const path = pathname || '';
  if (path === '/autos' || path.startsWith('/autos/')) return 'autos';
  if (path === '/properties' || path.startsWith('/properties/')) return 'properties';
  if (path === '/stores' || path.startsWith('/stores/')) return 'stores';
  if (path === '/food' || path.startsWith('/food/')) return 'food';
  return DEFAULT_VERTICAL;
}

function resolveManifest(vertical: Exclude<VerticalName, 'admin'>) {
  switch (vertical) {
    case 'autos':
      return autosAdminManifest;
    case 'properties':
      return propertiesAdminManifest;
    case 'stores':
      return storesAdminManifest;
    case 'food':
      return foodAdminManifest;
  }
}

export default function AdminPanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const vertical = resolveVerticalFromPath(pathname);
  const manifest = resolveManifest(vertical);

  return (
    <PanelShell
      initialSidebarExpanded
      sidebar={({ expanded, setExpanded }) => (
        <PanelSidebar vertical={vertical} manifest={manifest} expanded={expanded} setExpanded={setExpanded} />
      )}
      className="pt-2 simpleadmin-panel"
    >
      {children}
    </PanelShell>
  );
}
