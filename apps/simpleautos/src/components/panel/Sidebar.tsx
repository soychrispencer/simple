"use client";

import { PanelSidebar } from "@simple/ui";
import { autosPanelManifest } from "@simple/panel";

interface SidebarProps {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}

export default function Sidebar({ expanded, setExpanded }: SidebarProps) {
  return (
    <PanelSidebar
      vertical="autos"
      manifest={autosPanelManifest}
      expanded={expanded}
      setExpanded={setExpanded}
    />
  );
}







