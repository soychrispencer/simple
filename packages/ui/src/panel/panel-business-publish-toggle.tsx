'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconAlertCircle, IconChevronDown, IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
import {
    FLOATING_POPOVER_Z_INDEX,
    FLOATING_VIEWPORT_PAD_PX,
    useFloatingPortalDismiss,
    useFloatingPortalPosition,
} from '../floating-portal.js';
import { PanelSwitch } from './panel-primitives.js';
import {
    PanelBusinessPublishRequirementsList,
    type PanelBusinessPublishRequirement,
} from './panel-business-publish-requirements.js';

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
    requirements?: PanelBusinessPublishRequirement[];
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
    requirements,
}: PanelBusinessPublishToggleProps) {
    const label = statusLabel ?? DEFAULT_STATUS_LABELS[status];
    const isWarning = status === 'incomplete' || status === 'draft' || status === 'locked';
    const pendingCount = requirements?.filter((item) => !item.met).length ?? 0;
    const showRequirementsMenu = !checked && pendingCount > 0;

    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const position = useFloatingPortalPosition(
        menuOpen,
        triggerRef,
        popoverRef,
        [pendingCount, requirements?.length],
    );

    useFloatingPortalDismiss(menuOpen, () => setMenuOpen(false), rootRef, popoverRef);

    const statusBadgeStyle = {
        background: checked
            ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
            : isWarning
              ? 'color-mix(in oklab, #f59e0b 10%, var(--surface))'
              : 'var(--bg-subtle)',
        color: checked ? 'var(--accent)' : isWarning ? '#92400e' : 'var(--fg-muted)',
    } as const;

    const statusIcon = checked ? (
        <IconEye size={12} />
    ) : isWarning ? (
        <IconAlertCircle size={12} />
    ) : (
        <IconEyeOff size={12} />
    );

    const popoverWidth = 300;
    const popoverLeft = position
        ? Math.max(
            FLOATING_VIEWPORT_PAD_PX,
            Math.min(position.left + position.width - popoverWidth, window.innerWidth - popoverWidth - FLOATING_VIEWPORT_PAD_PX),
        )
        : 0;

    const popover = menuOpen && position && requirements ? (
        <div
            ref={popoverRef}
            role="dialog"
            aria-label="Requisitos para publicar"
            className="rounded-xl border p-3 shadow-lg"
            style={{
                position: 'fixed',
                top: position.top,
                left: popoverLeft,
                width: popoverWidth,
                zIndex: FLOATING_POPOVER_Z_INDEX,
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                boxShadow: '0 12px 40px color-mix(in oklab, var(--fg) 18%, transparent)',
            }}
        >
            <PanelBusinessPublishRequirementsList items={requirements} />
        </div>
    ) : null;

    return (
        <div ref={rootRef} className="relative shrink-0">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                {showRequirementsMenu ? (
                    <button
                        ref={triggerRef}
                        type="button"
                        aria-expanded={menuOpen}
                        aria-haspopup="dialog"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-90 sm:px-2.5 sm:py-1 sm:text-xs"
                        style={statusBadgeStyle}
                    >
                        {statusIcon}
                        {label}
                        <span className="opacity-80">({pendingCount})</span>
                        <IconChevronDown
                            size={12}
                            className="transition-transform"
                            style={{ transform: menuOpen ? 'rotate(180deg)' : undefined }}
                            aria-hidden
                        />
                    </button>
                ) : (
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs"
                        style={statusBadgeStyle}
                    >
                        {statusIcon}
                        {label}
                    </span>
                )}

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
            {error ? <p className="mt-1 max-w-xs text-right text-xs text-rose-500 sm:text-sm">{error}</p> : null}
            {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
        </div>
    );
}
