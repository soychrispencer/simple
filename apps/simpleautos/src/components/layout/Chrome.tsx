"use client";

import React from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const shouldHideChrome = (pathname: string | null) => {
  if (!pathname) return false;
  return (
    pathname.startsWith("/reset") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/forgot")
  );
};

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = shouldHideChrome(pathname);

  if (hide) return <>{children}</>;

  return (
    <>
      <Header />
      <div className="mt-[10px]">{children}</div>
      <Footer />
    </>
  );
}
