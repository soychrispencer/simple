'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    fetchMessageThreadByContext,
    type MessageContextType,
    type MessageVertical,
} from '@simple/utils';
import { PanelButtonLink } from './panel-button-link.js';

type Props = {
    vertical: MessageVertical;
    contextType: MessageContextType;
    contextId: string;
    className?: string;
    openLabel?: string;
    startLabel?: string;
};

export function ContextMessagesLink({
    vertical,
    contextType,
    contextId,
    className,
    openLabel = 'Ver mensajes',
    startLabel = 'Enviar mensaje',
}: Props) {
    const [threadId, setThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        void fetchMessageThreadByContext(vertical, contextType, contextId).then((thread) => {
            if (!active) return;
            setThreadId(thread?.id ?? null);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [vertical, contextType, contextId]);

    if (loading) {
        return (
            <span className={className} style={{ color: 'var(--fg-muted)' }}>
                Cargando mensajes...
            </span>
        );
    }

    const href = threadId
        ? `/panel/mensajes?thread=${encodeURIComponent(threadId)}`
        : `/panel/mensajes?contextType=${encodeURIComponent(contextType)}&contextId=${encodeURIComponent(contextId)}`;

    return (
        <PanelButtonLink href={href} variant="secondary" className={className}>
            {threadId ? openLabel : startLabel}
        </PanelButtonLink>
    );
}

export function ContextMessagesInlineLink({
    vertical,
    contextType,
    contextId,
    className,
    openLabel = 'Ver mensajes',
    startLabel = 'Enviar mensaje',
}: Props) {
    const [threadId, setThreadId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void fetchMessageThreadByContext(vertical, contextType, contextId).then((thread) => {
            if (!active) return;
            setThreadId(thread?.id ?? null);
        });
        return () => {
            active = false;
        };
    }, [vertical, contextType, contextId]);

    const href = threadId
        ? `/panel/mensajes?thread=${encodeURIComponent(threadId)}`
        : `/panel/mensajes?contextType=${encodeURIComponent(contextType)}&contextId=${encodeURIComponent(contextId)}`;

    return (
        <Link href={href} className={className} style={{ color: 'var(--accent)' }}>
            {threadId ? openLabel : startLabel}
        </Link>
    );
}
