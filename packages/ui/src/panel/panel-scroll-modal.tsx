'use client';

import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { IconX } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes.js';

export type PanelScrollModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '5xl' | '6xl';
export type PanelScrollModalHeight = 'default' | 'tall';

type PanelScrollFrameProps = {
    open?: boolean;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: PanelScrollModalSize;
    height?: PanelScrollModalHeight;
    zIndexClass?: string;
    overlayClassName?: string;
    panelClassName?: string;
    bodyClassName?: string;
    showMobileHandle?: boolean;
    lockBodyScroll?: boolean;
    labelledBy?: string;
    ariaLabel?: string;
    header?: ReactNode;
    constrainContent?: boolean;
};

const SIZE_CLASS: Record<PanelScrollModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
};

const HEIGHT_CLASS: Record<PanelScrollModalHeight, string> = {
    default: 'max-h-[min(92dvh,40rem)] sm:max-h-[min(88vh,40rem)]',
    tall: 'max-h-[min(92dvh,52rem)] sm:max-h-[min(90vh,52rem)]',
};

function PanelScrollFrame({
    open = true,
    onClose,
    children,
    footer,
    size = 'lg',
    height = 'default',
    zIndexClass = 'z-[80]',
    overlayClassName,
    panelClassName,
    bodyClassName,
    showMobileHandle = true,
    lockBodyScroll = true,
    labelledBy,
    ariaLabel,
    header,
    constrainContent = false,
}: PanelScrollFrameProps) {
    useEffect(() => {
        if (!open || !lockBodyScroll) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [lockBodyScroll, open]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div className={joinClasses('fixed inset-0 flex items-end justify-center sm:items-center sm:p-4', zIndexClass)}>
            <button
                type="button"
                aria-label="Cerrar"
                className={joinClasses('absolute inset-0 bg-black/45', overlayClassName)}
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-label={ariaLabel}
                className={joinClasses(
                    'relative z-[1] flex w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-(--border) bg-(--surface) shadow-2xl sm:rounded-[1.35rem]',
                    SIZE_CLASS[size],
                    HEIGHT_CLASS[height],
                    panelClassName,
                )}
                onClick={(event) => event.stopPropagation()}
            >
                {showMobileHandle ? (
                    <div className="flex shrink-0 justify-center pt-2.5 sm:hidden" aria-hidden>
                        <span className="h-1 w-10 rounded-full bg-(--border)" />
                    </div>
                ) : null}

                {header}

                <div
                    className={joinClasses(
                        constrainContent
                            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                            : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]',
                        bodyClassName,
                    )}
                >
                    {constrainContent ? (
                        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                    ) : (
                        children
                    )}
                </div>

                {footer ? (
                    <div className="shrink-0 border-t border-(--border) px-5 py-3 sm:py-4">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export type PanelScrollModalProps = {
    open?: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    headerContent?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: PanelScrollModalSize;
    height?: PanelScrollModalHeight;
    zIndexClass?: string;
    overlayClassName?: string;
    panelClassName?: string;
    bodyClassName?: string;
    titleId?: string;
    showMobileHandle?: boolean;
    lockBodyScroll?: boolean;
};

export function PanelScrollModal({
    open = true,
    title,
    subtitle,
    description,
    headerContent,
    onClose,
    children,
    footer,
    size = 'lg',
    height = 'default',
    zIndexClass = 'z-[80]',
    overlayClassName,
    panelClassName,
    bodyClassName,
    titleId: titleIdProp,
    showMobileHandle = true,
    lockBodyScroll = true,
}: PanelScrollModalProps) {
    const generatedTitleId = useId();
    const titleId = titleIdProp ?? generatedTitleId;
    const labelledBy = title || headerContent ? titleId : undefined;

    const header = (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-(--border) px-5 pb-4 pt-3 sm:pt-4">
            <div className="min-w-0 flex-1">
                {headerContent ?? (
                    <>
                        {title ? (
                            <h2 id={titleId} className="text-base font-semibold text-(--fg)">
                                {title}
                            </h2>
                        ) : null}
                        {subtitle ? (
                            <p className="mt-0.5 truncate text-xs text-(--fg-muted)">{subtitle}</p>
                        ) : null}
                        {description ? (
                            <p className="mt-1 text-sm leading-snug text-(--fg-secondary)">{description}</p>
                        ) : null}
                    </>
                )}
            </div>
            <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-(--fg-muted) transition hover:bg-(--bg-subtle)"
                aria-label="Cerrar"
            >
                <IconX size={18} />
            </button>
        </div>
    );

    return (
        <PanelScrollFrame
            open={open}
            onClose={onClose}
            footer={footer}
            size={size}
            height={height}
            zIndexClass={zIndexClass}
            overlayClassName={overlayClassName}
            panelClassName={panelClassName}
            bodyClassName={bodyClassName}
            showMobileHandle={showMobileHandle}
            lockBodyScroll={lockBodyScroll}
            labelledBy={labelledBy}
            header={header}
        >
            {children}
        </PanelScrollFrame>
    );
}

export type PanelScrollShellProps = {
    open?: boolean;
    ariaLabel: string;
    onClose: () => void;
    children: ReactNode;
    size?: PanelScrollModalSize;
    height?: PanelScrollModalHeight;
    zIndexClass?: string;
    overlayClassName?: string;
    panelClassName?: string;
    showMobileHandle?: boolean;
    lockBodyScroll?: boolean;
    /** El hijo define header/scroll/footer internos (patrón Serenatas). */
    constrainContent?: boolean;
};

/** Modal sin cabecera fija: overlay + cuerpo con scroll o layout restringido. */
export function PanelScrollShell({
    open = true,
    ariaLabel,
    onClose,
    children,
    size = 'lg',
    height = 'default',
    zIndexClass = 'z-[80]',
    overlayClassName,
    panelClassName,
    showMobileHandle = true,
    lockBodyScroll = true,
    constrainContent = false,
}: PanelScrollShellProps) {
    return (
        <PanelScrollFrame
            open={open}
            onClose={onClose}
            size={size}
            height={height}
            zIndexClass={zIndexClass}
            overlayClassName={overlayClassName}
            panelClassName={panelClassName}
            showMobileHandle={showMobileHandle}
            lockBodyScroll={lockBodyScroll}
            ariaLabel={ariaLabel}
            constrainContent={constrainContent}
            bodyClassName={constrainContent ? undefined : 'p-0'}
        >
            {children}
        </PanelScrollFrame>
    );
}
