'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconMail } from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard } from '@simple/ui/panel';
import {
    categoryNotificationPrefsFromUser,
    getOwnerBusinessNotificationRows,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
    type CategoryNotificationPrefs,
    type NotificationPrefsSnapshot,
} from '@/lib/account-notification-prefs';
import { serenatasApi, type SerenatasUser } from '@/lib/serenatas-api';
import { NotificationCategoryRow, NotificationPrefsSkeleton } from './account/notification-category-row';
import { FormFeedback, type FormStatus } from './shared';

export function OwnerBusinessNotificationSettings() {
    const [user, setUser] = useState<SerenatasUser | null>(null);
    const [categoryPrefs, setCategoryPrefs] = useState<CategoryNotificationPrefs>(() =>
        categoryNotificationPrefsFromUser(null),
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const savedRef = useRef<NotificationPrefsSnapshot | null>(null);
    const rows = useMemo(() => getOwnerBusinessNotificationRows(), []);

    useEffect(() => {
        void serenatasApi.profiles().then((response) => {
            const loaded = response.ok ? response.user ?? null : null;
            setUser(loaded);
            const snapshot = notificationPrefsSnapshotFromUser(loaded);
            setCategoryPrefs(snapshot.categoryPrefs);
            savedRef.current = snapshot;
            setLoading(false);
        });
    }, []);

    const dirty = useMemo(() => {
        if (!user || !savedRef.current) return touched;
        const current: NotificationPrefsSnapshot = { categoryPrefs };
        return touched || !notificationPrefsSnapshotsEqual(current, savedRef.current);
    }, [user, touched, categoryPrefs]);

    const handleSave = async () => {
        if (!user || !savedRef.current) return;
        const after: NotificationPrefsSnapshot = {
            categoryPrefs: {
                ...savedRef.current.categoryPrefs,
                requests: categoryPrefs.requests,
                agenda: categoryPrefs.agenda,
            },
        };
        setSaving(true);
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateUser(
            notificationPrefsToApiPayload(
                after,
                user.phone?.trim() ?? '',
                user.inAppNotificationsEnabled ?? true,
            ),
        );
        setSaving(false);
        if (!response.ok) {
            setStatus({
                loading: false,
                error: response.error ?? 'No pudimos guardar tus preferencias.',
                ok: null,
            });
            return;
        }
        if (response.user) {
            setUser(response.user);
            const snapshot = notificationPrefsSnapshotFromUser(response.user);
            setCategoryPrefs(snapshot.categoryPrefs);
            savedRef.current = snapshot;
        }
        setTouched(false);
        setStatus({ loading: false, error: null, ok: 'Preferencias de negocio guardadas.' });
    };

    if (loading) {
        return <NotificationPrefsSkeleton rows={rows.length} />;
    }

    return (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title="Comunicación con clientes"
                description="Correo cuando llegan solicitudes o debes cerrar serenatas realizadas."
            />
            <div className="mb-1 flex items-center gap-2 text-xs text-fg-muted">
                <IconMail size={14} className="text-accent" />
                Canal disponible: correo electrónico.
            </div>
            <div className="divide-y divide-(--border) rounded-xl border border-(--border) bg-(--bg-subtle)/30 px-2 sm:px-3">
                {rows.map(({ key, label, hint }) => (
                    <NotificationCategoryRow
                        key={key}
                        title={label}
                        hint={hint}
                        emailChecked={categoryPrefs[key].email}
                        disabled={saving}
                        onEmailChange={(email) => {
                            setTouched(true);
                            setCategoryPrefs((p) => ({ ...p, [key]: { email } }));
                        }}
                    />
                ))}
            </div>
            <FormFeedback status={status} />
            <div>
                <PanelButton
                    type="button"
                    variant="secondary"
                    disabled={saving || !dirty}
                    onClick={() => void handleSave()}
                >
                    {saving ? 'Guardando…' : 'Guardar comunicación'}
                </PanelButton>
            </div>
        </PanelCard>
    );
}
