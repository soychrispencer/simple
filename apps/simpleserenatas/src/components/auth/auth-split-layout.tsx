'use client';

import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { BrandLogo } from '@simple/ui';

type AuthSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
};

export function AuthSplitLayout({ left, right }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col bg-[var(--surface)]">{left}</div>
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-7/12 items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 70%, black) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-[var(--fg)] blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-[var(--fg)] blur-3xl" />
        </div>
        <div className="relative z-10 max-w-lg px-12">{right}</div>
      </div>
    </div>
  );
}

export function AuthBrandHeader() {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
        style={{ color: 'var(--fg)' }}
      >
        <IconArrowLeft size={20} />
        <span className="text-sm font-medium hidden sm:inline">Volver</span>
      </Link>
      <BrandLogo appId="simpleserenatas" className="[&>span:last-child]:text-base [&>span:last-child]:font-bold" />
      <div className="w-20" />
    </div>
  );
}
