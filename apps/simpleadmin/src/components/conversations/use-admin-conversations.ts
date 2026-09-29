'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    captureAdminWhatsappConversation,
    fetchAdminConversations,
    updateAdminConversationStatus,
    type AdminConversationItem,
    type AdminConversationsSummary,
} from '@/lib/api';

export type ConversationStatusFilter = 'pending' | 'done' | 'all';

export function useAdminConversations(status: ConversationStatusFilter) {
    const [items, setItems] = useState<AdminConversationItem[]>([]);
    const [summary, setSummary] = useState<AdminConversationsSummary>({ pendingCount: 0, overdueCount: 0, doneCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminConversations(status);
            setItems(data.items);
            setSummary(data.summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las conversaciones.');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { void load(); }, [load]);

    const markDone = async (threadId: string) => {
        setBusyThreadId(threadId);
        setError('');
        try {
            await updateAdminConversationStatus(threadId, { status: 'done' });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la conversación.');
        } finally {
            setBusyThreadId(null);
        }
    };

    const capture = async (input: { phone: string; name?: string; message?: string; sourceVertical?: string }) => {
        await captureAdminWhatsappConversation(input);
        await load();
    };

    return { items, summary, loading, error, busyThreadId, load, markDone, capture };
}
