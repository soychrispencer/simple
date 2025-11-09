"use client";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider } from "./ThemeContext";
import { ReactNode } from "react";

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  return (
    <ThemeContextProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeContextProvider>
  );
}