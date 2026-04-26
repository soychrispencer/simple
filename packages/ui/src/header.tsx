'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
  IconBell,
  IconSun,
  IconMoon,
  IconUser,
  IconMenu2,
  IconX,
  IconPlus,
  IconLogout,
  IconSteeringWheel,
  IconBuildingSkyscraper,
  IconCalendar,
  IconConfetti,
  IconShieldLock,
  IconBuilding,
} from '@tabler/icons-react';

// Logo configuration
const BRAND_CONFIG = {
  autos: {
    name: 'Autos',
    color: '#ff3600',
    icon: IconSteeringWheel,
  },
  propiedades: {
    name: 'Propiedades',
    color: '#3b82f6',
    icon: IconBuildingSkyscraper,
  },
  agenda: {
    name: 'Agenda',
    color: '#0d9488',
    icon: IconCalendar,
  },
  serenatas: {
    name: 'Serenatas',
    color: '#E11D48',
    icon: IconConfetti,
  },
  admin: {
    name: 'Admin',
    color: '#6b7280',
    icon: IconShieldLock,
  },
  plataforma: {
    name: 'Plataforma',
    color: '#6b7280',
    icon: IconBuilding,
  },
};

export type Brand = keyof typeof BRAND_CONFIG;

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export interface HeaderProps {
  brand: Brand;
  navItems: NavItem[];
  homeHref?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onPublish?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showPublishButton?: boolean;
  className?: string;
}

export function Header({
  brand,
  navItems,
  homeHref = '/',
  user,
  onLogin,
  onLogout,
  onPublish,
  notificationCount = 0,
  onNotificationClick,
  showPublishButton = false,
  className = '',
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const config = BRAND_CONFIG[brand];
  const Icon = config.icon;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    const current = root.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    setTheme(newTheme);
  };

  return (
    <header
      className={`relative z-40 transition-all duration-300 ${className}`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="container-app flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-2 group shrink-0">
          <span
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:opacity-80"
            style={{ borderColor: config.color, color: config.color }}
          >
            <Icon size={18} />
          </span>
          <span
            className="inline-flex items-baseline gap-[0.08rem] text-[1.05rem] tracking-tight"
            style={{ color: 'var(--fg)' }}
          >
            <span className="font-semibold leading-none">Simple</span>
            <span className="font-normal leading-none" style={{ color: config.color }}>
              {config.name}
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[var(--bg-muted)]"
              style={{ color: 'var(--fg)' }}
            >
              {item.label}
              {item.badge && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full"
                  style={{ background: config.color, color: '#fff' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors hover:bg-[var(--bg-muted)]"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>

          {/* Notifications */}
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors hover:bg-[var(--bg-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
              aria-label="Notifications"
            >
              <IconBell size={18} />
              {notificationCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-semibold rounded-full"
                  style={{ background: config.color, color: '#fff' }}
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {/* Publish Button (Desktop) */}
          {showPublishButton && onPublish && (
            <button
              onClick={onPublish}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
              style={{ background: config.color }}
            >
              <IconPlus size={16} />
              <span>Publicar</span>
            </button>
          )}

          {/* User Menu or Login */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-[10px] border transition-colors hover:bg-[var(--bg-muted)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold"
                  style={{ background: config.color, color: '#fff' }}
                >
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="text-sm hidden sm:block" style={{ color: 'var(--fg)' }}>
                  {user.name?.split(' ')[0] || 'Usuario'}
                </span>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 py-2 rounded-xl border shadow-lg"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      {user.name || 'Usuario'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                      {user.email || ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                    style={{ color: 'var(--fg)' }}
                  >
                    <IconLogout size={16} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--bg-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              <IconUser size={16} />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors hover:bg-[var(--bg-muted)]"
            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 border-b py-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="container-app flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-3 text-base font-medium rounded-lg transition-colors hover:bg-[var(--bg-muted)]"
                style={{ color: 'var(--fg)' }}
              >
                {item.label}
                {item.badge && (
                  <span
                    className="px-2 py-0.5 text-xs font-semibold rounded-full"
                    style={{ background: config.color, color: '#fff' }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {showPublishButton && onPublish && (
              <button
                onClick={() => {
                  onPublish();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 mt-2 px-3 py-3 text-base font-medium rounded-lg text-white"
                style={{ background: config.color }}
              >
                <IconPlus size={18} />
                <span>Publicar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { BRAND_CONFIG };
