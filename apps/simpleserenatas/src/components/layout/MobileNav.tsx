'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSerenatasMobileNavItems, isSerenatasNavActive } from '@/components/layout/panel-nav-config';

export function MobileNav() {
    const pathname = usePathname() ?? '';
    const { effectiveRole } = useAuth();
    const navItems = getSerenatasMobileNavItems(effectiveRole);

    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 z-40 border-t md:hidden"
            style={{
                background: 'color-mix(in oklab, var(--surface) 86%, transparent)',
                backdropFilter: 'blur(14px)',
                borderColor: 'var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isSerenatasNavActive(pathname, item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center w-16 h-full relative"
                        >
                            <div className="relative">
                                <Icon
                                    size={22}
                                    stroke={active ? 2 : 1.5}
                                    style={{ color: active ? 'var(--accent)' : 'var(--fg-muted)' }}
                                />
                                {item.badge && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                                        style={{ background: 'var(--accent)' }}
                                    />
                                )}
                            </div>
                            <span
                                className="text-xs mt-0.5"
                                style={{ 
                                    color: active ? 'var(--accent)' : 'var(--fg-muted)',
                                    fontWeight: active ? 500 : 400
                                }}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
