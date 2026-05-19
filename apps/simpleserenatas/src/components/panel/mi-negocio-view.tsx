'use client';

import clsx from 'clsx';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MusicianDirectoryItem } from '@/lib/serenatas-api';
import type { Section } from '@/context/serenata-context';
import { type MiNegocioTab, miNegocioTabLabel } from '@/lib/mi-negocio-tab';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import { GroupsView } from '@/components/panel/groups-view';
import { ProviderGroupView } from '@/components/panel/provider-group-view';
import { ProviderServicesView } from '@/components/panel/provider-services-view';

const TAB_ORDER: MiNegocioTab[] = ['perfil', 'servicios', 'grupos'];

export function MiNegocioView({
    tab,
    musicians,
    refresh,
    setSection,
}: {
    tab: MiNegocioTab;
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
    setSection: (section: Section) => void;
}) {
    const router = useRouter();

    const changeTab = useCallback(
        (next: MiNegocioTab) => {
            router.replace(panelMiNegocioHref(next), { scroll: false });
        },
        [router],
    );

    return (
        <div className="grid gap-5">
            <div
                role="tablist"
                aria-label="Secciones de mi negocio"
                className="panel-surface-subtle inline-flex max-w-full flex-wrap gap-1 rounded-button border p-1"
            >
                {TAB_ORDER.map((key) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => changeTab(key)}
                            className={clsx(
                                'rounded-button px-3 py-2 text-sm font-medium transition-colors',
                                active
                                    ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                            )}
                        >
                            {miNegocioTabLabel(key)}
                        </button>
                    );
                })}
            </div>

            {tab === 'perfil' ? (
                <ProviderGroupView refresh={refresh} setSection={setSection} onNavigateTab={changeTab} />
            ) : null}
            {tab === 'servicios' ? <ProviderServicesView refresh={refresh} /> : null}
            {tab === 'grupos' ? (
                <GroupsView musicians={musicians} refresh={refresh} />
            ) : null}
        </div>
    );
}
