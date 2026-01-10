"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export type DisplayCurrency = "CLP" | "USD";

const STORAGE_KEY = "simple:displayCurrency";

type DisplayCurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (next: DisplayCurrency) => void;
  toggleCurrency: () => void;
};

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue>({
  currency: "CLP",
  setCurrency: () => {},
  toggleCurrency: () => {},
});

export function DisplayCurrencyProvider({
  children,
  defaultCurrency = "CLP",
}: {
  children: React.ReactNode;
  defaultCurrency?: DisplayCurrency;
}) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(defaultCurrency);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "CLP" || saved === "USD") {
        setCurrencyState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((currency === "CLP" ? "USD" : "CLP") as DisplayCurrency);
  }, [currency, setCurrency]);

  const value = useMemo<DisplayCurrencyContextValue>(
    () => ({ currency, setCurrency, toggleCurrency }),
    [currency, setCurrency, toggleCurrency]
  );

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
}

export function useDisplayCurrency() {
  return React.useContext(DisplayCurrencyContext);
}
