"use client";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeContextProviderProps {
  children: ReactNode;
}

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}