'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { IconLayoutDashboard, IconUsers, IconCar, IconFlag, IconSettings, IconLogout, IconSun, IconMoon, IconBell } from '@tabler/icons-react';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';

export function AdminShell({ children, user }: { children: React.ReactNode; user: AdminSessionUser }) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const nav = [
        { href: '/', icon: IconLayoutDashboard, label: 'Dashboard' },
        { href: '/usuarios', icon: IconUsers, label: 'Usuarios' },
        { href: '/publicaciones', icon: IconCar, label: 'Publicaciones' },
        { href: '/reportes', icon: IconFlag, label: 'Leads' },
        { href: '/configuracion', icon: IconSettings, label: 'Configuración' },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-56 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="h-14 flex items-center px-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--fg)' }}>
                            <span className="font-semibold text-xs" style={{ color: 'var(--bg)' }}>S</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                            Simple<span className="font-normal" style={{ color: 'var(--fg-muted)' }}>Admin</span>
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {nav.map(n => {
                        const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
                        const Icon = n.icon;
                        return (
                            <Link key={n.href} href={n.href} className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm" style={{ background: active ? 'var(--bg-muted)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg-secondary)', fontWeight: active ? 500 : 400 }}>
                                <Icon size={16} />{n.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-3 pb-4 space-y-1">
                    <button
                        className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm w-full"
                        style={{ color: 'var(--fg-muted)' }}
                        onClick={async () => {
                            await logoutAdmin();
                            router.push('/');
                            router.refresh();
                        }}
                    >
                        <IconLogout size={16} />Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col">
                <header className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div />
                    <div className="flex items-center gap-2">
                        <Link href="/reportes" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
                            <IconBell size={16} />
                        </Link>
                        {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>{theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}</button>}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                            {user.name.trim().charAt(0).toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
