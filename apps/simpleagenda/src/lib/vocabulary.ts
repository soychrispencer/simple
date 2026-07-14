import {
    resolveAgendaClientNoun,
    type AgendaClientNoun,
} from '@simple/utils';

export type AgendaVocab = {
    noun: AgendaClientNoun;
    client: string;
    clients: string;
    Client: string;
    Clients: string;
    newClient: string;
    noClients: string;
    addFirstClient: string;
    searchPlaceholder: string;
    exportFilename: string;
};

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildAgendaVocab(noun: AgendaClientNoun = 'cliente'): AgendaVocab {
    const client = noun;
    const clients = `${noun}s`;
    const Client = capitalize(client);
    const Clients = capitalize(clients);
    return {
        noun,
        client,
        clients,
        Client,
        Clients,
        newClient: `Nuevo ${client}`,
        noClients: `Aún no tienes ${clients}`,
        addFirstClient: `Agrega tu primer ${client} para comenzar.`,
        searchPlaceholder: 'Buscar por nombre, correo o teléfono...',
        exportFilename: `${clients}.csv`,
    };
}

export function buildAgendaVocabFromSubtype(operatorSubtype?: string | null): AgendaVocab {
    return buildAgendaVocab(resolveAgendaClientNoun(operatorSubtype));
}

/** Fallback estático (default cliente). Preferir `useAgendaVocab()` en el panel. */
export const vocab = buildAgendaVocab('cliente');
