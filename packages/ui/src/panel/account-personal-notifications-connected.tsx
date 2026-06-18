'use client';

import { useEffect, useState } from 'react';
import {
    fetchAccountNotificationUser,
    updateAccountNotificationPrefs,
    type AccountNotificationUser,
} from '@simple/utils';
import {
    PanelAccountPersonalNotificationsSection,
    type AccountPersonalNotificationPrefs,
} from './account-personal-notifications-section.js';

function prefsFromUser(user: AccountNotificationUser): AccountPersonalNotificationPrefs {
    return {
        inAppNotificationsEnabled: user.inAppNotificationsEnabled ?? true,
        emailNotifyAccount: user.emailNotifyAccount ?? true,
    };
}

export type PanelAccountPersonalNotificationsConnectedProps = {
    appLabel: string;
};

export function PanelAccountPersonalNotificationsConnected({
    appLabel,
}: PanelAccountPersonalNotificationsConnectedProps) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<AccountNotificationUser | null>(null);
    const [form, setForm] = useState<AccountPersonalNotificationPrefs | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        void fetchAccountNotificationUser().then((loaded) => {
            if (loaded) {
                setUser(loaded);
                setForm(prefsFromUser(loaded));
            }
            setLoading(false);
        });
    }, []);

    const hasChanges = user && form ? JSON.stringify(form) !== JSON.stringify(prefsFromUser(user)) : false;

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setError('');
        setSaved(false);
        const result = await updateAccountNotificationPrefs(form);
        setSaving(false);
        if (!result.ok) {
            setError(result.error ?? 'No se pudo guardar.');
            return;
        }
        if (result.user) {
            setUser(result.user);
            setForm(prefsFromUser(result.user));
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (!form) {
        return (
            <PanelAccountPersonalNotificationsSection
                loading={loading}
                prefs={{
                    inAppNotificationsEnabled: true,
                    emailNotifyAccount: true,
                }}
                onPrefsChange={() => {}}
                onSave={() => {}}
                hasChanges={false}
                appLabel={appLabel}
            />
        );
    }

    return (
        <PanelAccountPersonalNotificationsSection
            loading={loading}
            saving={saving}
            saved={saved}
            error={error || null}
            prefs={form}
            onPrefsChange={(patch) => {
                setSaved(false);
                setForm((prev) => (prev ? { ...prev, ...patch } : prev));
            }}
            onSave={handleSave}
            hasChanges={hasChanges}
            appLabel={appLabel}
        />
    );
}
