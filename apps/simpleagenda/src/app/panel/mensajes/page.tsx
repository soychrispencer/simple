'use client';

import { PanelMessagesInbox } from '@simple/ui/panel';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

export default function MensajesPage() {
    const vocab = useAgendaVocab();
    return (
        <PanelMessagesInbox
            vertical="agenda"
            copy={{
                description: `Conversaciones con ${vocab.clients} y consultas de tu agenda`,
                emptyInbox: `Cuando un ${vocab.client} te escriba desde tu perfil o una reserva aparecerá aquí.`,
            }}
        />
    );
}
