import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface FooterProps extends HTMLAttributes<HTMLElement> {
  logo?: ReactNode;
  description?: string;
  links?: Array<{
    title: string;
    items: Array<{
      label: string;
      href: string;
    }>;
  }>;
  social?: ReactNode;
  copyright?: string;
}

export const Footer = ({
  logo,
  description,
  links,
  social,
  copyright,
  className,
  ...props
}: FooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'w-full bg-gray-50 dark:bg-gray-950',
        'border-t border-gray-200 dark:border-gray-800',
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Logo & Description */}
            <div className="lg:col-span-4">
              {logo && <div className="mb-4">{logo}</div>}
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">{description}</p>
              )}
              {social && <div className="mt-6">{social}</div>}
            </div>

            {/* Links */}
            {links && links.length > 0 && (
              <>
                {links.map((section, idx) => (
                  <div key={idx} className="lg:col-span-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {section.title}
                    </h3>
                    <ul className="space-y-3">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx}>
                          <a
                            href={item.href}
                            className={cn(
                              'text-sm text-gray-600 dark:text-gray-400',
                              'hover:text-primary dark:hover:text-primary',
                              'transition-colors duration-200'
                            )}
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="py-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            {copyright || `© ${currentYear} Simple. Todos los derechos reservados.`}
          </p>
        </div>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';
