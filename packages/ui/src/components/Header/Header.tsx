import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  logo?: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
  transparent?: boolean;
  sticky?: boolean;
}

export const Header = ({
  logo,
  navigation,
  actions,
  transparent = false,
  sticky = false,
  className,
  ...props
}: HeaderProps) => {
  return (
    <header
      className={cn(
        'w-full z-40',
        sticky && 'sticky top-0',
        transparent
          ? 'bg-transparent'
          : 'bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800',
        'transition-all duration-200',
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          {logo && <div className="flex-shrink-0">{logo}</div>}

          {/* Navigation */}
          {navigation && (
            <nav className="hidden md:flex items-center space-x-8 flex-1 justify-center">
              {navigation}
            </nav>
          )}

          {/* Actions */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
