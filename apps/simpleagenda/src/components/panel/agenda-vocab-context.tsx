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
import { resolveAgendaOperatorFields } from '@simple/utils';
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
        const profile = await fetchAgendaProfile();
        if (!profile) return;
        const operator = resolveAgendaOperatorFields({
            accountKind: profile.accountKind,
            operatorSubtype: profile.operatorSubtype,
            profession: profile.profession,
        });
        setVocab(buildAgendaVocabFromSubtype(operator.operatorSubtype));
    }, []);

    useEffect(() => {
        void refresh();
        const onChange = () => {
            void refresh();
        };
        window.addEventListener('simple:agenda-profile-changed', onChange);
        return () => window.removeEventListener('simple:agenda-profile-changed', onChange);
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
