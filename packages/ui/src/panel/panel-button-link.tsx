'use client';

import Link from 'next/link';
import type { CSSProperties, ComponentProps } from 'react';
import { getPanelButtonClassName, getPanelButtonStyle, type PanelButtonProps } from './panel-button';

type PanelButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className' | 'style'> & {
    className?: string;
    style?: CSSProperties;
    size?: PanelButtonProps['size'];
    variant?: PanelButtonProps['variant'];
};

export function PanelButtonLink(props: PanelButtonLinkProps) {
    const { className, style, size, variant = 'accent', children, ...linkProps } = props;

    return (
        <Link
            {...linkProps}
            className={getPanelButtonClassName({ size, className })}
            style={{ ...getPanelButtonStyle(variant), ...style }}
        >
            {children}
        </Link>
    );
}
