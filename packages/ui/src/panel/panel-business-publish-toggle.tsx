'use client';

import { IconAlertCircle, IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
import { PanelSwitch } from './panel-primitives.js';

export type PanelBusinessPublishStatus = 'public' | 'paused' | 'incomplete' | 'draft' | 'locked';

const DEFAULT_STATUS_LABELS: Record<PanelBusinessPublishStatus, string> = {
    public: 'Público',
    paused: 'Pausado',
    incomplete: 'Incompleto',
    draft: 'Sin perfil',
    locked: 'Sin plan',
};

export type PanelBusinessPublishToggleProps = {
    checked: boolean;
    disabled?: boolean;
    loading?: boolean;
    status: PanelBusinessPublishStatus;
    statusLabel?: string;
    onChange: (next: boolean) => void;
    error?: string | null;
    switchAriaLabel?: string;
};

export function PanelBusinessPublishToggle({
    checked,
    disabled = false,
    loading = false,
    status,
    statusLabel,
    onChange,
    error,
    switchAriaLabel,
}: PanelBusinessPublishToggleProps) {
    const label = statusLabel ?? DEFAULT_STATUS_LABELS[status];
    const isWarning = status === 'incomplete' || status === 'draft' || status === 'locked';

    return (
        <div className="grid shrink-0 gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5">
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs"
                    style={{
                        background: checked
                            ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                            : isWarning
                              ? 'color-mix(in oklab, #f59e0b 10%, var(--surface))'
                              : 'var(--bg-subtle)',
                        color: checked ? 'var(--accent)' : isWarning ? '#92400e' : 'var(--fg-muted)',
                    }}
                >
                    {checked ? (
                        <IconEye size={12} />
                    ) : isWarning ? (
                        <IconAlertCircle size={12} />
                    ) : (
                        <IconEyeOff size={12} />
                    )}
                    {label}
                </span>

                {loading ? (
                    <IconLoader2 size={20} className="animate-spin text-fg-muted" aria-hidden />
                ) : (
                    <PanelSwitch
                        checked={checked}
                        onChange={onChange}
                        disabled={disabled}
                        ariaLabel={switchAriaLabel ?? (checked ? 'Pausar perfil público' : 'Mostrar perfil público')}
                        size="sm"
                    />
                )}
                <span className="text-xs font-medium text-fg sm:text-sm">Mostrar perfil público</span>
            </div>
            {error ? <p className="max-w-xs text-right text-xs text-rose-500 sm:text-sm">{error}</p> : null}
        </div>
    );
}
