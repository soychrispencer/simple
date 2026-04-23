'use client';

import { IconBell, IconMenu } from '@tabler/icons-react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ 
  title = 'SimpleSerenatas', 
  showBack = false,
  showNotifications = true,
  rightAction 
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 z-50">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button 
              onClick={() => window.history.back()}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <button className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors">
              <IconMenu size={24} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {rightAction}
          {showNotifications && (
            <Link 
              href="/solicitudes"
              className="relative p-2 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <IconBell size={24} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
