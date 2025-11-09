"use client";
import { getAvatarUrl } from "@/lib/supabaseStorage";
import { useSupabase } from "@/lib/supabase/useSupabase";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleButton } from "@/components/ui/CircleButton";
import { Button } from "@/components/ui/Button";
import { IconSun, IconMoon, IconPlus, IconUser, IconLayoutDashboard, IconCar, IconCalendarTime, IconGavel, IconCrown, IconChartBar, IconSettings, IconLogout, IconBell, IconHeart, IconMenu, IconX, IconHome } from '@tabler/icons-react';
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import Image from 'next/image';
import { useNotifications, NOTIFICATION_CONFIGS, type NotificationType } from "@/context/NotificationsContext";

const navItems = [
  { label: "Inicio", href: "/", icon: IconHome },
  { label: "Ventas", href: "/ventas", icon: IconCar },
  { label: "Arriendos", href: "/arriendos", icon: IconCalendarTime },
  { label: "Subastas", href: "/subastas", icon: IconGavel },
];

export default function Header() {
  const [showAuth, setShowAuth] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const { user, loading, signOut: logout } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    function setHeaderHeight() {
      const el = headerRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    }
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight);
    return () => window.removeEventListener('resize', setHeaderHeight);
  }, []);
  return (
    <>
      <header ref={headerRef} className="w-full bg-transparent shadow-none relative z-[100]">
        <div className="w-full px-4 md:px-8 lg:px-8 py-3">
          {/* Card wide */}
          <div className="relative w-full min-h-[64px] rounded-2xl bg-lightcard dark:bg-darkcard shadow-card flex items-center px-4">
            {/* Logo a la izquierda */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl z-10 ml-1 md:ml-2 link-base link-plain">
              <span className="flex items-center justify-center bg-primary w-9 h-9 rounded-full">
                <span className="select-none font-extrabold text-[22px] leading-[1] text-white">S</span>
              </span>
              <span className="ml-1 select-none font-bold text-xl text-black dark:text-white">
                SimpleAutos
              </span>
            </Link>

            {/* Menú centrado absoluto dentro del card */}
            <nav className="hidden lg:flex gap-6 absolute left-0 right-0 justify-center pointer-events-none">
              <div className="flex gap-6 pointer-events-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-black dark:text-white hover:text-primary dark:hover:text-primary font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  >
                    <item.icon size={18} stroke={1.5} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
            {/* Acciones a la derecha */}
            <div className="flex items-center gap-2 z-10 ml-auto">
              {/* Favoritos - Solo desktop */}
              {!loading && user && (
                <Link href="/panel/favoritos" className="hidden md:block">
                  <CircleButton
                    aria-label="Favoritos"
                    size={40}
                    variant="default"
                  >
                    <IconHeart size={20} stroke={1} className="align-middle" />
                  </CircleButton>
                </Link>
              )}
              {/* Avatar o login */}
              {!loading && user ? (
                <>
                <NotificationsBell />
                <UserMenu user={user} logout={logout} setShowAuth={setShowAuth} />
              </>
              ) : (
                <button
                  className="text-black dark:text-white hover:text-primary dark:hover:text-primary font-medium transition hover:scale-105 text-base"
                  onClick={() => setShowAuth(true)}
                >
                  Iniciar sesión
                </button>
              )}
              {/* Switch de tema */}
              <ThemeToggle />

              {/* Botón menú móvil */}
              <CircleButton
                aria-label="Menú"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                size={40}
                className="lg:hidden"
              >
                {showMobileMenu ? (
                  <IconX size={20} stroke={1} />
                ) : (
                  <IconMenu size={20} stroke={1} />
                )}
              </CircleButton>

              {/* Botón Publicar Vehículo */}
              <Button
                onClick={() => {
                  if (user) {
                    router.push('/panel/nueva-publicacion');
                  } else {
                    setShowAuth(true);
                  }
                }}
                variant="primary"
                size="md"
                className="ml-2 group flex items-center gap-2 px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="relative flex items-center">
                  <IconPlus
                    size={20}
                    className="mr-1 transition-transform group-hover:rotate-180 duration-500"
                  />
                  <span className="hidden sm:inline">Publicar Vehículo</span>
                  <span className="sm:hidden">Publicar</span>
                </span>
              </Button>
            </div>
          </div>

          {/* Menú móvil expandido */}
          {showMobileMenu && (
            <div className="lg:hidden mt-2 rounded-2xl bg-lightcard dark:bg-darkcard shadow-card border border-gray-200 dark:border-gray-700 overflow-hidden animate-fadeInSlide">
              {/* Navegación móvil */}
              <nav className="p-4">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-black dark:text-white hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200"
                    >
                      <item.icon size={20} stroke={1.5} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Enlaces adicionales para usuarios logueados */}
                {!loading && user && (
                  <>
                    <div className="h-px my-4 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-2">
                      <Link
                        href="/panel/favoritos"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-black dark:text-white hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200"
                      >
                        <IconHeart size={20} stroke={1.5} />
                        <span className="font-medium">Favoritos</span>
                      </Link>
                      <Link
                        href="/panel"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-black dark:text-white hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200"
                      >
                        <IconLayoutDashboard size={20} stroke={1.5} />
                        <span className="font-medium">Panel</span>
                      </Link>
                    </div>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
      <AuthModal open={showAuth} mode="login" onClose={() => setShowAuth(false)} />
    </>
  );
}


// Componente para alternar modo dark/light usando next-themes
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <CircleButton
      aria-label="Alternar modo oscuro"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="ml-2"
      size={40}
    >
      {mounted && (isDark ? (
        <IconMoon size={20} stroke={1} />
      ) : (
        <IconSun size={20} stroke={1} />
      ))}
    </CircleButton>
  );
}

function UserMenu({ user, logout, setShowAuth }: { user: any, logout: () => Promise<void>, setShowAuth: (show: boolean) => void }) {
  const [open, setOpen] = React.useState(false);
  const supabase = useSupabase();
  const router = useRouter();
  
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('#user-menu')) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, []);

  const handleProfileClick = () => {
    if (user?.username) {
      router.push(`/perfil/${user.username}`);
      setOpen(false);
    }
  };

  return (
    <div id="user-menu" className="relative flex items-center h-full">
      <CircleButton
        aria-label="Menú de usuario"
        onClick={() => setOpen(o => !o)}
        size={40}
        variant="default"
        className="relative"
      >
        {(user as any)?.avatar_url ? (
          <Image
            src={getAvatarUrl(supabase, (user as any).avatar_url)}
            alt="Avatar de usuario"
            fill
            sizes="40px"
            className="object-cover object-center rounded-full"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            priority={false}
          />
        ) : (
          <IconUser size={20} stroke={1} className="align-middle" />
        )}
      </CircleButton>
      {open && (
        <div className="absolute right-0 top-full w-64 rounded-xl bg-lightcard dark:bg-darkcard shadow-2xl border border-gray-200 dark:border-darkcard py-2 z-[9999] animate-fadeInSlide" style={{marginTop: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'}}>
          {/* Información del usuario */}
          {user && (
            <div className="px-4 py-3 border-b border-lightborder/10 dark:border-darkborder/10">
              <p className="font-semibold text-lighttext dark:text-darktext truncate">
                {user.public_name || user.nombre || 'Usuario'}
              </p>
              {user.username && (
                <p className="text-xs text-lighttext/60 dark:text-darktext/60 truncate">
                  @{user.username}
                </p>
              )}
            </div>
          )}

          {/* Perfil Público */}
          {user?.username && (
            <>
              <div className="px-4 pt-3 pb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Perfil</div>
              <button 
                onClick={handleProfileClick}
                className="w-full flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3"
              >
                <IconUser size={18} stroke={1.5}/>
                <span>Ver Perfil Público</span>
              </button>
              <div className="h-px my-2 bg-lightborder dark:bg-darkborder" />
            </>
          )}

          {/* Sección Panel */}
          <div className="px-4 pb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Panel</div>
          <Link href="/panel" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconLayoutDashboard size={18} stroke={1.5}/>
            <span>Panel</span>
          </Link>
          <Link href="/panel/perfil" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconUser size={18} stroke={1.5}/>
            <span>Mi Perfil</span>
          </Link>
          <Link href="/panel/publicaciones" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconCar size={18} stroke={1.5}/>
            <span>Publicaciones</span>
          </Link>
          <button
            onClick={() => {
              if (user) {
                router.push('/panel/nueva-publicacion');
              } else {
                setShowAuth(true);
              }
              setOpen(false);
            }}
            className="flex w-full px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3"
          >
            <IconPlus size={18} stroke={1.5}/>
            <span>Publicar Vehículo</span>
          </button>
          
          {/* Sección Gestión */}
          <div className="h-px my-2 bg-lightborder dark:bg-darkborder" />
          <div className="px-4 pb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gestión</div>
          <Link href="/panel/suscripcion" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconCrown size={18} stroke={1.5}/>
            <span>Suscripción</span>
          </Link>
          <Link href="/panel/estadisticas" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconChartBar size={18} stroke={1.5}/>
            <span>Estadísticas</span>
          </Link>
          <Link href="/panel/configuraciones" onClick={()=>setOpen(false)} className="flex px-4 py-2 text-sm text-lighttext dark:text-darktext hover:bg-primary/10 dark:hover:bg-primary/20 transition items-center gap-3">
            <IconSettings size={18} stroke={1.5}/>
            <span>Configuración</span>
          </Link>
          
          {/* Sección Salir */}
          <div className="h-px my-2 bg-lightborder dark:bg-darkborder" />
          <button onClick={()=>{setOpen(false);logout();}} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition flex items-center gap-3">
            <IconLogout size={18} stroke={1.5}/>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Campana con dropdown
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAll, markIds } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAll = async () => {
    await markAll();
  };

  const handleMarkOne = async (id: string) => {
    await markIds([id]);
  };

  const getNotificationConfig = (type: string) => {
    return NOTIFICATION_CONFIGS[type as NotificationType] || NOTIFICATION_CONFIGS.system;
  };

  return (
    <div ref={ref} className="relative flex items-center h-full">
      <CircleButton
        aria-label="Notificaciones"
        onClick={() => setOpen(o => !o)}
        size={40}
        variant="default"
        className="relative"
      >
        <IconBell size={20} stroke={1} className="align-middle" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </CircleButton>
      {open && (
        <div className="absolute right-0 top-full w-80 rounded-xl bg-lightcard dark:bg-darkcard shadow-2xl border border-gray-200 dark:border-darkcard py-2 z-[9999] animate-fadeInSlide" style={{marginTop: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'}}>
          <div className="px-4 py-3 border-b border-lightborder/10 dark:border-darkborder/10 flex items-center justify-between">
            <p className="font-semibold text-lighttext dark:text-darktext">Notificaciones</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-sm text-primary hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((n) => {
                const config = getNotificationConfig(n.type);
                return (
                  <div key={n.id} className={`px-4 py-3 border-b border-lightborder/5 dark:border-darkborder/5 ${!n.read ? config.bgColor : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-lg">{config.icon}</span>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${config.color}`}>{n.title || 'Notificación'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{n.body}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {!n.read && (
                        <button onClick={() => handleMarkOne(n.id)} className="ml-2 text-primary text-xs hover:underline">
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// formatType y timeAgo eliminados (no usados)
