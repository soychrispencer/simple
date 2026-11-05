'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconCreditCard,
    IconMessageCircle,
    IconUsers,
} from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { PanelBottomNav, PanelShell, type PanelBottomNavItem } from '@simple/ui/panel';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';

const ADMIN_NAV_BASE = [
    { href: '/', label: 'Usuarios', icon: IconUsers },
    { href: '/conversaciones', label: 'Conversaciones', icon: IconMessageCircle },
];

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

export function AdminShell({ children, user }: { children: ReactNode; user: AdminSessionUser }) {
    const router = useRouter();
    const roleLabel = adminRoleLabel(user.role);
    const platformUrl = getPlatformUrl();
    const adminNav = user.role === 'superadmin'
        ? [...ADMIN_NAV_BASE, { href: '/planes', label: 'Planes', icon: IconCreditCard }]
        : ADMIN_NAV_BASE;

    const handleLogout = async () => {
        await logoutAdmin();
        window.location.href = platformUrl;
        router.refresh();
    };

    const bottomNavItems: PanelBottomNavItem[] = adminNav.map((item) => ({
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
                getPanelNavItems={() => adminNav}
                isPanelNavActive={isPanelNavActive}
                fetchPanelNotifications={async () => []}
                homeHref="/"
                showPrimaryAction={false}
                onLogout={handleLogout}
            />

            <PanelShell
                navItems={adminNav}
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
