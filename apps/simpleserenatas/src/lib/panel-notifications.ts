import {
    fetchPanelNotifications as fetchMessagePanelNotifications,
    type PanelNotification,
} from '@simple/utils';

export function fetchPanelNotifications(): Promise<PanelNotification[]> {
    return fetchMessagePanelNotifications('serenatas');
}
