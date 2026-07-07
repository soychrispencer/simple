import { apiFetch } from './api-client.js';

export type PanelNotificationVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

export type PanelNotification = {
    id: string;
    type: 'message_thread';
    title: string;
    time: string;
    href: string;
    createdAt: number;
};

type NotificationsResponse = {
    ok: boolean;
    items?: PanelNotification[];
    error?: string;
};

export async function fetchPanelNotifications(vertical: PanelNotificationVertical): Promise<PanelNotification[]> {
    const { ok, data } = await apiFetch<NotificationsResponse>(`/api/panel/notifications?vertical=${vertical}`, {
        method: 'GET',
    });
    if (!ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}
