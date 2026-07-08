'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type PublicProfileCatalogTabKey = 'listings' | 'products' | 'services';

export type PublicProfileCatalogTab = {
    key: PublicProfileCatalogTabKey;
    label: string;
    content: ReactNode;
};

export function PublicProfileCatalogTabs({ tabs }: { tabs: PublicProfileCatalogTab[] }) {
    const defaultTab = tabs[0]?.key ?? 'listings';
    const [activeTab, setActiveTab] = useState<PublicProfileCatalogTabKey>(defaultTab);
    const signature = useMemo(() => tabs.map((tab) => tab.key).join('|'), [tabs]);

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [signature, defaultTab]);

    const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
    if (!active) return null;

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab.key
                                ? 'bg-bg-subtle text-fg'
                                : 'text-fg-muted hover:text-fg'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {active.content}
        </section>
    );
}
