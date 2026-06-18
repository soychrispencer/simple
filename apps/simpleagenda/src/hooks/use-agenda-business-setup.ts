'use client';

import { usePanelBusinessSetup } from '@simple/ui/panel';
import { fetchAgendaBusinessSetupStatus } from '@/lib/business-setup';

export function useAgendaBusinessSetup() {
    return usePanelBusinessSetup(fetchAgendaBusinessSetupStatus);
}
