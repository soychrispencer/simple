'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
    IconArrowLeft,
    IconBell,
    IconCar,
    IconFlag,
    IconLayoutDashboard,
    IconLogout,
    IconMoon,
    IconSettings,
    IconSun,
    IconUsers,
} from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { Sidebar, PanelBottomNav, PanelPillNav } from '@simple/ui';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';
import { ADMIN_SCOPE_ITEMS, adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';

const STORAGE_COLLAPSED = 'simpleadmin:sidebar:collapsed';

type NavItem = {
    href: string;
    icon: typeof IconLayoutDashboard;
    label: string;
};

const NAV_ITEMS: NavItem[] = [
    { href: '/', icon: IconLayoutDashboard, label: 'Dashboard' },
    { href: '/usuarios', icon: IconUsers, label: 'Usuarios' },
    { href: '/publicaciones', icon: IconCar, label: 'Publicaciones' },
    { href: '/reportes', icon: IconFlag, label: 'Leads' },
    { href: '/configuracion', icon: IconSettings, label: 'Configuración' },
];

function adminRoleLabel(role: AdminSessionUser['role']): string {
    return role === 'superadmin' ? 'Superadmin' : 'Admin';
}

function isAdminNavActive(pathname: string, href: string): boolean {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
}

export function AdminShell({ children, user }: { children: React.ReactNode; user: AdminSessionUser }) {
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const scope = normalizeAdminScope(searchParams.get('scope'));

    const nav = useMemo(
        () =>
            NAV_ITEMS.map((item) => ({
                ...item,
                href: withAdminScope(item.href, scope),
                active: isAdminNavActive(pathname, item.href),
            })),
        [pathname, scope]
    );

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_COLLAPSED) === '1') {
                setCollapsed(true);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
        } catch {
            // ignore
        }
    }, [collapsed]);

    const handleLogout = async () => {
        await logoutAdmin();
        router.push('/');
        router.refresh();
    };

    const scopeItems = ADMIN_SCOPE_ITEMS.map((item) => ({ key: item.key, label: item.label }));
    const userName = user.name?.trim() || 'Administrador';
    const roleLabel = adminRoleLabel(user.role);

    return (
        <div className="min-h-screen w-full bg-[var(--bg)]">
            <MarketplaceHeader
                brandAppId="simpleadmin"
                publicLinks={[]}
                getPanelNavItems={() => []}
                isPanelNavActive={() => false}
                fetchPanelNotifications={async () => []}
                homeHref={withAdminScope('/', scope)}
                centerSlot={
                    <PanelPillNav
                        items={scopeItems}
                        activeKey={scope}
                        onChange={(nextScope) => {
                            router.push(withAdminScope(pathname || '/', nextScope as Parameters<typeof withAdminScope>[1]));
                        }}
                        mobileLabel="Vista del panel"
                        ariaLabel="Selección de ámbito administrativo"
                        size="sm"
                    />
                }
                rightSlot={
                    <>
                        <button
                            type="button"
                            onClick={() => router.push(withAdminScope('/reportes', scope))}
                            className="header-icon-chip"
                            aria-label="Leads"
                        >
                            <IconBell size={16} stroke={1.9} />
                        </button>
                        {mounted ? (
                            <button
                                type="button"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="header-icon-chip"
                                aria-label="Cambiar tema"
                            >
                                {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                            </button>
                        ) : null}
                        <Link
                            href="https://simpleplataforma.app"
                            className="header-icon-chip hidden sm:inline-flex"
                            aria-label="Ir a la plataforma"
                        >
                            <IconArrowLeft size={16} stroke={1.9} />
                        </Link>
                        <button
                            type="button"
                            onClick={() => void handleLogout()}
                            className="header-icon-chip"
                            aria-label="Cerrar sesión"
                            title={`${userName} · ${user.email}`}
                        >
                            <IconLogout size={16} stroke={1.9} />
                        </button>
                    </>
                }
            />

            <div className="flex min-h-[calc(100vh-64px)] w-full">
                <Sidebar
                    fixed={false}
                    navItems={nav.map((item) => ({ href: item.href, icon: item.icon, label: item.label }))}
                    user={{ name: userName, role: roleLabel }}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((current) => !current)}
                    footerHref="https://simpleplataforma.app"
                    footerLabel="Ir a la plataforma"
                    footerIcon={IconArrowLeft}
                />

                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="panel-content-frame pb-20 lg:pb-0">{children}</div>
                </main>
            </div>

            <PanelBottomNav
                items={nav.map((item) => ({
                    href: item.href,
                    label: item.label,
                    icon: item.icon,
                    active: item.active,
                }))}
                LinkComponent={Link}
                ariaLabel="Navegación de administración"
            />
        </div>
    );
}
