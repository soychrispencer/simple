import { Children, isValidElement, type ReactNode } from 'react';
import type { ModernSelectOption } from '../modern-select.js';

function optionLabelFromChildren(children: ReactNode): string {
    if (typeof children === 'string' || typeof children === 'number') {
        return String(children);
    }
    if (Array.isArray(children)) {
        return children.map((item) => optionLabelFromChildren(item)).join('');
    }
    if (isValidElement(children)) {
        const props = children.props as { children?: ReactNode };
        return optionLabelFromChildren(props.children);
    }
    return '';
}

export function optionsFromSelectChildren(children: ReactNode): ModernSelectOption[] {
    const options: ModernSelectOption[] = [];
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === 'option') {
            const optionProps = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
            options.push({
                value: String(optionProps.value ?? ''),
                label: optionLabelFromChildren(optionProps.children),
                disabled: optionProps.disabled,
            });
            return;
        }
        if (child.type === 'optgroup') {
            const groupProps = child.props as { label?: string; children?: ReactNode };
            if (groupProps.label) {
                options.push({
                    value: `__heading__${groupProps.label}`,
                    label: groupProps.label,
                    disabled: true,
                });
            }
            options.push(...optionsFromSelectChildren(groupProps.children));
        }
    });
    return options;
}

export const PANEL_DROPDOWN_POPOVER_CLASS = 'max-h-64 overflow-auto rounded-xl border p-1.5';

export const PANEL_DROPDOWN_POPOVER_STYLE = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    boxShadow: '0 18px 44px rgba(0,0,0,0.16)',
} as const;

export function panelDropdownItemStyle(selected = false, focused = false) {
    return {
        background: focused ? 'var(--bg-muted)' : selected ? 'var(--bg-subtle)' : 'transparent',
        color: 'var(--fg)',
    } as const;
}
