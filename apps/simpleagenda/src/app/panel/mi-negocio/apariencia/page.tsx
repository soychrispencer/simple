'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import {
    AGENDA_BUSINESS_APARIENCIA_PAGE,
    OperatorSiteAppearanceEditor,
    type OperatorSiteAppearanceValue,
    agendaBusinessSubsectionShellProps,
} from '@simple/ui/panel';
import {
    DEFAULT_OPERATOR_SITE_COLOR_MODE,
    DEFAULT_OPERATOR_SITE_LAYOUT,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
} from '@simple/utils';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { fetchAgendaProfile, saveAgendaProfile } from '@/lib/agenda-api';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

export default function AparienciaPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [value, setValue] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
    });
    const [slug, setSlug] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        void (async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                setValue({
                    layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
                    colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
                });
                setSlug(profile.slug ?? null);
            }
            setLoading(false);
        })();
    }, []);

    const persistAppearance = useCallback(async (next: OperatorSiteAppearanceValue) => {
        setSaving(true);
        setSaveError('');
        try {
            const result = await saveAgendaProfile({
                operatorSiteLayout: next.layout,
                operatorSiteColorMode: next.colorMode,
            });
            if (!result.ok) {
                const message = result.error ?? 'No se pudo guardar la apariencia.';
                setSaveError(message);
                throw new Error(message);
            }
            if (result.profile) {
                setValue({
                    layout: normalizeOperatorSiteLayout(result.profile.operatorSiteLayout),
                    colorMode: normalizeOperatorSiteColorMode(result.profile.operatorSiteColorMode),
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo guardar la apariencia.';
            setSaveError(message);
            throw err;
        } finally {
            setSaving(false);
        }
    }, []);

    const handleChange = (next: OperatorSiteAppearanceValue) => {
        setValue(next);
        void persistAppearance(next);
    };

    const handleSave = async () => {
        await persistAppearance(value);
    };

    return (
        <AgendaMiNegocioShell
            {...agendaBusinessSubsectionShellProps('apariencia')}
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_APARIENCIA_PAGE.title}
            description={AGENDA_BUSINESS_APARIENCIA_PAGE.description}
        >
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : (
                <OperatorSiteAppearanceEditor
                    value={value}
                    publicPreviewUrl={slug ? `${APP_URL}/${slug}` : null}
                    saving={saving}
                    saveError={saveError}
                    onChange={handleChange}
                    onSave={handleSave}
                />
            )}
        </AgendaMiNegocioShell>
    );
}
