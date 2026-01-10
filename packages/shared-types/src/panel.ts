export type VerticalName = "autos" | "properties" | "stores" | "food";

export type PanelModuleStatus = "active" | "beta" | "planned" | "deprecated";

export type PanelIconId =
  | "dashboard"
  | "user"
  | "company"
  | "billing"
  | "settings"
  | "favorites"
  | "messages"
  | "listings"
  | "public-profile"
  | "publish"
  | "chart"
  | "marketplace"
  | "plans"
  | "integrations"
  | "team"
  | "support"
  | "vehicles"
  | "properties"
  | "stores"
  | "food"
  | "chef"
  | "calendar"
  | "customers"
  | "orders"
  | "catalog"
  | "menu"
  | "notifications"
  | "tasks"
  | "documents"
  | "analytics";

export interface PanelSidebarItem {
  id: string;
  label: string;
  href: string;
  icon: PanelIconId;
  description?: string;
  permission?: string;
  featureFlag?: string;
  badge?: string;
  status?: PanelModuleStatus;
}

export interface PanelSidebarSection {
  id: string;
  title: string;
  items: PanelSidebarItem[];
}

export interface PanelDashboardWidget {
  id: string;
  type: "kpi" | "chart" | "table" | "custom";
  title: string;
  description?: string;
  permission?: string;
  dataSource?: string;
  status?: PanelModuleStatus;
}

export interface PanelDashboardSection {
  id: string;
  title: string;
  description?: string;
  widgets: PanelDashboardWidget[];
}

export interface PanelManifest {
  vertical: VerticalName;
  version: string;
  updatedAt: string;
  sidebar: PanelSidebarSection[];
  dashboard?: PanelDashboardSection[];
  quickActions?: PanelSidebarItem[];
}
