import { API_BASE } from '@simple/config';

export type PanelNotification = {
    id: string;
    type: 'service_lead' | 'listing_lead' | 'message_thread';
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

export async function fetchPanelNotifications(): Promise<PanelNotification[]> {
    try {
        const response = await fetch(`${API_BASE}/api/panel/notifications?vertical=autos`, {
            method: 'GET',
            credentials: 'include',
        });
        const data = (await response.json().catch(() => null)) as NotificationsResponse | null;
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
        return data.items;
    } catch {
        return [];
    }
}
