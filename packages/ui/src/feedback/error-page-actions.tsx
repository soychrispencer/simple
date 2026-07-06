'use client';

import type { ReactNode } from 'react';
import { PanelButton } from '../panel/panel-button';
import { PanelButtonLink } from '../panel/panel-button-link';

export function ErrorRetryButton(props: { onClick: () => void }) {
    return (
        <PanelButton type="button" variant="accent" onClick={props.onClick}>
            Reintentar
        </PanelButton>
    );
}

export function ErrorHomeLink(props: { href?: string; children?: ReactNode }) {
    const { href = '/', children = 'Volver al inicio' } = props;
    return (
        <PanelButtonLink href={href} variant="accent">
            {children}
        </PanelButtonLink>
    );
}

export function ErrorSecondaryLink(props: { href: string; children: ReactNode }) {
    return (
        <PanelButtonLink href={props.href} variant="secondary">
            {props.children}
        </PanelButtonLink>
    );
}
