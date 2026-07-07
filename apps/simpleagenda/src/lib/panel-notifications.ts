import {
    fetchPanelNotifications as fetchPanelNotificationsForVertical,
    type PanelNotification,
} from '@simple/utils';

export function fetchPanelNotifications(): Promise<PanelNotification[]> {
    return fetchPanelNotificationsForVertical('agenda');
}
