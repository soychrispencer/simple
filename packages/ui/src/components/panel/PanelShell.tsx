"use client";
import React from "react";
import { cn } from "../../lib/cn";

export interface PanelShellSidebarRenderProps {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  toggleExpanded: () => void;
}

export interface PanelShellProps {
  sidebar: (props: PanelShellSidebarRenderProps) => React.ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  stickyHeader?: boolean;
  initialSidebarExpanded?: boolean;
}

export default function PanelShell({
  sidebar,
  header,
  children,
  className,
  contentClassName,
  headerClassName,
  stickyHeader = false,
  initialSidebarExpanded = false,
}: PanelShellProps) {
  const [expanded, setExpanded] = React.useState(initialSidebarExpanded);

  const toggleExpanded = React.useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const sidebarNode = sidebar({
    expanded,
    setExpanded,
    toggleExpanded,
  });

  return (
    <div
      className={cn(
        "min-h-screen flex flex-row px-4 md:px-8 gap-6",
        className
      )}
    >
      {sidebarNode}
      <div className="flex-1 flex flex-col transition-all duration-200">
        {header && (
          <div
            className={cn(
              "pt-4 pb-2",
              stickyHeader
                ? "sticky top-0 z-20 bg-lightbg/95 dark:bg-darkbg/95 backdrop-blur"
                : "",
              headerClassName
            )}
          >
            {header}
          </div>
        )}
        <main
          className={cn(
            "flex-1 pb-6 md:pb-10",
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
