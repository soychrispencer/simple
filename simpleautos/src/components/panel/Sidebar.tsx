"use client";
import React from "react";
// import { useAuth } from "@/context/AuthContext"; // auth no requerido hasta lógica condicional
import { usePathname } from "next/navigation";
import {
  IconChevronLeft,
  IconLayoutDashboard,
  IconUser,
  IconCar,
  IconCrown,
  IconFileInvoice,
  IconChartBar,
  IconSettings,
  IconExternalLink
} from "@tabler/icons-react";
import { IconPlus } from '@tabler/icons-react';
import Link from "next/link";
import { CircleButton } from "@/components/ui/CircleButton";

// Avatar simulado eliminado (no usado)


function getSidebarItems() { // userType removido hasta que se necesite lógica condicional
  return [
    {
      label: "Panel",
      href: "/panel",
      icon: <IconLayoutDashboard size={22} stroke={1.7} />,
      show: true,
    },
    {
  label: "Mi Perfil",
      href: "/panel/perfil",
      icon: <IconUser size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Publicaciones",
      href: "/panel/publicaciones",
      icon: <IconCar size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Publicar Vehículo",
      href: "/panel/nueva-publicacion",
      icon: <IconPlus size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Suscripción",
      href: "/panel/suscripcion",
      icon: <IconCrown size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Estadísticas",
      href: "/panel/estadisticas",
      icon: <IconChartBar size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Marketplaces",
      href: "/panel/marketplaces",
      icon: <IconExternalLink size={22} stroke={1.7} />,
      show: true,
    },
    {
      label: "Configuración",
      href: "/panel/configuraciones",
      icon: <IconSettings size={22} stroke={1.7} />,
      show: true,
    },
  ];
}

export default function Sidebar({ expanded, setExpanded }: { expanded: boolean; setExpanded: (v: boolean) => void }) {
  const pathname = usePathname();
  // auth eliminado: no se usa todavía para condicionar items
  const sidebarItems = React.useMemo(() => getSidebarItems(), []);

  return (
    <aside
      className={`ml-4 md:ml-8 mb-8 bg-white dark:bg-darkcard flex flex-col rounded-2xl shadow-card transition-all duration-200 ${expanded ? "w-56" : "w-20"} min-h-[700px] h-auto max-h-[calc(100vh-6rem)] items-center py-6 box-border`}
    >
      <div className={`w-full flex flex-col items-center`}>
        <CircleButton
          aria-label={expanded ? "Colapsar menú" : "Expandir menú"}
          onClick={() => setExpanded(!expanded)}
          size={40}
          className={`mb-6 ${expanded ? "ml-auto mr-2" : "mx-auto"}`}
        >
          <IconChevronLeft
            size={22}
            stroke={2}
            className={`transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`}
          />
        </CircleButton>
        <nav className={`flex flex-col items-center w-full ${expanded ? "gap-3" : "gap-2"} flex-1`}>
          {sidebarItems.filter((item) => item.show).map((item) => {
            const isRootPanel = item.href === "/panel";
            const isActive = isRootPanel
              ? pathname === "/panel"
              : (pathname === item.href || pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center w-full px-4 py-1 group transition-all ${!expanded ? "justify-center" : ""}`}
              >
                <CircleButton
                  aria-label={item.label}
                  size={40}
                  className={`${isActive ? '!bg-primary !text-white dark:!bg-primary' : ''}`}
                  title={item.label}
                >
                  {React.cloneElement(item.icon, {
                    size: 22,
                    stroke: 1,
                    className: isActive ? 'text-white' : 'text-black dark:text-white',
                  })}
                </CircleButton>
                {expanded && (
                  <span
                    className={`ml-4 font-medium text-base truncate ${
                      isActive ? 'text-primary' : 'text-black dark:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
