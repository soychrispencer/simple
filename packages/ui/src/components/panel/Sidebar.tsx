"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChevronLeft,
} from "@tabler/icons-react";
import type { VerticalName } from "@simple/config";
import type {
  PanelIconId,
  PanelManifest,
  PanelModuleStatus,
  PanelSidebarItem,
  PanelSidebarSection,
} from "./panelManifest";
import { CircleButton } from "../ui";
import { useVerticalContext } from "./useVerticalContext";
import { getPanelIcon } from "./panelIconMap";

const hiddenStatuses: PanelModuleStatus[] = ["planned", "deprecated"];

export interface PanelSidebarProps {
  vertical: VerticalName;
  manifest: PanelManifest;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}

function hasPermission(required: string | undefined, permissions: Record<string, any> | null) {
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
    if (bucket[action] === true) return true;
    if (Array.isArray(bucket.actions)) {
      return bucket.actions.includes(action);
    }
  }

  return false;
}

function shouldDisplayItem(item: PanelSidebarItem, permissions: Record<string, any> | null) {
  if (item.status && hiddenStatuses.includes(item.status)) {
    return false;
  }
  if (item.permission && !hasPermission(item.permission, permissions)) {
    return false;
  }
  return true;
}

function isActivePath(pathname: string, href: string, isRootPanel: boolean) {
  const hrefPath = href.split(/[?#]/)[0] ?? href;
  if (isRootPanel) {
    return pathname === hrefPath;
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function renderIcon(iconId: PanelIconId, isActive: boolean) {
  const IconComponent = getPanelIcon(iconId);
  return (
    <IconComponent
      size={22}
      stroke={1}
      className={isActive ? "text-black" : "text-current"}
    />
  );
}

export default function PanelSidebar({ vertical, manifest, expanded, setExpanded }: PanelSidebarProps) {
  const pathname = usePathname() ?? "";
  const { currentCompany } = useVerticalContext(vertical);

  const permissions = (currentCompany?.permissions ?? null) as Record<string, any> | null;

  const sections = React.useMemo(() => {
    return manifest.sidebar
      .map<PanelSidebarSection>((section) => ({
        ...section,
        items: section.items.filter((item) => shouldDisplayItem(item, permissions)),
      }))
      .filter((section) => section.items.length > 0);
  }, [manifest, permissions]);

  return (
    <aside
      className={`mb-8 card-surface shadow-card flex flex-col shrink-0 transition-all duration-200 ${expanded ? "w-64" : "w-16"} items-center py-6 box-border sticky top-6 self-start`}
    >
      <div className="w-full flex flex-col items-center">
        <CircleButton
          aria-label={expanded ? "Colapsar menú" : "Expandir menú"}
          onClick={() => setExpanded(!expanded)}
          size={40}
          className={`mb-6 ${expanded ? "ml-auto mr-2" : "mx-auto"}`}
        >
          <IconChevronLeft
            size={22}
            stroke={2}
            className={`transition-transform duration-200 ${expanded ? "" : "rotate-180"}`}
          />
        </CircleButton>
        <nav className={`flex flex-col items-center w-full ${expanded ? "gap-4" : "gap-2"} flex-1`}>
          {sections.length === 0 && (
            <p className="text-center text-sm text-[var(--text-secondary)] px-4">Sin módulos disponibles</p>
          )}
          {sections.map((section) => (
            <div key={section.id} className="flex flex-col items-center w-full">
              {expanded && (() => {
                const isSummarySection = section.items.length === 1 && section.items[0]?.href === "/resumen";
                if (isSummarySection) return null;
                if (!section.title) return null;
                return (
                  <p className="w-full px-4 pb-1 text-xs font-semibold uppercase text-[var(--text-tertiary)]">
                    {section.title}
                  </p>
                );
              })()}
              {section.items.map((item) => {
                const isRootPanel = item.href === "/resumen";
                const isActive = isActivePath(pathname, item.href, isRootPanel);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center w-full ${expanded ? "px-4" : "px-2"} py-1 group transition-all ${
                      !expanded ? "justify-center" : ""
                    }`}
                  >
                    <CircleButton
                      aria-label={item.label}
                      size={40}
                      variant={isActive ? "primary" : "ghost"}
                      className={isActive ? "" : "group-hover:text-primary transition-colors"}
                      title={item.label}
                    >
                      {renderIcon(item.icon, isActive)}
                    </CircleButton>
                    {expanded && (
                      <span
                        className={`ml-4 font-medium text-base truncate ${
                          isActive
                            ? "text-primary"
                            : "text-lighttext dark:text-darktext group-hover:text-primary transition-colors"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
