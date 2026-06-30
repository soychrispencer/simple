'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes';
import { PanelPageHeader } from './panel-display.js';

export type PanelConfigSectionItem = {
    key: string;
    title: string;
    description?: string;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    done?: boolean;
    required?: boolean;
    badge?: string;
};

export type PanelConfigSectionProps = {
    title: string;
    items: PanelConfigSectionItem[];
    className?: string;
    showProgress?: boolean;
    loading?: boolean;
};

export type PanelConfigPageProps = {
    title: string;
    description?: string;
    sections: PanelConfigSectionItem[];
    extras?: PanelConfigSectionItem[];
    showProgress?: boolean;
    loading?: boolean;
    className?: string;
};

export function PanelConfigPage(props: PanelConfigPageProps) {
    const { title, description, sections, extras, showProgress = false, loading = false, className } = props;

    return (
        <div className={joinClasses('container-app panel-page py-4 lg:py-8 max-w-2xl', className)}>
            <PanelPageHeader title={title} description={description} />

            <div className="space-y-6">
                <PanelConfigSection title="Configuración" items={sections} showProgress={showProgress} loading={loading} />
                {extras ? <PanelConfigSection title="Opciones adicionales" items={extras} loading={loading} /> : null}
            </div>
        </div>
    );
}

export function PanelConfigSection(props: PanelConfigSectionProps) {
    const { title, items, className, showProgress = false, loading = false } = props;

    const requiredItems = items.filter((item) => item.required !== false);
    const completedRequired = requiredItems.filter((item) => item.done).length;
    const allReady = requiredItems.length > 0 && completedRequired === requiredItems.length;

    if (loading) {
        return null;
    }

    return (
        <div className={joinClasses('space-y-3', className)}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                {title}
            </h3>

            {showProgress && !loading && !allReady && requiredItems.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                            {completedRequired} de {requiredItems.length} secciones esenciales
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {Math.round((completedRequired / requiredItems.length) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(completedRequired / requiredItems.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2">
                {items.map((item) => {
                    const isRequired = item.required !== false;
                    const isDone = Boolean(item.done);
                    const pendingRequired = isRequired && !isDone;

                    const content = (
                        <div className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]" style={{ borderColor: pendingRequired ? 'var(--accent-border)' : 'var(--border)', background: pendingRequired ? 'var(--accent-soft)' : 'var(--surface)' }}>
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                    background: isDone ? 'var(--accent)' : 'var(--bg-muted)',
                                    color: isDone ? '#fff' : 'var(--fg-muted)',
                                }}
                            >
                                {isDone ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : item.icon ? (
                                    item.icon
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        {item.title}
                                    </p>
                                    {!isDone && !isRequired && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            Opcional
                                        </span>
                                    )}
                                    {item.badge && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                {item.description && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );

                    if (item.href) {
                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                className="block"
                                style={{ pointerEvents: item.disabled ? 'none' : 'auto', opacity: item.disabled ? 0.6 : 1 }}
                            >
                                {content}
                            </a>
                        );
                    }

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className="block w-full text-left"
                            style={{ pointerEvents: item.disabled ? 'none' : 'auto', opacity: item.disabled ? 0.6 : 1 }}
                        >
                            {content}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
