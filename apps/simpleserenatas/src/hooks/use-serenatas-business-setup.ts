'use client';

import { usePanelBusinessSetup } from '@simple/ui/panel';
import { fetchSerenatasBusinessSetupStatus } from '@/lib/business-setup';

export function useSerenatasBusinessSetup(enabled = true) {
    return usePanelBusinessSetup(fetchSerenatasBusinessSetupStatus, enabled);
}
