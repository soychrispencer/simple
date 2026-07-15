'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconMessageCircle,
    IconUsers,
} from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { PanelBottomNav, PanelShell, type PanelBottomNavItem } from '@simple/ui/panel';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';

const ADMIN_NAV = [
    { href: '/', label: 'Usuarios', icon: IconUsers },
    { href: '/conversaciones', label: 'Conversaciones', icon: IconMessageCircle },
];

const HEADER_VERTICALS = [
    { value: 'all', label: 'General' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
] as const;

function adminRoleLabel(role: AdminSessionUser['role']) {
    return role === 'superadmin' ? 'Superadmin' : 'Admin';
}

function isPanelNavActive(pathname: string, href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function getPlatformUrl() {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://simpleplataforma.app';
    }

    const configured = process.env.NEXT_PUBLIC_PLATFORM_URL?.trim();
    if (configured) {
        return configured;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    return 'https://simpleplataforma.app';
}

function AdminHeaderVerticalTabs() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const active = searchParams.get('vertical') ?? 'all';

    if (pathname !== '/') return null;

    return (
        <nav className="hidden items-center gap-1 overflow-x-auto md:flex" aria-label="Verticales de SimpleAdmin">
            {HEADER_VERTICALS.map((item) => {
                const href = item.value === 'all' ? '/' : `/?vertical=${item.value}`;
                const selected = active === item.value || (item.value === 'all' && !searchParams.get('vertical'));
                return (
                    <Link
                        key={item.value}
                        href={href}
                        className="rounded-full px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                        style={{
                            background: selected ? 'var(--fg)' : 'transparent',
                            color: selected ? 'var(--bg)' : 'var(--fg-secondary)',
                        }}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export function AdminShell({ children, user }: { children: ReactNode; user: AdminSessionUser }) {
    const router = useRouter();
    const roleLabel = adminRoleLabel(user.role);
    const platformUrl = getPlatformUrl();

    const handleLogout = async () => {
        await logoutAdmin();
        window.location.href = platformUrl;
        router.refresh();
    };

    const bottomNavItems: PanelBottomNavItem[] = ADMIN_NAV.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        active: false,
    }));

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
            <MarketplaceHeader
                brandAppId="simpleadmin"
                publicLinks={[]}
                getPanelNavItems={() => ADMIN_NAV}
                isPanelNavActive={isPanelNavActive}
                fetchPanelNotifications={async () => []}
                homeHref="/"
                showPrimaryAction={false}
                onLogout={handleLogout}
                centerSlot={<AdminHeaderVerticalTabs />}
            />

            <PanelShell
                navItems={ADMIN_NAV}
                user={{
                    name: user.name || 'Administrador',
                    role: roleLabel,
                    avatar: user.avatar ?? undefined,
                }}
                roleLabel={roleLabel}
                collapsedStorageKey="simpleadmin:sidebar:collapsed"
                footerHref={platformUrl}
                footerLabel="Ir a SimplePlataforma"
                footerIcon={IconArrowLeft}
                showVerificationBanner={false}
                mobileDrawerTitle="SimpleAdmin"
                bottomNav={<PanelBottomNav items={bottomNavItems} LinkComponent={Link} ariaLabel="Navegación de SimpleAdmin" />}
            >
                {children}
            </PanelShell>
        </div>
    );
}
