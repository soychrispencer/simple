'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@simple/ui/theme';
import { useEffect, useMemo, useState } from 'react';
import {
    IconArrowLeft, IconBell, IconCar, IconFlag, IconLayoutDashboard, IconLogout, IconMoon, IconSettings, IconSun, IconUsers,
} from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { PanelBottomNav } from '@simple/ui/panel';
import { PanelPillNav } from '@simple/ui/panel';
import { Sidebar } from '@simple/ui/sidebar';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';
import {
    ADMIN_SCOPE_ITEMS,
    ADMIN_VIEW_ITEMS,
    normalizeAdminScope,
    normalizeAdminView,
    withAdminScope,
    type AdminPanelView,
    type AdminScope,
} from '@/lib/admin-scope';

const STORAGE_COLLAPSED = 'simpleadmin:sidebar:collapsed';

type NavItem = {
    href: string;
    icon: typeof IconLayoutDashboard;
    label: string;
};

const NAV_BY_VIEW: Record<AdminPanelView, NavItem[]> = {
    global: [
        { href: '/', icon: IconLayoutDashboard, label: 'Resumen' },
        { href: '/usuarios', icon: IconUsers, label: 'Usuarios' },
        { href: '/configuracion', icon: IconSettings, label: 'Configuración' },
    ],
    verticales: [
        { href: '/usuarios', icon: IconUsers, label: 'Usuarios vertical' },
        { href: '/publicaciones', icon: IconCar, label: 'Publicaciones' },
        { href: '/reportes', icon: IconFlag, label: 'Leads vertical' },
    ],
    operacion: [
        { href: '/reportes', icon: IconFlag, label: 'Leads' },
        { href: '/usuarios', icon: IconUsers, label: 'Cuentas' },
        { href: '/configuracion', icon: IconSettings, label: 'Sistema' },
    ],
};

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
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const scope = normalizeAdminScope(searchParams.get('scope'));
    const view = normalizeAdminView(searchParams.get('view'), scope);
    const activeVertical = scope === 'all' ? 'serenatas' : scope;

    const nav = useMemo(
        () =>
            NAV_BY_VIEW[view].map((item) => ({
                ...item,
                href: withAdminScope(item.href, scope, view),
                active: isAdminNavActive(pathname, item.href),
            })),
        [pathname, scope, view]
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

    const viewItems = ADMIN_VIEW_ITEMS.map((item) => ({ key: item.key, label: item.label }));
    const verticalItems = ADMIN_SCOPE_ITEMS.filter((item) => item.key !== 'all').map((item) => ({ key: item.key, label: item.label }));
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
                homeHref={withAdminScope('/', scope, view)}
                centerSlot={
                    <div className="flex items-center gap-2">
                        <PanelPillNav
                            items={viewItems}
                            activeKey={view}
                            onChange={(nextView) => {
                                const resolvedView = nextView as AdminPanelView;
                                const nextScope: AdminScope = resolvedView === 'verticales' ? activeVertical : 'all';
                                router.push(withAdminScope(pathname || '/', nextScope, resolvedView));
                            }}
                            mobileLabel="Área del panel"
                            ariaLabel="Selección de área administrativa"
                            size="sm"
                        />
                        {view === 'verticales' ? (
                            <PanelPillNav
                                items={verticalItems}
                                activeKey={activeVertical}
                                onChange={(nextScope) => {
                                    router.push(withAdminScope(pathname || '/', nextScope as AdminScope, 'verticales'));
                                }}
                                mobileLabel="Vertical"
                                ariaLabel="Selección de vertical"
                                size="sm"
                            />
                        ) : null}
                    </div>
                }
                rightSlot={
                    <>
                        <button
                            type="button"
                            onClick={() => router.push(withAdminScope('/reportes', scope, view))}
                            className="header-icon-chip"
                            aria-label="Leads"
                        >
                            <IconBell size={16} stroke={1.9} />
                        </button>
                        {mounted ? (
                            <button
                                type="button"
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className="header-icon-chip"
                                aria-label="Cambiar tema"
                            >
                                {resolvedTheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
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
