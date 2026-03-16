'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconSearch, IconPlus, IconBookmark, IconUser } from '@tabler/icons-react';

export function MobileNav() {
    const pathname = usePathname();

    const items = [
        { href: '/', icon: IconHome, label: 'Inicio' },
        { href: '/ventas', icon: IconSearch, label: 'Buscar' },
        { href: '/panel/publicar', icon: IconPlus, label: 'Publicar', primary: true },
        { href: '/panel/guardados', icon: IconBookmark, label: 'Guardados' },
        { href: '/panel', icon: IconUser, label: 'Perfil' },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
            style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in oklab, var(--surface) 86%, transparent)',
                backdropFilter: 'blur(14px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <div className="flex items-center justify-around h-14 px-2">
                {items.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    if (item.primary) {
                        return (
                            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 -mt-4">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--fg)', color: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
                                    <Icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{item.label}</span>
                            </Link>
                        );
                    }
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-1.5 px-2">
                            <Icon size={18} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)' }} />
                            <span className="text-xs" style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)' }}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
