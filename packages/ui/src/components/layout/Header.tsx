"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  IconSun,
  IconMoon,
  IconPlus,
  IconUser,
  IconCurrencyDollar,
  IconLayoutDashboard,
  IconCalendarTime,
  IconGavel,
  IconCrown,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconBell,
  IconMenu,
  IconX,
  IconHome,
  IconCar,
  IconBuilding,
  IconShoppingBag,
  IconChefHat,
  IconMessageCircle,
  IconPlugConnected,
  IconBookmark,
} from "@tabler/icons-react";
import {
  Button,
  CircleButton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  FormSelect,
} from "../ui";
import { type VerticalName } from "@simple/config";
import type { HeaderUser, HeaderUserPermissions } from "@simple/shared-types";
import { useOptionalAuth } from "@simple/auth";
import { useAvatarUrl } from "../../lib/storage";
import { cn } from "../../lib/cn";
import type { PanelManifest, PanelModuleStatus, PanelSidebarItem } from "../panel/panelManifest";
import { useVerticalContext } from "../panel/useVerticalContext";
import { getPanelIcon } from "../panel/panelIconMap";
import { useDisplayCurrency } from "../../context/DisplayCurrencyContext";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
}

export interface BrandLogoConfig {
  light?: string;
  dark?: string;
  color?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface HeaderProps {
  vertical: VerticalName;
  user?: HeaderUser | null;
  loading?: boolean;
  navItems?: NavItem[];
  onAuthClick?: () => void;
  onLogout?: () => Promise<void>;
  onPublishClick?: () => void;
  showPublishButton?: boolean;
  showAuthButton?: boolean;
  rightActions?: React.ReactNode;
  showNotifications?: boolean;
  panelManifest?: PanelManifest;
  AuthModalComponent?: React.ComponentType<{ open: boolean; mode?: string; onClose: () => void }>;
  NotificationComponent?: React.ComponentType;
  getAvatarUrl?: (user: HeaderUser | null) => string;
  brandLogo?: BrandLogoConfig;
}

export function Header({
  vertical,
  user,
  loading = false,
  navItems: customNavItems,
  onAuthClick,
  onLogout,
  onPublishClick,
  showPublishButton = true,
  showAuthButton = true,
  rightActions,
  showNotifications = true,
  panelManifest,
  AuthModalComponent,
  NotificationComponent,
  getAvatarUrl,
  brandLogo,
}: HeaderProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [brandLogoLoadError, setBrandLogoLoadError] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const auth = useOptionalAuth();
  const autoAvatarResolver = useAvatarUrl();
  const resolvedGetAvatarUrl = useMemo(
    () => getAvatarUrl ?? autoAvatarResolver,
    [getAvatarUrl, autoAvatarResolver]
  );

  const brandIcons: Record<VerticalName, React.ReactNode> = {
    admin: <IconLayoutDashboard size={22} stroke={1.8} className="text-primary" />,
    autos: <IconCar size={22} stroke={1.8} className="text-primary" />,
    properties: <IconBuilding size={22} stroke={1.8} className="text-primary" />,
    stores: <IconShoppingBag size={22} stroke={1.8} className="text-primary" />,
    food: <IconChefHat size={22} stroke={1.8} className="text-primary" />,
  };

  const brandNameParts: Record<VerticalName, { prefix: string; suffix: string }> = {
    admin: { prefix: "Simple", suffix: "Admin" },
    autos: { prefix: "Simple", suffix: "Autos" },
    properties: { prefix: "Simple", suffix: "Propiedades" },
    stores: { prefix: "Simple", suffix: "Tiendas" },
    food: { prefix: "Simple", suffix: "Food" },
  };
  const defaultNavItems: Record<VerticalName, NavItem[]> = {
    admin: [
      { label: "SimpleAutos", href: "/autos", icon: IconCar },
      { label: "SimplePropiedades", href: "/properties", icon: IconBuilding },
      { label: "SimpleTiendas", href: "/stores", icon: IconShoppingBag },
      { label: "SimpleFood", href: "/food", icon: IconChefHat },
    ],
    autos: [
      { label: "Ventas", href: "/ventas", icon: IconCar },
      { label: "Arriendos", href: "/arriendos", icon: IconCalendarTime },
      { label: "Subastas", href: "/subastas", icon: IconGavel },
      { label: "Servicios", href: "/servicios", icon: IconPlugConnected },
    ],
    properties: [
      { label: "Comprar", href: "/ventas", icon: IconBuilding },
      { label: "Proyectos", href: "/proyectos", icon: IconBuilding },
      { label: "Arrendar", href: "/arriendos", icon: IconCalendarTime },
      { label: "Servicios", href: "/servicios", icon: IconPlugConnected },
    ],
    stores: [
      { label: "Productos", href: "/productos", icon: IconShoppingBag },
      { label: "Servicios", href: "/servicios", icon: IconPlugConnected },
    ],
    food: [
      { label: "Restaurantes", href: "/restaurantes", icon: IconChefHat },
    ],
  };

  const navItems = customNavItems || defaultNavItems[vertical];
  const brandLogoSrc = useMemo(() => {
    if (!brandLogo) return null;
    if (!themeMounted) return brandLogo.color || brandLogo.light || brandLogo.dark || null;
    return resolvedTheme === "dark"
      ? (brandLogo.dark || brandLogo.color || brandLogo.light || null)
      : (brandLogo.light || brandLogo.color || brandLogo.dark || null);
  }, [brandLogo, themeMounted, resolvedTheme]);
  const brandLogoAlt =
    brandLogo?.alt ?? `${brandNameParts[vertical].prefix}${brandNameParts[vertical].suffix}`;

  useEffect(() => {
    const setHeaderHeight = () => {
      const el = headerRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      document.documentElement.style.setProperty("--header-height", `${h}px`);
    };
    setHeaderHeight();
    window.addEventListener("resize", setHeaderHeight);
    return () => window.removeEventListener("resize", setHeaderHeight);
  }, []);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    setBrandLogoLoadError(false);
  }, [brandLogoSrc]);

  const toggleTheme = () => {
    if (!themeMounted) return;
    const isDark = resolvedTheme === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  const handleAuthClick = () => {
    if (onAuthClick) {
      onAuthClick();
    } else if (AuthModalComponent) {
      setShowAuth(true);
    } else if (auth?.openAuthModal) {
      auth.openAuthModal("login");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
  };

  const handlePublish = () => {
    if (onPublishClick) {
      onPublishClick();
    } else if (user) {
      router.push(publishHref);
    } else {
      handleAuthClick();
    }
  };

  const publishButtonText: Record<VerticalName, { full: string; short: string }> = {
    admin: { full: "Acción", short: "Acción" },
    autos: { full: "Publicar Vehículo", short: "Publicar" },
    properties: { full: "Publicar Propiedad", short: "Publicar" },
    stores: { full: "Publicar Producto", short: "Publicar" },
    food: { full: "Publicar Restaurante", short: "Publicar" },
  };
  const publishLabel = publishButtonText[vertical].full;
  const publishRoutes: Partial<Record<VerticalName, string>> = {
    admin: "/",
    autos: "/panel/publicar-vehiculo?new=1",
    properties: "/panel/nueva-publicacion",
    stores: "/panel/nueva-publicacion",
    food: "/panel/nueva-publicacion",
  };
  const publishHref = publishRoutes[vertical] ?? "/panel/nueva-publicacion";
  const panelLabel = "Panel";

  return (
    <>
      <header ref={headerRef} className="w-full relative z-[100] bg-transparent shadow-none">
        <div className="w-full px-4 md:px-8 py-1 bg-transparent">
          <div className="relative w-full h-[56px] md:h-[64px] flex items-center px-4 gap-4">
            <Link
              href="/"
              className="flex items-center gap-0.5 z-10 ml-1 md:ml-2 link-base link-plain"
            >
              {brandLogoSrc && !brandLogoLoadError ? (
                <>
                  <Image
                    src={brandLogoSrc}
                    alt={brandLogoAlt}
                    width={brandLogo?.width ?? 48}
                    height={brandLogo?.height ?? 48}
                    className="h-12 w-12 object-contain shrink-0"
                    priority
                    onError={() => setBrandLogoLoadError(true)}
                  />
                  <span className="select-none type-brand text-lighttext dark:text-darktext whitespace-nowrap">
                    <span className="font-normal tracking-tight">{brandNameParts[vertical].prefix}</span>
                    <span className="font-bold tracking-tight">{brandNameParts[vertical].suffix}</span>
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="flex items-center justify-center w-12 h-12 rounded-full shadow-card bg-[var(--field-bg)] ring-1 ring-[var(--field-border)]"
                  >
                    <span className="flex items-center justify-center" aria-hidden>
                      {brandIcons[vertical]}
                    </span>
                  </span>
                  <span className="select-none type-brand text-lighttext dark:text-darktext whitespace-nowrap">
                    <span className="font-normal tracking-tight">{brandNameParts[vertical].prefix}</span>
                    <span className="font-bold tracking-tight">{brandNameParts[vertical].suffix}</span>
                  </span>
                </>
              )}
            </Link>

              <nav className="hidden lg:flex gap-6 absolute left-0 right-0 justify-center pointer-events-none">
                <div className="flex gap-6 pointer-events-auto">
                  {navItems.map((item) => (
                    (() => {
                      const currentPath = pathname ?? "";
                      const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                      return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "text-[var(--text-primary)] text-[0.98rem] font-medium tracking-tight transition-colors duration-200 flex items-center gap-2 hover:text-primary",
                        isActive && "text-primary"
                      )}
                    >
                      <item.icon size={18} stroke={1.5} />
                      {item.label}
                    </Link>
                      );
                    })()
                  ))}
                </div>
              </nav>
            <div className="flex items-center gap-2 md:gap-3 z-10 ml-auto">
              <div className="hidden md:contents">
                {!loading && user && showNotifications && (
                  NotificationComponent ? (
                    <NotificationComponent />
                  ) : (
                    <CircleButton aria-label="Notificaciones" size={40} variant="default">
                      <IconBell size={20} stroke={1} className="align-middle" />
                    </CircleButton>
                  )
                )}

                {vertical === 'autos' ? <CurrencyToggle /> : null}

                <ThemeToggle />
              </div>

              {!loading && user ? (
                <UserMenu
                  user={user}
                  logout={handleLogout}
                  getAvatarUrl={resolvedGetAvatarUrl}
                  vertical={vertical}
                  onPublishClick={handlePublish}
                  publishLabel={publishLabel}
                  panelManifest={panelManifest}
                />
              ) : (
                showAuthButton ? (
                  <CircleButton aria-label="Iniciar sesión" onClick={handleAuthClick} size={40} variant="default">
                    <IconUser size={20} stroke={1} className="align-middle" />
                  </CircleButton>
                ) : null
              )}

              <div className="hidden md:contents">{rightActions}</div>

              <CircleButton
                aria-label="Menú"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                size={40}
                className="lg:hidden"
              >
                {showMobileMenu ? <IconX size={20} stroke={1} /> : <IconMenu size={20} stroke={1} />}
              </CircleButton>

              {showPublishButton && (
                <Button
                  onClick={handlePublish}
                  variant="primary"
                  size="md"
                  className="group hidden md:flex items-center gap-2 px-4 py-2 shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <span className="relative flex items-center">
                    <IconPlus size={20} className="mr-1 transition-transform group-hover:rotate-180 duration-500" />
                    <span className="hidden sm:inline">{publishButtonText[vertical].full}</span>
                    <span className="sm:hidden">{publishButtonText[vertical].short}</span>
                  </span>
                </Button>
              )}
            </div>
          </div>

          {showMobileMenu && (
            <div className="lg:hidden mt-2 rounded-2xl bg-lightcard dark:bg-darkcard shadow-card border border-lightborder/70 dark:border-darkborder/50 overflow-visible animate-fadeInSlide">
              <nav className="p-4">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    (() => {
                      const currentPath = pathname ?? "";
                      const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                      return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-[var(--text-primary)] rounded-lg transition-colors duration-200 hover:text-primary hover:bg-[var(--field-bg-hover)]",
                        isActive && "text-primary"
                      )}
                    >
                      <item.icon size={20} stroke={1.5} />
                      <span className="type-body-md font-medium">{item.label}</span>
                    </Link>
                      );
                    })()
                  ))}
                </div>

                {!loading && user && (
                  <>
                    <div className="h-px my-4 bg-lightborder/50 dark:bg-darkborder/40" />
                    <div className="space-y-2">
                      <Link
                        href="/panel"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[var(--text-primary)] rounded-lg transition-colors duration-200 hover:text-primary hover:bg-[var(--field-bg-hover)]"
                      >
                        <IconLayoutDashboard size={20} stroke={1.5} />
                        <span className="type-body-md font-medium">{panelLabel}</span>
                      </Link>
                    </div>
                  </>
                )}

                <div className="h-px my-4 bg-lightborder/50 dark:bg-darkborder/40" />

                <div className="space-y-2">
                  {showPublishButton && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        handlePublish();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-primary)] rounded-lg transition-colors duration-200 hover:text-primary hover:bg-[var(--field-bg-hover)]"
                    >
                      <IconPlus size={20} stroke={1.5} />
                      <span className="type-body-md font-medium">{publishButtonText[vertical].full}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-primary)] rounded-lg transition-colors duration-200 hover:text-primary hover:bg-[var(--field-bg-hover)]"
                    >
                    {(themeMounted && resolvedTheme === "dark") ? (
                      <IconSun size={20} stroke={1.5} />
                    ) : (
                      <IconMoon size={20} stroke={1.5} />
                    )}
                    <span className="type-body-md font-medium">Tema</span>
                  </button>

                  {vertical === "autos" ? (
                    <div className="px-4 py-3 text-[var(--text-primary)] rounded-lg bg-lightbg/60 dark:bg-darkbg/40">
                      <div className="flex items-center gap-3">
                        <IconCurrencyDollar size={20} stroke={1.5} />
                        <span className="type-body-md font-medium">Moneda</span>
                      </div>
                      <div className="mt-2">
                        <MobileCurrencyPicker onSelected={() => setShowMobileMenu(false)} />
                      </div>
                    </div>
                  ) : null}

                  {!loading && user && showNotifications && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-[var(--text-primary)] rounded-lg bg-lightbg/60 dark:bg-darkbg/40">
                      <div className="flex items-center gap-3">
                        <IconBell size={20} stroke={1.5} />
                        <span className="type-body-md font-medium">Notificaciones</span>
                      </div>
                      {NotificationComponent ? (
                        <NotificationComponent />
                      ) : (
                        <CircleButton aria-label="Notificaciones" size={40} variant="default">
                          <IconBell size={20} stroke={1} className="align-middle" />
                        </CircleButton>
                      )}
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {AuthModalComponent && (
        <AuthModalComponent open={showAuth} mode="login" onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <CircleButton aria-label="Alternar modo oscuro" onClick={handleToggle} size={40}>
      {mounted && (isDark ? <IconMoon size={20} stroke={1} /> : <IconSun size={20} stroke={1} />)}
    </CircleButton>
  );
}

function CurrencyToggle() {
  const { currency, setCurrency } = useDisplayCurrency();

  const dropdownHoverNoBgClass = "hover:text-primary hover:bg-[var(--field-bg-hover)]";

  const options = useMemo(
    () => [
      { code: "CLP" as const, symbol: "$", name: "Peso chileno", badge: "CL" },
      { code: "USD" as const, symbol: "US$", name: "Dólar estadounidense", badge: "US" },
    ],
    []
  );

  return (
    <Dropdown placement="bottom-center">
      <div className="relative flex items-center">
        <DropdownTrigger asChild>
          <CircleButton aria-label={`Moneda: ${currency}`} size={40} variant="default">
            <IconCurrencyDollar size={20} stroke={1} className="align-middle" />
          </CircleButton>
        </DropdownTrigger>

        <DropdownMenu className="w-56 mt-1">
          <DropdownLabel className="px-4 pt-3 pb-2">Moneda</DropdownLabel>
          {options.map((opt) => {
            const isActive = currency === opt.code;

            return (
              <DropdownItem
                key={opt.code}
                leftIcon={
                  <span
                    className="w-7 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold leading-none bg-[var(--field-bg)] border border-lightborder/40 dark:border-darkborder/30 text-current"
                    aria-hidden
                  >
                    {opt.badge}
                  </span>
                }
                className={
                  isActive
                    ? "text-primary bg-[var(--color-primary-a10)]"
                    : dropdownHoverNoBgClass
                }
                onClick={() => setCurrency(opt.code)}
                aria-pressed={isActive}
              >
                {opt.symbol} {opt.name}
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </div>
    </Dropdown>
  );
}

function MobileCurrencyPicker({ onSelected }: { onSelected?: () => void }) {
  const { currency, setCurrency } = useDisplayCurrency();

  const options = [
    { value: "CLP", label: "$ Peso chileno (CLP)" },
    { value: "USD", label: "US$ Dólar estadounidense (USD)" },
  ];

  return (
    <FormSelect
      options={options}
      value={currency}
      onChange={(value) => {
        const next = String(value) === "USD" ? "USD" : "CLP";
        setCurrency(next);
        onSelected?.();
      }}
      appearance="filled"
      shape="rounded"
      size="md"
      menuVariant="inline"
    />
  );
}

interface UserMenuProps {
  user: HeaderUser;
  logout: () => Promise<void>;
  getAvatarUrl?: (user: HeaderUser | null) => string;
  vertical: VerticalName;
  onPublishClick: () => void;
  publishLabel: string;
  panelManifest?: PanelManifest;
}

function UserMenu({ user, logout, getAvatarUrl, vertical, onPublishClick, publishLabel, panelManifest }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);

  const dropdownHoverNoBgClass = "hover:text-primary hover:bg-[var(--field-bg-hover)]";

  const { currentCompany } = useVerticalContext(vertical);
  const permissions = (currentCompany?.permissions ?? null) as HeaderUserPermissions | null;

  const hiddenStatuses: PanelModuleStatus[] = ["planned", "deprecated"];

  function hasPermission(required: string | undefined) {
    if (!required) return true;
    if (!permissions) return false;

    if (permissions[required] === true) {
      return true;
    }

    const [resource, action] = required.split(":");
    if (!resource || !action) {
      return false;
    }

    const bucket = permissions[resource];
    if (!bucket) return false;
    if (bucket === true) return true;

    if (Array.isArray(bucket)) {
      return bucket.includes(action);
    }

    if (typeof bucket === "object") {
      const bucketRecord = bucket as Record<string, unknown>;
      if (bucketRecord[action] === true) return true;
      const actions = bucketRecord.actions;
      if (Array.isArray(actions)) {
        return actions.includes(action);
      }
    }

    return false;
  }

  function shouldDisplayItem(item: PanelSidebarItem) {
    if (item.status && hiddenStatuses.includes(item.status)) {
      return false;
    }
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  }

  function isActivePath(currentPath: string, href: string, isRootPanel: boolean) {
    const hrefPath = href.split(/[?#]/)[0] ?? href;
    if (isRootPanel) {
      return currentPath === hrefPath;
    }
    return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
  }

  const manifestSections = React.useMemo(() => {
    if (!panelManifest) return [];
    return panelManifest.sidebar
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => shouldDisplayItem(item)),
      }))
      .filter((section) => section.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- permissions are captured via shouldDisplayItem
  }, [panelManifest, permissions]);

  const DefaultMenuIcon = {
    admin: IconLayoutDashboard,
    autos: IconCar,
    properties: IconBuilding,
    stores: IconShoppingBag,
    food: IconChefHat,
  }[vertical];

  const avatarSrc = getAvatarUrl ? getAvatarUrl(user) : undefined;

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  const displayName = React.useMemo(() => {
    const asTrimmedString = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const firstToken = (value: unknown): string | null => {
      const str = asTrimmedString(value);
      if (!str) return null;
      const [first] = str.split(/\s+/);
      return first || null;
    };

    const candidates: Array<string | null> = [
      // Solo primer nombre (sin last_name)
      firstToken(user?.first_name),
      firstToken(user?.profile?.first_name),
      // Campos directos (variantes históricas)
      firstToken(user?.public_name),
      firstToken(user?.nombre),
      firstToken(user?.name),
      // backend legado: metadata típica
      firstToken(user?.user_metadata?.first_name),
      firstToken(user?.user_metadata?.full_name),
      firstToken(user?.user_metadata?.name),
      firstToken(user?.user_metadata?.nombre),
      firstToken(user?.user_metadata?.display_name),
      // Public profile (si existe)
      firstToken(user?.public_profile?.full_name),
      firstToken(user?.public_profile?.name),
    ];

    return candidates.find((value) => Boolean(value)) ?? null;
  }, [user]);

  const goTo = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const renderManifestSections = () =>
    manifestSections.map((section, sectionIndex) => (
      <React.Fragment key={section.id}>
        {(() => {
          const isSummarySection = section.items.length === 1 && section.items[0]?.href === "/resumen";
          if (isSummarySection) return null;
          if (!section.title) return null;
          return <DropdownLabel className="px-4 pb-2">{section.title}</DropdownLabel>;
        })()}
        {section.items.map((item) => {
          const IconComponent = getPanelIcon(item.icon);
          const currentPath = pathname ?? "";
          const isRootPanel = item.href === "/resumen";
          const isActive = isActivePath(currentPath, item.href, isRootPanel);

          const leftIcon = <IconComponent size={18} stroke={1.5} className="text-current" />;

          return (
            <DropdownItem
              key={item.id}
              className={
                isActive
                  ? "text-primary bg-[var(--color-primary-a10)] hover:bg-[var(--color-primary-a10)]"
                  : dropdownHoverNoBgClass
              }
              leftIcon={leftIcon}
              onClick={() => goTo(item.href)}
            >
              {item.label}
            </DropdownItem>
          );
        })}
        {sectionIndex < manifestSections.length - 1 && <DropdownSeparator />}
      </React.Fragment>
    ));

  const renderFallbackSections = () => {
    const fallbackListingsHref: Record<VerticalName, string> = {
      admin: "/",
      autos: "/panel/mis-publicaciones",
      properties: "/panel/publicaciones",
      stores: "/panel/publicaciones",
      food: "/panel/publicaciones",
    };

    return (
      <>
        <DropdownLabel className="px-4 pb-2">Resumen</DropdownLabel>
        <DropdownItem
          className={
            (pathname ?? "") === "/resumen"
              ? "text-primary bg-[var(--color-primary-a10)] hover:bg-[var(--color-primary-a10)]"
              : dropdownHoverNoBgClass
          }
          leftIcon={<IconLayoutDashboard size={18} stroke={1.5} />}
          onClick={() => goTo("/resumen")}
        >
          Resumen
        </DropdownItem>
        <DropdownItem
          className={
            (pathname ?? "") === "/panel/perfil" || (pathname ?? "").startsWith("/panel/perfil/")
              ? "text-primary bg-[var(--color-primary-a10)] hover:bg-[var(--color-primary-a10)]"
              : dropdownHoverNoBgClass
          }
          leftIcon={<IconUser size={18} stroke={1.5} />}
          onClick={() => goTo("/panel/perfil")}
        >
          Mi Perfil
        </DropdownItem>
        <DropdownItem
          className={
            (pathname ?? "") === (fallbackListingsHref[vertical] ?? "/panel/publicaciones") ||
            (pathname ?? "").startsWith(`${fallbackListingsHref[vertical] ?? "/panel/publicaciones"}/`)
              ? "text-primary bg-[var(--color-primary-a10)] hover:bg-[var(--color-primary-a10)]"
              : dropdownHoverNoBgClass
          }
          leftIcon={<DefaultMenuIcon size={18} stroke={1.5} />}
          onClick={() => goTo(fallbackListingsHref[vertical] ?? "/panel/publicaciones")}
        >
          Publicaciones
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem className={`text-primary ${dropdownHoverNoBgClass}`} leftIcon={<IconPlus size={18} stroke={1.5} />} onClick={onPublishClick}>
          {publishLabel}
        </DropdownItem>
      </>
    );
  };

  React.useEffect(() => {
    // Close menu on route change (page/tab selection)
    setMenuOpen(false);
  }, [pathname]);

  return (
    <Dropdown open={menuOpen} onOpenChange={setMenuOpen}>
      <div id="user-menu" className="relative flex items-center h-full">
        <DropdownTrigger asChild>
          <CircleButton aria-label="Menú de usuario" size={40} variant="default" className="relative overflow-hidden">
            {avatarSrc && !avatarLoadFailed ? (
              <Image
                src={avatarSrc}
                alt="Avatar"
                fill
                sizes="40px"
                className="object-cover object-center"
                onError={() => setAvatarLoadFailed(true)}
                priority={false}
              />
            ) : (
              <IconUser size={20} stroke={1} className="align-middle" />
            )}
          </CircleButton>
        </DropdownTrigger>

        <DropdownMenu className="w-64">
          {user && (
            <div className="px-4 py-3 border-b border-lightborder/10 dark:border-darkborder/10">
              <p className="font-semibold text-lighttext dark:text-darktext truncate">
                {displayName ? `Hola, ${displayName}.` : "Hola, Usuario."}
              </p>
              {user.username && (
                <p className="text-xs text-lighttext/60 dark:text-darktext/60 truncate">@{user.username}</p>
              )}
            </div>
          )}

          {user?.username && (
            <>
              <DropdownLabel className="px-4 pt-3 pb-2">Perfil</DropdownLabel>
              <DropdownItem
                className={
                  (pathname ?? "") === `/perfil/${user.username}`
                    ? "text-primary bg-[var(--color-primary-a10)] hover:bg-[var(--color-primary-a10)]"
                    : dropdownHoverNoBgClass
                }
                leftIcon={<IconUser size={18} stroke={1.5} />}
                onClick={() => goTo(`/perfil/${user.username}`)}
              >
                Ver Perfil Público
              </DropdownItem>
              <DropdownSeparator />
            </>
          )}
          {panelManifest ? renderManifestSections() : renderFallbackSections()}
          <DropdownSeparator />
          <DropdownItem danger leftIcon={<IconLogout size={18} stroke={1.5} />} onClick={logout}>
            Cerrar Sesión
          </DropdownItem>
        </DropdownMenu>
      </div>
    </Dropdown>
  );
}

export default Header;



