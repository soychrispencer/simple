import {
    fetchPanelNotifications as fetchPanelNotificationsForVertical,
    type PanelNotification,
} from '@simple/utils';

export type { PanelNotification };

export function fetchPanelNotifications(): Promise<PanelNotification[]> {
    return fetchPanelNotificationsForVertical('autos');
}
