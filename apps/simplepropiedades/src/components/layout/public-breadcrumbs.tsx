'use client';

import Link from 'next/link';

type PublicBreadcrumbItem = {
    label: string;
    href?: string;
};

export function PublicBreadcrumbs(props: { items: PublicBreadcrumbItem[]; className?: string }) {
    const { items, className } = props;

    return (
        <nav className={className ?? 'mb-6 flex items-center gap-1.5 text-xs'} style={{ color: 'var(--fg-muted)' }} aria-label="Breadcrumb">
            {items.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                    {item.href ? (
                        <Link href={item.href} style={{ color: 'var(--fg-secondary)' }}>
                            {item.label}
                        </Link>
                    ) : (
                        <span style={{ color: 'var(--fg)' }}>{item.label}</span>
                    )}
                    {index < items.length - 1 ? <span>/</span> : null}
                </span>
            ))}
        </nav>
    );
}
