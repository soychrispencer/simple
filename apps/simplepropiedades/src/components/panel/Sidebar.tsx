"use client";

import { PanelSidebar } from "@simple/ui";
import { propertiesPanelManifest } from "@simple/panel";

interface SidebarProps {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}

export default function PropertiesPanelSidebar({ expanded, setExpanded }: SidebarProps) {
  return (
    <PanelSidebar
      vertical="properties"
      manifest={propertiesPanelManifest}
      expanded={expanded}
      setExpanded={setExpanded}
    />
  );
}
