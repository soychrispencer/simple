'use client';

import Link from 'next/link';
import { IconCheck, IconCircle } from '@tabler/icons-react';

export type PanelBusinessPublishRequirement = {
    id: string;
    label: string;
    met: boolean;
    href?: string;
};

export function PanelBusinessPublishRequirementsList({
    items,
    title = 'Para activar tu perfil público:',
}: {
    items: PanelBusinessPublishRequirement[];
    title?: string;
}) {
    return (
        <div className="text-left">
            <p className="text-xs font-semibold text-(--fg)">{title}</p>
            <ul className="mt-2 space-y-1.5">
                {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                        {item.met ? (
                            <IconCheck size={15} className="mt-0.5 shrink-0 text-(--accent)" aria-hidden />
                        ) : (
                            <IconCircle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                        )}
                        {item.href && !item.met ? (
                            <Link
                                href={item.href}
                                className="text-(--fg-secondary) underline-offset-2 hover:underline"
                                onClick={(event) => event.stopPropagation()}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className={item.met ? 'text-fg-muted line-through' : 'text-(--fg-secondary)'}>
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** @deprecated Usa el prop `requirements` en PanelBusinessPublishToggle (popover compacto). */
export function PanelBusinessPublishRequirements({
    items,
    title,
}: {
    items: PanelBusinessPublishRequirement[];
    title?: string;
}) {
    const pending = items.filter((item) => !item.met);
    if (pending.length === 0) return null;

    return (
        <div
            className="rounded-xl border p-3 text-left"
            style={{
                borderColor: 'color-mix(in oklab, #f59e0b 35%, var(--border))',
                background: 'color-mix(in oklab, #f59e0b 6%, var(--surface))',
            }}
        >
            <PanelBusinessPublishRequirementsList items={items} title={title} />
        </div>
    );
}
