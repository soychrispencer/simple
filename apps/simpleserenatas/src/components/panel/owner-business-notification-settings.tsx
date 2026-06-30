'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCalendarCheck, IconInbox } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import {
    PanelBlockHeader,
    PanelCard,
    PanelSwitch,
    BusinessOperationalAlertSettingRow,
    BusinessOperationalAlertsSubsection,
    BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION,
    BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION,
    BUSINESS_OPERATIONAL_ALERTS_SECTION,
} from '@simple/ui/panel';
import {
    categoryNotificationPrefsFromUser,
    getOwnerBusinessNotificationRows,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
    type CategoryNotificationPrefs,
    type NotificationCategory,
    type NotificationPrefsSnapshot,
} from '@/lib/account-notification-prefs';
import { serenatasApi, type SerenatasUser } from '@/lib/serenatas-api';
import { SolicitudesInboxAlertsSettings } from './account/solicitudes-inbox-alerts-settings';

const EMAIL_ROW_ICONS: Record<'requests' | 'agenda', TablerIcon> = {
    requests: IconInbox,
    agenda: IconCalendarCheck,
};

export type OwnerOperationalAlertsSettingsProps = {
    value?: CategoryNotificationPrefs;
    onChange?: (prefs: CategoryNotificationPrefs) => void;
    disabled?: boolean;
};

/** @deprecated Usar OwnerOperationalAlertsSettings */
export type OwnerBusinessNotificationSettingsProps = OwnerOperationalAlertsSettingsProps;

export function ownerBusinessNotificationPrefsDirty(
    user: SerenatasUser | null,
    baseline: NotificationPrefsSnapshot | null,
    categoryPrefs: CategoryNotificationPrefs,
    touched: boolean,
): boolean {
    if (!user || !baseline) return touched;
    return touched || !notificationPrefsSnapshotsEqual({ categoryPrefs }, baseline);
}

export async function saveOwnerBusinessNotificationPrefs(
    user: SerenatasUser,
    baseline: NotificationPrefsSnapshot,
    categoryPrefs: CategoryNotificationPrefs,
): Promise<{ ok: true; user: SerenatasUser } | { ok: false; error: string }> {
    const after: NotificationPrefsSnapshot = {
        categoryPrefs: {
            ...baseline.categoryPrefs,
            requests: categoryPrefs.requests,
            agenda: categoryPrefs.agenda,
        },
    };
    const response = await serenatasApi.updateUser(
        notificationPrefsToApiPayload(
            after,
            user.phone?.trim() ?? '',
            user.inAppNotificationsEnabled ?? true,
        ),
    );
    if (!response.ok || !response.user) {
        return { ok: false, error: response.error ?? 'No pudimos guardar tus preferencias.' };
    }
    return { ok: true, user: response.user };
}

export function OwnerOperationalAlertsSettings({
    value,
    onChange,
    disabled = false,
}: OwnerOperationalAlertsSettingsProps = {}) {
    const controlled = value !== undefined && onChange !== undefined;
    const [user, setUser] = useState<SerenatasUser | null>(null);
    const [internalPrefs, setInternalPrefs] = useState<CategoryNotificationPrefs>(() =>
        categoryNotificationPrefsFromUser(null),
    );
    const [loading, setLoading] = useState(!controlled);
    const savedRef = useRef<NotificationPrefsSnapshot | null>(null);
    const rows = useMemo(() => getOwnerBusinessNotificationRows(), []);
    const categoryPrefs = controlled ? value : internalPrefs;

    useEffect(() => {
        if (controlled) return;
        void serenatasApi.profiles().then((response) => {
            const loaded = response.ok ? response.user ?? null : null;
            setUser(loaded);
            const snapshot = notificationPrefsSnapshotFromUser(loaded);
            setInternalPrefs(snapshot.categoryPrefs);
            savedRef.current = snapshot;
            setLoading(false);
        });
    }, [controlled]);

    const setCategoryPrefs = (next: CategoryNotificationPrefs) => {
        if (controlled) {
            onChange(next);
            return;
        }
        setInternalPrefs(next);
    };

    if (loading) {
        return null;
    }

    return (
        <PanelCard size="lg" className="space-y-8">
            <PanelBlockHeader
                title={BUSINESS_OPERATIONAL_ALERTS_SECTION.title}
                description={BUSINESS_OPERATIONAL_ALERTS_SECTION.description}
                className="mb-0"
            />

            <BusinessOperationalAlertsSubsection
                title={BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION.title}
                description={BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION.description}
                withDivider={false}
            >
                <SolicitudesInboxAlertsSettings />
            </BusinessOperationalAlertsSubsection>

            <BusinessOperationalAlertsSubsection
                title={BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION.title}
                description={BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION.description}
            >
                {rows.map(({ key, label, hint }) => {
                    const icon = EMAIL_ROW_ICONS[key as 'requests' | 'agenda'];
                    return (
                        <BusinessOperationalAlertSettingRow
                            key={key}
                            icon={icon}
                            title={label}
                            description={hint ?? ''}
                            action={
                                <PanelSwitch
                                    checked={categoryPrefs[key as NotificationCategory].email}
                                    onChange={(email) => {
                                        setCategoryPrefs({
                                            ...categoryPrefs,
                                            [key]: { email },
                                        });
                                    }}
                                    size="sm"
                                    ariaLabel={`${label} por correo`}
                                    disabled={disabled}
                                />
                            }
                        />
                    );
                })}
            </BusinessOperationalAlertsSubsection>
        </PanelCard>
    );
}

/** @deprecated Usar OwnerOperationalAlertsSettings */
export const OwnerBusinessNotificationSettings = OwnerOperationalAlertsSettings;

export function useOwnerBusinessNotificationPrefs() {
    const [user, setUser] = useState<SerenatasUser | null>(null);
    const [categoryPrefs, setCategoryPrefs] = useState<CategoryNotificationPrefs>(() =>
        categoryNotificationPrefsFromUser(null),
    );
    const [loading, setLoading] = useState(true);
    const [touched, setTouched] = useState(false);
    const baselineRef = useRef<NotificationPrefsSnapshot | null>(null);

    useEffect(() => {
        void serenatasApi.profiles().then((response) => {
            const loaded = response.ok ? response.user ?? null : null;
            setUser(loaded);
            const snapshot = notificationPrefsSnapshotFromUser(loaded);
            setCategoryPrefs(snapshot.categoryPrefs);
            baselineRef.current = snapshot;
            setLoading(false);
        });
    }, []);

    const dirty = ownerBusinessNotificationPrefsDirty(user, baselineRef.current, categoryPrefs, touched);

    const updateCategoryPrefs = (next: CategoryNotificationPrefs) => {
        setTouched(true);
        setCategoryPrefs(next);
    };

    const save = async (): Promise<string | null> => {
        if (!user || !baselineRef.current || !dirty) return null;
        const result = await saveOwnerBusinessNotificationPrefs(user, baselineRef.current, categoryPrefs);
        if (!result.ok) return result.error;
        setUser(result.user);
        const snapshot = notificationPrefsSnapshotFromUser(result.user);
        setCategoryPrefs(snapshot.categoryPrefs);
        baselineRef.current = snapshot;
        setTouched(false);
        return null;
    };

    return {
        user,
        categoryPrefs,
        loading,
        dirty,
        updateCategoryPrefs,
        save,
    };
}
