import type { ReactNode } from 'react';

export interface SectionHeaderProps {
    badgeIcon?: ReactNode;
    badgeLabel: string;
    title: ReactNode;
    subtitle?: string;
    align?: 'center' | 'left';
    className?: string;
}

export function SectionHeader({
    badgeIcon,
    badgeLabel,
    title,
    subtitle,
    align = 'center',
    className = '',
}: SectionHeaderProps) {
    const isCenter = align === 'center';

    return (
        <div
            className={`mb-10 sm:mb-14 ${isCenter ? 'text-center mx-auto max-w-2xl' : 'text-left max-w-2xl'} ${className}`}
        >
            <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3.5 border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent-ink)] shadow-2xs ${
                    isCenter ? 'mx-auto' : ''
                }`}
            >
                {badgeIcon}
                <span>{badgeLabel}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--fg)] leading-[1.2]">
                {title}
            </h2>

            {subtitle && (
                <p className="mt-3 text-sm sm:text-base text-[var(--fg-secondary)] leading-relaxed max-w-xl mx-auto">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
