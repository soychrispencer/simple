'use client';

import { usePanelBusinessSetup } from '@simple/ui/panel';
import { fetchAutosBusinessSetupStatus } from '@/lib/business-setup';

export function useAutosBusinessSetup() {
    return usePanelBusinessSetup(fetchAutosBusinessSetupStatus);
}
