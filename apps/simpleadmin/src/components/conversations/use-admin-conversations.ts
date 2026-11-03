'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    captureAdminConversationResponse,
    createAdminContact,
    fetchAdminConversations,
    recordAdminContactActivity,
    recordAdminOutboundMessage,
    updateAdminContact,
    updateAdminConversationStatus,
    type AdminContactActivityInput,
    type AdminContactCreateInput,
    type AdminContactProfileInput,
    type AdminConversationItem,
    type AdminConversationsSummary,
} from '@/lib/api';

export type ConversationStatusFilter = 'pending' | 'done' | 'all';

export function useAdminConversations(status: ConversationStatusFilter, vertical: string) {
    const [items, setItems] = useState<AdminConversationItem[]>([]);
    const [summary, setSummary] = useState<AdminConversationsSummary>({ pendingCount: 0, overdueCount: 0, doneCount: 0, followUpDueCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminConversations(status, vertical);
            setItems(data.items);
            setSummary(data.summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las conversaciones.');
        } finally {
            setLoading(false);
        }
    }, [status, vertical]);

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

    const capture = async (input: Parameters<typeof captureAdminConversationResponse>[0]) => {
        await captureAdminConversationResponse(input);
        await load();
    };

    const recordOutbound = async (input: Parameters<typeof recordAdminOutboundMessage>[0]) => {
        await recordAdminOutboundMessage(input);
        await load();
    };

    const createContact = async (input: AdminContactCreateInput) => {
        const result = await createAdminContact(input);
        await load();
        return result;
    };

    const updateContact = async (threadId: string, input: AdminContactProfileInput) => {
        await updateAdminContact(threadId, input);
        await load();
    };

    const logActivity = async (threadId: string, input: AdminContactActivityInput) => {
        await recordAdminContactActivity(threadId, input);
        await load();
    };

    return { items, summary, loading, error, busyThreadId, load, markDone, capture, recordOutbound, createContact, updateContact, logActivity };
}
