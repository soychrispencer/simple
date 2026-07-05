'use client';

import { IconAlertCircle, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { businessProfileSaveSuccessMessage, type BusinessProfileSaveSection } from './business-copy.js';
import { PanelButton } from './panel-button.js';

export type PanelSectionSaveFooterProps = {
    saving?: boolean;
    saved?: boolean;
    saveError?: string | null;
    disabled?: boolean;
    onSave: () => void | Promise<void>;
    saveLabel?: string;
    savedMessage?: string;
    savingLabel?: string;
};

/** Barra sticky unificada para guardar secciones del panel (Mi negocio, configuraciones, etc.). */
export function PanelSectionSaveFooter({
    saving = false,
    saved = false,
    saveError = null,
    disabled = false,
    onSave,
    saveLabel = 'Guardar cambios',
    savedMessage = businessProfileSaveSuccessMessage(),
    savingLabel = 'Guardando…',
}: PanelSectionSaveFooterProps) {
    return (
        <div className="panel-section-save-footer sticky z-10 flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-3 shadow-sm sm:flex-row sm:items-center sm:justify-end lg:bottom-3">
            {saveError ? (
                <p className="flex items-center gap-1.5 text-sm text-(--color-error,#dc2626) sm:mr-auto">
                    <IconAlertCircle size={14} className="shrink-0" />
                    {saveError}
                </p>
            ) : null}
            {!saveError && saved ? (
                <p className="flex items-center gap-1.5 text-sm text-accent sm:mr-auto">
                    <IconCheck size={14} />
                    {savedMessage}
                </p>
            ) : null}
            <PanelButton
                variant="accent"
                onClick={() => void onSave()}
                disabled={disabled || saving}
            >
                {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                {saving ? savingLabel : saveLabel}
            </PanelButton>
        </div>
    );
}

export type BusinessConfiguracionesSaveFooterProps = PanelSectionSaveFooterProps;

/** @deprecated Usar PanelSectionSaveFooter */
export function BusinessConfiguracionesSaveFooter(props: BusinessConfiguracionesSaveFooterProps) {
    return <PanelSectionSaveFooter {...props} />;
}

export function panelSectionSaveLabel(section?: BusinessProfileSaveSection): string {
    return section === 'horarios' ? 'Guardar horario' : 'Guardar cambios';
}
