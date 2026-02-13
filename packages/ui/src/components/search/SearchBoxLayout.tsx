"use client";
import React from "react";
import { Button } from "../ui/Button";

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

const join = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(" ");

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
    <div className={join("relative w-full max-w-[2000px] px-6 mx-auto z-20", className)}>
      {hasTabs && (
        <div
          className={join("search-tabs", tabsClassName)}
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
                className={join(
                  "min-w-[92px]",
                  isActive
                    ? "text-[var(--color-on-primary)] border shadow-card"
                    : "bg-transparent text-white border border-[var(--glass-border)] shadow-none hover:border-primary",
                  tab.className
                )}
                style={
                  isActive
                    ? { backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)" }
                    : undefined
                }
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
        className={join("search-panel card-surface w-full", panelClassName)}
        {...restPanelProps}
      >
        {children}
      </PanelTag>
    </div>
  );
}

export default SearchBoxLayout;
