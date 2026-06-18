'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    PanelAccountPersonalNotificationsSection,
    type AccountPersonalNotificationPrefs,
} from '@simple/ui/panel';
import type { AppMode } from '@/lib/app-mode';
import {
    categoryNotificationPrefsFromUser,
    getNotificationCategoryRowsForContext,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
    type CategoryNotificationPrefs,
    type NotificationPrefsSnapshot,
} from '@/lib/account-notification-prefs';
import { serenatasApi, type Profiles, type SerenatasUser } from '@/lib/serenatas-api';
import { NotificationCategoryRow, NotificationPrefsSkeleton } from './account/notification-category-row';
import { PanelCard } from '@simple/ui/panel';

function personalPrefsFromUser(user: SerenatasUser | null): AccountPersonalNotificationPrefs {
    return {
        inAppNotificationsEnabled: user?.inAppNotificationsEnabled ?? true,
        emailNotifyAccount: user?.emailNotifyAccount ?? true,
    };
}

export function SerenatasPersonalNotificationsSection({
    accountUser,
    appMode,
    profiles,
    phone,
    onSaved,
    onDirtyChange,
}: {
    accountUser: SerenatasUser | null;
    appMode: AppMode;
    profiles: Profiles;
    phone: string;
    onSaved: () => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
}) {
    const [personalPrefs, setPersonalPrefs] = useState<AccountPersonalNotificationPrefs>(() =>
        personalPrefsFromUser(accountUser),
    );
    const [categoryPrefs, setCategoryPrefs] = useState<CategoryNotificationPrefs>(() =>
        categoryNotificationPrefsFromUser(accountUser),
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);
    const savedRef = useRef<{ personal: AccountPersonalNotificationPrefs; snapshot: NotificationPrefsSnapshot } | null>(null);

    const categoryRows = useMemo(
        () => getNotificationCategoryRowsForContext(appMode, profiles),
        [appMode, profiles],
    );

    useEffect(() => {
        if (touched) return;
        const snapshot = notificationPrefsSnapshotFromUser(accountUser);
        setPersonalPrefs(personalPrefsFromUser(accountUser));
        setCategoryPrefs(snapshot.categoryPrefs);
        savedRef.current = {
            personal: personalPrefsFromUser(accountUser),
            snapshot,
        };
    }, [accountUser, appMode, profiles, touched]);

    const hasChanges = useMemo(() => {
        if (!accountUser || !savedRef.current) return touched;
        const currentSnapshot: NotificationPrefsSnapshot = { categoryPrefs };
        const personalChanged =
            JSON.stringify(personalPrefs) !== JSON.stringify(savedRef.current.personal);
        return (
            touched
            || personalChanged
            || !notificationPrefsSnapshotsEqual(currentSnapshot, savedRef.current.snapshot)
        );
    }, [accountUser, touched, personalPrefs, categoryPrefs]);

    useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const handleSave = async () => {
        if (!accountUser) return;
        const merged: CategoryNotificationPrefs = {
            ...categoryNotificationPrefsFromUser(accountUser),
            ...Object.fromEntries(categoryRows.map((row) => [row.key, categoryPrefs[row.key]])),
        } as CategoryNotificationPrefs;
        const after: NotificationPrefsSnapshot = { categoryPrefs: merged };
        setSaving(true);
        setError(null);
        setSaved(false);
        const response = await serenatasApi.updateUser(
            notificationPrefsToApiPayload(
                after,
                phone.trim() || accountUser.phone?.trim() || '',
                personalPrefs.inAppNotificationsEnabled,
            ),
        );
        setSaving(false);
        if (!response.ok) {
            setError(response.error ?? 'No pudimos guardar tus preferencias.');
            return;
        }
        setTouched(false);
        savedRef.current = {
            personal: personalPrefs,
            snapshot: after,
        };
        await onSaved();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const categoryBlock = categoryRows.length > 0 ? (
        <PanelCard size="md">
            <p className="mb-2 text-sm font-semibold text-fg">Actividad personal</p>
            <div className="divide-y divide-(--border) rounded-xl border border-(--border) bg-(--bg-subtle)/30 px-2 sm:px-3">
                {categoryRows.map(({ key, label, hint }) => (
                    <NotificationCategoryRow
                        key={key}
                        title={label}
                        hint={hint}
                        emailChecked={categoryPrefs[key].email}
                        disabled={saving || !accountUser}
                        onEmailChange={(email) => {
                            setTouched(true);
                            setCategoryPrefs((p) => ({ ...p, [key]: { email } }));
                        }}
                    />
                ))}
            </div>
        </PanelCard>
    ) : null;

    if (!accountUser) {
        return <NotificationPrefsSkeleton rows={Math.max(categoryRows.length, 2)} />;
    }

    return (
        <PanelAccountPersonalNotificationsSection
            saving={saving}
            saved={saved}
            error={error}
            prefs={personalPrefs}
            onPrefsChange={(patch) => {
                setTouched(true);
                setSaved(false);
                setPersonalPrefs((prev) => ({ ...prev, ...patch }));
            }}
            onSave={handleSave}
            hasChanges={hasChanges}
            personalDataHref="/panel/mi-cuenta?account_tab=data"
            appLabel="SimpleSerenatas"
        >
            {categoryBlock}
        </PanelAccountPersonalNotificationsSection>
    );
}
