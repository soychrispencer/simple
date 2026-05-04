'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  IconBell,
  IconSun,
  IconMoon,
  IconUser,
  IconPlus,
  IconLogout,
  IconSparkles,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { BrandLogo, PanelButton } from '@simple/ui';

export type MarketplacePanelRole = 'user' | 'admin' | 'superadmin';

export type MarketplacePanelNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  visibility?: 'all' | 'admin_plus';
  badge?: string;
};

export type PanelNotification = {
  id: string;
  type: 'service_lead' | 'listing_lead' | 'message_thread';
  title: string;
  time: string;
  href: string;
  createdAt: number;
};

export type MarketplaceHeaderProps = {
  brandAppId: 'simpleautos' | 'simplepropiedades';
  publicLinks: Array<{ href: string; label: string; isNew?: boolean }>;
  getPanelNavItems: (role: MarketplacePanelRole) => MarketplacePanelNavItem[];
  isPanelNavActive: (pathname: string, href: string) => boolean;
  fetchPanelNotifications: () => Promise<PanelNotification[]>;
  /** Cache de favoritos al cambiar sesión (opcional). */
  savedListings?: {
    clearCache: () => void;
    syncFromApi: () => Promise<unknown>;
  };
  /** Ruta de inicio al hacer clic en el logo (default "/"). */
  homeHref?: string;
};

export function MarketplaceHeader({
  brandAppId,
  publicLinks,
  getPanelNavItems,
  isPanelNavActive,
  fetchPanelNotifications,
  savedListings,
  homeHref = '/',
}: MarketplaceHeaderProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { user, isLoggedIn, requireAuth, logout, openAuth } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setNotificationsOpen(false);
  }, [pathname, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      savedListings?.clearCache();
      return;
    }
    void savedListings?.syncFromApi();
  }, [isLoggedIn, savedListings]);

  useEffect(() => {
    let active = true;
    if (!isLoggedIn) {
      setNotifications([]);
      return;
    }
    const run = async () => {
      const items = await fetchPanelNotifications();
      if (!active) return;
      setNotifications(items);
    };
    void run();
    return () => {
      active = false;
    };
  }, [isLoggedIn, pathname, fetchPanelNotifications]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const handlePublicar = () => {
    if (requireAuth(() => router.push('/panel/publicar'))) {
      router.push('/panel/publicar');
    }
  };

  const role: MarketplacePanelRole = user?.role ?? 'user';
  const panelItems = useMemo(() => getPanelNavItems(role), [getPanelNavItems, role]);
  const userName = user?.name?.trim() || 'Usuario';
  const unreadNotifications = notifications.length;

  return (
    <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="container-app flex items-center justify-between h-16">
        <Link href={homeHref} className="flex items-center gap-2 group shrink-0">
          <BrandLogo appId={brandAppId} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
              data-active={pathname === l.href || pathname.startsWith(`${l.href}/`) ? 'true' : 'false'}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{l.label}</span>
                {l.isNew ? (
                  <span className="header-nav-link-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                    <IconSparkles size={10} />
                    Nuevo
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setAccountOpen(false);
                  setMenuOpen(false);
                }}
                className="relative header-icon-chip"
                aria-label="Notificaciones"
                aria-expanded={notificationsOpen}
              >
                <IconBell size={16} stroke={1.9} />
                {unreadNotifications > 0 ? (
                  <span
                    className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full px-1 flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-1rem))] rounded-xl border p-2 animate-slide-down"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="px-2.5 py-2 mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      Notificaciones
                    </p>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {unreadNotifications} sin leer
                    </span>
                  </div>
                  <div className="space-y-1">
                    {notifications.length === 0 ? (
                      <div className="px-2.5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Sin novedades por ahora.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setNotificationsOpen(false)}
                          className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--fg)' }} />
                          <span className="min-w-0 flex-1">
                            <p className="text-sm leading-5" style={{ color: 'var(--fg)' }}>
                              {item.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                              {item.time}
                            </p>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="header-icon-chip"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
          )}

          {isLoggedIn && (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setMenuOpen(false);
                }}
                className="header-icon-chip"
                aria-label="Panel de usuario"
                aria-expanded={accountOpen}
              >
                <IconUser size={16} />
              </button>

              {accountOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(290px,calc(100vw-1rem))] rounded-xl border p-2 animate-slide-down"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      {userName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {user?.email}
                    </p>
                  </div>

                  <nav className="space-y-1" aria-label="Navegación de panel">
                    {panelItems.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isPanelNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setAccountOpen(false)}
                          className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                          style={{
                            color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                            background: active ? 'var(--bg-subtle)' : 'transparent',
                          }}
                        >
                          <span
                            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                            style={{
                              borderColor: active ? 'var(--button-primary-border)' : 'var(--border)',
                              background: active
                                ? 'var(--button-primary-bg)'
                                : 'color-mix(in srgb, var(--bg-subtle) 70%, transparent)',
                              color: active ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                            }}
                          >
                            <ItemIcon size={17} stroke={1.9} />
                          </span>
                          <span className="flex-1 truncate font-medium">{item.label}</span>
                          {item.badge ? (
                            <span
                              className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        void logout();
                      }}
                      className="group w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      <span
                        className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                      >
                        <IconLogout size={17} stroke={1.9} />
                      </span>
                      <span className="font-medium">Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="hidden md:flex">
            {isLoggedIn ? (
              <PanelButton onClick={handlePublicar} variant="primary" size="sm" className="h-9 px-4 text-sm">
                <IconPlus size={13} /> Publicar
              </PanelButton>
            ) : (
              <PanelButton onClick={openAuth} variant="primary" size="sm" className="h-9 px-4 text-sm">
                Iniciar sesión
              </PanelButton>
            )}
          </div>

          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="header-icon-chip"
              aria-label="Menú"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-xl border p-2 animate-slide-down"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
              >
                {isLoggedIn ? (
                  <PanelButton
                    onClick={() => {
                      setMenuOpen(false);
                      handlePublicar();
                    }}
                    variant="primary"
                    className="w-full h-10 text-sm mb-2"
                  >
                    <IconPlus size={14} /> Publicar
                  </PanelButton>
                ) : (
                  <PanelButton
                    onClick={() => {
                      setMenuOpen(false);
                      openAuth();
                    }}
                    variant="primary"
                    className="w-full h-10 text-sm mb-2"
                  >
                    Iniciar sesión
                  </PanelButton>
                )}

                <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />

                {publicLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ color: 'var(--fg-secondary)' }}
                  >
                    <span>{l.label}</span>
                    {l.isNew ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                      >
                        <IconSparkles size={10} />
                        Nuevo
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
