'use client';

import Link from 'next/link';
import { BrandLogo } from '@simple/ui/brand';
import { PanelButtonLink } from '@simple/ui/panel';

export function PublicMariachiHeader() {
    return (
        <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
            <div className="mx-auto flex h-14 min-w-0 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link href="/" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    <BrandLogo appId="simpleserenatas" size="sm" />
                    <span className="hidden text-sm font-semibold text-fg sm:inline">Simple Serenatas</span>
                </Link>
                <nav className="flex items-center gap-3 text-sm">
                    <Link href="/mariachis" className="font-medium text-fg-muted transition-colors hover:text-accent">
                        Mariachis
                    </Link>
                    <PanelButtonLink href="/panel" prefetch={false} variant="accent" className="h-9 px-3">
                        Entrar
                    </PanelButtonLink>
                </nav>
            </div>
        </header>
    );
}
