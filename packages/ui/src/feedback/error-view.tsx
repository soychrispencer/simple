'use client';

import type { ReactNode } from 'react';

export type ErrorViewProps = {
    code?: string;
    title: string;
    description?: string;
    primaryAction: ReactNode;
    secondaryAction?: ReactNode;
    errorDigest?: string;
};

export function ErrorView({
    code,
    title,
    description,
    primaryAction,
    secondaryAction,
    errorDigest,
}: ErrorViewProps) {
    return (
        <div className="error-view-page">
            {code ? (
                <p className="error-view-page__code">{code}</p>
            ) : null}
            <h1 className="error-view-page__title">{title}</h1>
            {description ? (
                <p className="error-view-page__description">{description}</p>
            ) : <div className="error-view-page__spacer" />}
            <div className="error-view-page__actions">
                {primaryAction}
                {secondaryAction}
            </div>
            {errorDigest ? (
                <p className="error-view-page__digest">ref: {errorDigest}</p>
            ) : null}
        </div>
    );
}
