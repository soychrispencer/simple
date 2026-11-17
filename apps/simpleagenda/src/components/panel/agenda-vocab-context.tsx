'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { fetchAccountWorkspace, resolveAgendaOperatorFields } from '@simple/utils';
import { fetchAgendaProfile } from '@/lib/agenda-api';
import {
    buildAgendaVocab,
    buildAgendaVocabFromSubtype,
    type AgendaVocab,
} from '@/lib/vocabulary';

const AgendaVocabContext = createContext<AgendaVocab>(buildAgendaVocab('cliente'));

export function AgendaVocabProvider({ children }: { children: ReactNode }) {
    const [vocab, setVocab] = useState<AgendaVocab>(() => buildAgendaVocab('cliente'));

    const refresh = useCallback(async () => {
        const [profile, workspaceState] = await Promise.all([
            fetchAgendaProfile(),
            fetchAccountWorkspace('agenda'),
        ]);
        const workspace = workspaceState?.workspace;
        if (!profile && !workspace) return;
        const operator = resolveAgendaOperatorFields({
            accountKind: workspace?.accountKind ?? profile?.accountKind,
            operatorSubtype: workspace?.operatorSubtype ?? profile?.operatorSubtype,
            profession: workspace?.operatorSubtypeCustom ?? profile?.profession,
        });
        setVocab(buildAgendaVocabFromSubtype(operator.operatorSubtype));
    }, []);

    useEffect(() => {
        void refresh();
        const onChange = () => {
            void refresh();
        };
        window.addEventListener('simple:agenda-profile-changed', onChange);
        window.addEventListener('simple:workspace-activity-changed', onChange);
        return () => {
            window.removeEventListener('simple:agenda-profile-changed', onChange);
            window.removeEventListener('simple:workspace-activity-changed', onChange);
        };
    }, [refresh]);

    const value = useMemo(() => vocab, [vocab]);

    return (
        <AgendaVocabContext.Provider value={value}>
            {children}
        </AgendaVocabContext.Provider>
    );
}

export function useAgendaVocab(): AgendaVocab {
    return useContext(AgendaVocabContext);
}
