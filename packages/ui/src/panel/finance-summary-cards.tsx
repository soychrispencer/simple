'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes';

export type FinanceSummaryCard = {
    label: string;
    value: string;
    icon?: ReactNode;
    hint?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger';
};

const TONE_STYLES: Record<string, { bg: string; color: string }> = {
    default: { bg: 'var(--bg-muted)', color: 'var(--fg-muted)' },
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' },
    danger: { bg: 'var(--color-error-bg)', color: 'var(--color-error-text)' },
};

export function FinanceSummaryCards({ cards }: { cards: FinanceSummaryCard[] }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((card) => {
                const tone = card.tone ?? 'default';
                const style = TONE_STYLES[tone];
                return (
                    <div
                        key={card.label}
                        className="rounded-card border p-4"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                {card.label}
                            </span>
                            {card.icon ? (
                                <span
                                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                                    style={{ background: style.bg, color: style.color }}
                                >
                                    {card.icon}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>{card.value}</p>
                        {card.hint ? (
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{card.hint}</p>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
