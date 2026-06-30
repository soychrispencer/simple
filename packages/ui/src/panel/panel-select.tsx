'use client';

import { useMemo, type ChangeEvent, type SelectHTMLAttributes } from 'react';
import { ModernSelect } from '../modern-select.js';
import { joinClasses } from '../shared/join-classes.js';
import { optionsFromSelectChildren } from '../shared/select-options.js';

export type PanelSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    placeholder?: string;
};

export function PanelSelect({
    className,
    value,
    onChange,
    disabled,
    children,
    placeholder = 'Seleccionar',
    'aria-label': ariaLabel,
}: PanelSelectProps) {
    const options = useMemo(() => optionsFromSelectChildren(children), [children]);

    return (
        <ModernSelect
            value={String(value ?? '')}
            onChange={(next) => {
                onChange?.({
                    target: { value: next },
                    currentTarget: { value: next },
                } as ChangeEvent<HTMLSelectElement>);
            }}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
            triggerClassName={joinClasses('min-w-0 w-full', className)}
        />
    );
}
