"use client";

import * as React from "react";

import {
  IconLayoutDashboard,
  IconUser,
  IconBuildingSkyscraper,
  IconReceipt2,
  IconSettings,
  IconBookmark,
  IconMessageCircle,
  IconListDetails,
  IconIdBadge2,
  IconPlus,
  IconChartHistogram,
  IconShoppingCart,
  IconClipboardList,
  IconTopologyStar3,
  IconUsersGroup,
  IconHeadset,
  IconCar,
  IconHome2,
  IconBuildingStore,
  IconChefHat,
  IconCalendar,
  IconUsers,
  IconShoppingBag,
  IconFolder,
  IconBell,
  IconChecklist,
  IconFileDescription,
  IconChartArcs,
} from "@tabler/icons-react";

import type { PanelIconId } from "./panelManifest";

export type PanelIconComponent = React.ComponentType<{ size?: number; stroke?: number; className?: string }>;

export const panelIconMap: Record<PanelIconId, PanelIconComponent> = {
  dashboard: IconLayoutDashboard,
  user: IconUser,
  company: IconBuildingSkyscraper,
  billing: IconReceipt2,
  settings: IconSettings,
  favorites: IconBookmark,
  messages: IconMessageCircle,
  listings: IconListDetails,
  "public-profile": IconIdBadge2,
  publish: IconPlus,
  chart: IconChartHistogram,
  marketplace: IconShoppingCart,
  plans: IconClipboardList,
  integrations: IconTopologyStar3,
  team: IconUsersGroup,
  support: IconHeadset,
  vehicles: IconCar,
  properties: IconHome2,
  stores: IconBuildingStore,
  food: IconChefHat,
  chef: IconChefHat,
  calendar: IconCalendar,
  customers: IconUsers,
  orders: IconShoppingBag,
  catalog: IconFolder,
  menu: IconListDetails,
  notifications: IconBell,
  tasks: IconChecklist,
  documents: IconFileDescription,
  analytics: IconChartArcs,
};

export function getPanelIcon(iconId: PanelIconId): PanelIconComponent {
  return panelIconMap[iconId] ?? IconLayoutDashboard;
}
