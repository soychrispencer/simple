'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconHome, 
  IconCalendar, 
  IconBell, 
  IconUsers, 
  IconUser 
} from '@tabler/icons-react';
import clsx from 'clsx';

const navItems = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/agenda', label: 'Agenda', icon: IconCalendar },
  { href: '/solicitudes', label: 'Solicitudes', icon: IconBell },
  { href: '/grupos', label: 'Grupos', icon: IconUsers },
  { href: '/perfil', label: 'Perfil', icon: IconUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center w-16 h-full touch-target',
                'transition-colors duration-200',
                isActive ? 'text-rose-600' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              <span className={clsx(
                'text-xs mt-0.5',
                isActive ? 'font-medium' : 'font-normal'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
