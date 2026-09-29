import type { ReactNode } from 'react';
import { BrandLogo } from '@simple/ui/brand';
import { PanelCard } from '@simple/ui/panel';

export function AdminAuthFrame({ title, description, children }: {
    title?: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-8">
            <PanelCard className="w-full max-w-md p-6 sm:p-8">
                <div className="mb-6 flex justify-center"><BrandLogo appId="simpleadmin" /></div>
                {title ? <h1 className="text-xl font-semibold text-[var(--fg)]">{title}</h1> : null}
                {description ? <p className="mt-2 text-sm text-[var(--fg-muted)]">{description}</p> : null}
                <div className={title || description ? 'mt-6' : ''}>{children}</div>
            </PanelCard>
        </div>
    );
}
