"use client";
import React from "react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

type ElementTag = keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any>;

export interface SearchBoxTab {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface SearchBoxLayoutProps {
  children: React.ReactNode;
  tabs?: SearchBoxTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  tabsAriaLabel?: string;
  className?: string;
  tabsClassName?: string;
  panelProps?: (React.HTMLAttributes<HTMLElement> & { as?: ElementTag });
}

export function SearchBoxLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  tabsAriaLabel = "Opciones de búsqueda",
  className,
  tabsClassName,
  panelProps,
}: SearchBoxLayoutProps) {
  const hasTabs = Array.isArray(tabs) && tabs.length > 0;
  const PanelTag = (panelProps?.as ?? "div") as ElementTag;
  const { as: _ignored, className: panelClassName, ...restPanelProps } = panelProps ?? {};

  return (
    <div className={cn("relative w-full max-w-[2000px] px-6 mx-auto z-20", className)}>
      {hasTabs && (
        <div
          className={cn("search-tabs", tabsClassName)}
          role="tablist"
          aria-label={tabsAriaLabel}
        >
          {tabs!.map((tab) => {
            const isActive = tab.value === activeTab;
            const handleTabClick = () => {
              if (!onTabChange || tab.disabled) return;
              onTabChange(tab.value);
            };
            return (
              <Button
                key={tab.value}
                size="sm"
                shape="rounded"
                variant="ghost"
                type="button"
                className={cn(
                  "min-w-[92px]",
                  isActive
                    ? "bg-primary text-white border border-[var(--color-primary-a90)] ring-1 ring-[var(--color-primary-a20)] shadow-card hover:bg-[var(--color-primary-a90)]"
                    : "bg-transparent text-white border border-[var(--glass-border)] shadow-none hover:border-white/90 hover:text-white",
                  tab.className
                )}
                aria-pressed={isActive}
                aria-current={isActive ? "true" : undefined}
                disabled={tab.disabled}
                onClick={handleTabClick}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      )}
      <PanelTag
        className={cn("search-panel card-surface w-full", panelClassName)}
        {...restPanelProps}
      >
        {children}
      </PanelTag>
    </div>
  );
}

export default SearchBoxLayout;
