"use client";

import React, { useState } from "react";
import { Button } from "./Button";

interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({ tabs, defaultValue, children, className = "" }: TabsProps) => {
  const [active, setActive] = useState(defaultValue || tabs[0].value);

  // Filtra los TabContent hijos y les pasa la prop active
  const contents = React.Children.map(children, (child: any) => {
    if (child.type.displayName === "TabContent") {
      return React.cloneElement(child, { active });
    }
    return child;
  });

  return (
    <div className={className}>
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={active === tab.value ? 'primary' : 'neutral'}
            className="px-4 py-2 text-sm font-medium"
            onClick={() => setActive(tab.value)}
            type="button"
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {contents}
    </div>
  );
};

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  active?: string;
}

export const TabContent = ({ value, children, active }: TabContentProps) => {
  if (active !== value) return null;
  return <div>{children}</div>;
};
TabContent.displayName = "TabContent";