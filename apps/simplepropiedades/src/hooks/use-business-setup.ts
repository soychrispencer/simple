'use client';

import { usePanelBusinessSetup } from '@simple/ui/panel';
import { fetchPropiedadesBusinessSetupStatus } from '@/lib/business-setup';

export function usePropiedadesBusinessSetup() {
    return usePanelBusinessSetup(fetchPropiedadesBusinessSetupStatus);
}
