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
import { fetchAccountWorkspace, fetchCurrentAccountContext, resolveAgendaOperatorFields } from '@simple/utils';
import { fetchAgendaProfile } from '@/lib/agenda-api';
import {
    buildAgendaVocab,
    buildAgendaVocabFromSubtype,
    type AgendaVocab,
} from '@/lib/vocabulary';

const AgendaVocabContext = createContext<AgendaVocab>(buildAgendaVocab('cliente'));
const AgendaTeamWorkspaceContext = createContext<boolean>(false);

export function AgendaVocabProvider({ children }: { children: ReactNode }) {
    const [vocab, setVocab] = useState<AgendaVocab>(() => buildAgendaVocab('cliente'));
    const [isTeamWorkspace, setIsTeamWorkspace] = useState(false);

    const refresh = useCallback(async () => {
        const [profile, workspaceState, accountContext] = await Promise.all([
            fetchAgendaProfile(),
            fetchAccountWorkspace('agenda'),
            fetchCurrentAccountContext(),
        ]);
        const workspace = workspaceState?.workspace;
        const isBusinessAccount = accountContext?.account?.isPersonal === false;
        setIsTeamWorkspace(Boolean(isBusinessAccount || workspace?.accountKind === 'company' || profile?.accountKind === 'company'));
        if (!profile && !workspace) return;
        const operator = resolveAgendaOperatorFields({
            accountKind: workspace?.accountKind ?? (isBusinessAccount ? 'company' : profile?.accountKind),
            operatorSubtype: isBusinessAccount
                ? workspace?.accountKind === 'company' ? workspace.operatorSubtype : null
                : workspace?.operatorSubtype ?? profile?.operatorSubtype,
            profession: isBusinessAccount
                ? workspace?.accountKind === 'company' ? workspace.operatorSubtypeCustom : null
                : workspace?.operatorSubtypeCustom ?? profile?.profession,
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
        <AgendaTeamWorkspaceContext.Provider value={isTeamWorkspace}>
            <AgendaVocabContext.Provider value={value}>
                {children}
            </AgendaVocabContext.Provider>
        </AgendaTeamWorkspaceContext.Provider>
    );
}

export function useAgendaVocab(): AgendaVocab {
    return useContext(AgendaVocabContext);
}

export function useAgendaIsTeamWorkspace(): boolean {
    return useContext(AgendaTeamWorkspaceContext);
}
