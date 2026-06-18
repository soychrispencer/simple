'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@simple/ui/theme';
import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import {
    IconBell, IconSun, IconMoon, IconUser, IconPlus, IconLogout, IconSparkles, IconMenu2, IconX, IconMessage, IconChevronDown,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { BrandLogo } from '@simple/ui/brand';
import { PanelButton } from '@simple/ui/panel';

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
  type: 'message_thread' | 'activity';
  title: string;
  time: string;
  href: string;
  createdAt: number;
  /** Etiqueta corta opcional (p. ej. Serenatas: tipo de alerta). */
  categoryLabel?: string;
};

function notificationListIcon(type: PanelNotification['type']) {
  if (type === 'message_thread') return IconMessage;
  return IconSparkles;
}

function HeaderAccountAvatar({
  avatar,
  name,
  sizeClass = 'h-8 w-8 rounded-[10px]',
  bordered = true,
}: {
  avatar?: string | null;
  name: string;
  sizeClass?: string;
  bordered?: boolean;
}) {
  const borderClass = bordered ? 'border border-[var(--border)]' : '';
  if (avatar) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--bg-subtle)] ${borderClass} ${sizeClass}`}>
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-[var(--bg-subtle)] text-[var(--fg-secondary)] ${borderClass} ${sizeClass}`}>
      <IconUser size={16} stroke={1.9} />
    </span>
  );
}

/** Evita que overflow-x del layout recorte popovers en móvil (fixed bajo el header). */
const HEADER_POPOVER_MOBILE =
  'max-md:fixed max-md:inset-x-3 max-md:top-[calc(4rem+env(safe-area-inset-top,0px))] max-md:w-auto';
const HEADER_POPOVER_DESKTOP = 'md:absolute md:right-0 md:top-[calc(100%+8px)]';
const MOBILE_ACCOUNT_POPOVER_TOP = 'calc(4.75rem + env(safe-area-inset-top, 0px))';

export type MarketplacePublicLinkItem = {
  href: string;
  label: string;
  description?: string;
};

export type MarketplacePublicLink = {
  href: string;
  label: string;
  isNew?: boolean;
  items?: MarketplacePublicLinkItem[];
};

function isPublicLinkActive(pathname: string, link: MarketplacePublicLink): boolean {
  if (link.items?.length) {
    return link.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export type MarketplaceHeaderProps = {
  brandAppId: 'simpleautos' | 'simplepropiedades' | 'simpleserenatas' | 'simpleadmin' | 'simpleagenda';
  publicLinks: MarketplacePublicLink[];
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
  /** Contenido central opcional. Si se entrega, reemplaza la navegación pública en desktop. */
  centerSlot?: ReactNode;
  /** Acciones personalizadas opcionales a la derecha. Si se entrega, reemplaza el bloque por defecto. */
  rightSlot?: ReactNode;
  /** Contenido opcional para el menú hamburguesa mobile. */
  renderMobileMenu?: (closeMenu: () => void) => ReactNode;
  /** Slot opcional para notificaciones cuando una vertical ya tiene su propio flujo. */
  notificationSlot?: ReactNode;
  /** Acción principal del header autenticado. Defaults: Publicar -> /panel/publicar. */
  primaryActionLabel?: string;
  primaryActionHref?: string;
  primaryActionIcon?: ComponentType<{ size?: number; stroke?: number }>;
  showPrimaryAction?: boolean;
  /** Si se define, reemplaza `logout` de useAuth (p. ej. redirigir al inicio). */
  onLogout?: () => void | Promise<void>;
  /** Al abrir una notificación (p. ej. marcar como leída). */
  onNotificationOpened?: (notification: PanelNotification) => void | Promise<void>;
  /** Acción "Marcar todas como leídas" en el dropdown. */
  onMarkAllNotificationsRead?: () => void | Promise<void>;
  /** Prefetch de Next en enlaces del panel (desactivar reduce ruido RSC en Serenatas). */
  panelLinkPrefetch?: boolean;
};

export function MarketplaceHeader({
  brandAppId,
  publicLinks,
  getPanelNavItems,
  isPanelNavActive,
  fetchPanelNotifications,
  savedListings,
  homeHref = '/',
  centerSlot,
  rightSlot,
  renderMobileMenu,
  notificationSlot,
  primaryActionLabel = 'Publicar',
  primaryActionHref = '/panel/publicar',
  primaryActionIcon: PrimaryActionIcon = IconPlus,
  showPrimaryAction = true,
  onLogout,
  onNotificationOpened,
  onMarkAllNotificationsRead,
  panelLinkPrefetch = true,
}: MarketplaceHeaderProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [publicNavOpen, setPublicNavOpen] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const publicNavRef = useRef<HTMLDivElement | null>(null);
  const { user, isLoggedIn, requireAuth, logout: authLogout, openAuth } = useAuth();
  const logout = onLogout ?? authLogout;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setIsSmallViewport(window.matchMedia('(max-width: 767px)').matches);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setNotificationsOpen(false);
    setPublicNavOpen(null);
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
    if (notificationSlot || !isLoggedIn) {
      setNotifications([]);
      return;
    }
    const run = async () => {
      const items = await fetchPanelNotifications();
      if (!active) return;
      setNotifications(items);
    };
    void run();
    const onRefresh = () => {
      void run();
    };
    window.addEventListener('simple:panel-notifications-changed', onRefresh);
    return () => {
      active = false;
      window.removeEventListener('simple:panel-notifications-changed', onRefresh);
    };
  }, [isLoggedIn, pathname, fetchPanelNotifications, notificationSlot]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
      if (!publicNavRef.current?.contains(target)) setPublicNavOpen(null);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const handlePrimaryAction = () => {
    if (requireAuth(() => router.push(primaryActionHref))) {
      router.push(primaryActionHref);
    }
  };

  const role: MarketplacePanelRole = user?.role ?? 'user';
  const panelItems = useMemo(() => getPanelNavItems(role), [getPanelNavItems, role]);
  const userName = user?.name?.trim() || 'Usuario';
  const userAvatar = user?.avatar ?? null;
  const unreadNotifications = notifications.length;
  const accountPopoverStyle: CSSProperties = isSmallViewport
    ? {
        position: 'fixed',
        top: MOBILE_ACCOUNT_POPOVER_TOP,
        left: '0.75rem',
        right: '0.75rem',
        width: 'auto',
        maxHeight: 'calc(100dvh - 6rem)',
        overflowY: 'auto',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 'min(290px, calc(100vw - 1rem))',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      };
  const menuPopoverStyle: CSSProperties = isSmallViewport
    ? {
        position: 'fixed',
        top: MOBILE_ACCOUNT_POPOVER_TOP,
        left: '0.75rem',
        right: '0.75rem',
        width: 'auto',
        maxHeight: 'calc(100dvh - 6rem)',
        overflowY: 'auto',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 'min(290px, calc(100vw - 1rem))',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      };

  return (
    <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="container-app flex items-center justify-between h-16">
        <Link href={homeHref} className="flex items-center gap-2 group shrink-0">
          <BrandLogo appId={brandAppId} />
        </Link>

        {centerSlot ? (
          <div className="flex min-w-0 flex-1 justify-center px-2">
            <div className="flex min-w-0 items-center justify-center">
              {centerSlot}
            </div>
          </div>
        ) : (
          <nav className="hidden md:flex items-center gap-1" ref={publicNavRef}>
            {publicLinks.map((l) => {
              const active = isPublicLinkActive(pathname, l);
              if (l.items?.length) {
                const open = publicNavOpen === l.href;
                return (
                  <div key={l.href} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setPublicNavOpen((prev) => (prev === l.href ? null : l.href));
                        setAccountOpen(false);
                        setNotificationsOpen(false);
                        setMenuOpen(false);
                      }}
                      className="header-nav-link inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-button transition-colors duration-200"
                      data-active={active ? 'true' : 'false'}
                      aria-expanded={open}
                      aria-haspopup="menu"
                    >
                      <span>{l.label}</span>
                      <IconChevronDown size={14} stroke={2} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open ? (
                      <div
                        role="menu"
                        className="absolute left-0 top-[calc(100%+8px)] z-[60] min-w-[15rem] rounded-xl border p-1.5 animate-slide-down"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                      >
                        {l.items.map((item) => {
                          const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              role="menuitem"
                              onClick={() => setPublicNavOpen(null)}
                              className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
                              style={{ background: itemActive ? 'var(--bg-subtle)' : 'transparent' }}
                            >
                              <span className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.label}</span>
                              {item.description ? (
                                <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>{item.description}</span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
              <Link
                key={l.href}
                href={l.href}
                className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-button transition-colors duration-200"
                data-active={active ? 'true' : 'false'}
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
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2" style={{ minWidth: rightSlot ? 'auto' : '120px', justifyContent: 'flex-end' }}>
          {rightSlot ? (
            <div className="flex items-center gap-2">{rightSlot}</div>
          ) : (
            <>
          {isLoggedIn && notificationSlot ? notificationSlot : null}

          {isLoggedIn && !notificationSlot && (
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
                  className={`z-[60] rounded-xl border p-3 animate-slide-down ${HEADER_POPOVER_MOBILE} ${HEADER_POPOVER_DESKTOP} md:w-[min(380px,calc(100vw-1.5rem))]`}
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 py-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                      Notificaciones
                    </p>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {unreadNotifications} sin leer
                    </span>
                  </div>
                  <div className="max-h-[min(65dvh,28rem)] space-y-1.5 overflow-y-auto overscroll-contain px-0.5">
                    {notifications.length === 0 ? (
                      <div className="rounded-lg px-3 py-5 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                        Sin novedades por ahora.
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const ItemIcon = notificationListIcon(item.type);
                        return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={panelLinkPrefetch}
                          onClick={() => {
                            void onNotificationOpened?.(item);
                            setNotificationsOpen(false);
                          }}
                          className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <span
                            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                          >
                            <ItemIcon size={17} stroke={1.75} />
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            {item.categoryLabel ? (
                              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                {item.categoryLabel}
                              </p>
                            ) : null}
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                              {item.title}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                              {item.time}
                            </p>
                          </span>
                        </Link>
                        );
                      })
                    )}
                  </div>
                  {onMarkAllNotificationsRead && notifications.length > 0 ? (
                    <div className="mt-2 border-t border-[var(--border)] pt-2">
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
                        onClick={() => {
                          void onMarkAllNotificationsRead();
                          setNotificationsOpen(false);
                        }}
                      >
                        Marcar todas como leídas
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="header-icon-chip"
              aria-label="Cambiar tema"
            >
              {resolvedTheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
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
                className="header-icon-chip overflow-hidden"
                aria-label="Panel de usuario"
                aria-expanded={accountOpen}
              >
                <HeaderAccountAvatar avatar={userAvatar} name={userName} sizeClass="h-full w-full rounded-[10px]" bordered={false} />
              </button>

              {accountOpen && (
                <div
                  className="z-[60] rounded-xl border p-2 animate-slide-down"
                  style={accountPopoverStyle}
                >
                  <div className="mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
                    <HeaderAccountAvatar avatar={userAvatar} name={userName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>
                        {userName}
                      </p>
                      <p className="truncate text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <nav className="space-y-1" aria-label="Navegación de panel">
                    {panelItems.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isPanelNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={panelLinkPrefetch}
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

          {showPrimaryAction ? (
          <div className="hidden md:flex">
            {isLoggedIn ? (
              <PanelButton onClick={handlePrimaryAction} variant="primary" size="sm" className="h-9 px-4 text-sm">
                <PrimaryActionIcon size={13} /> {primaryActionLabel}
              </PanelButton>
            ) : (
              <div className="flex items-center gap-2">
                <PanelButton onClick={() => openAuth('login')} variant="secondary" size="sm" className="h-9 px-4 text-sm">
                  Iniciar sesión
                </PanelButton>
                <PanelButton onClick={() => openAuth('register')} variant="primary" size="sm" className="h-9 px-4 text-sm">
                  Registrarse
                </PanelButton>
              </div>
            )}
          </div>
          ) : null}

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
                className="z-[60] rounded-xl border p-2 animate-slide-down"
                style={menuPopoverStyle}
              >
                {renderMobileMenu ? (
                  renderMobileMenu(() => setMenuOpen(false))
                ) : (
                  <>
                {isLoggedIn && showPrimaryAction ? (
                  <PanelButton
                    onClick={() => {
                      setMenuOpen(false);
                      handlePrimaryAction();
                    }}
                    variant="primary"
                    className="w-full h-10 text-sm mb-2"
                  >
                    <PrimaryActionIcon size={14} /> {primaryActionLabel}
                  </PanelButton>
                ) : !isLoggedIn ? (
                  <div className="mb-2 grid gap-2">
                    <PanelButton
                      onClick={() => {
                        setMenuOpen(false);
                        openAuth('login');
                      }}
                      variant="secondary"
                      className="w-full h-10 text-sm"
                    >
                      Iniciar sesión
                    </PanelButton>
                    <PanelButton
                      onClick={() => {
                        setMenuOpen(false);
                        openAuth('register');
                      }}
                      variant="primary"
                      className="w-full h-10 text-sm"
                    >
                      Registrarse
                    </PanelButton>
                  </div>
                ) : null}

                <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />

                {publicLinks.map((l) => {
                  if (l.items?.length) {
                    return (
                      <div key={l.href} className="py-1">
                        <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                          {l.label}
                        </p>
                        {l.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex flex-col gap-0.5 rounded-button px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                            style={{ color: 'var(--fg-secondary)' }}
                          >
                            <span className="font-medium" style={{ color: 'var(--fg)' }}>{item.label}</span>
                            {item.description ? (
                              <span className="text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>{item.description}</span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    );
                  }

                  return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-button px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
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
                  );
                })}
                  </>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
