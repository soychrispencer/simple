'use client';

import { createContext, useContext } from 'react';

export const AgendaLaunchModeContext = createContext(false);

export function useAgendaLaunchMode() {
    return useContext(AgendaLaunchModeContext);
}
