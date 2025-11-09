import * as React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variante visual de la tarjeta
   */
  variant?: 'default' | 'elevated' | 'outlined';

  /**
   * Padding interno
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Si la tarjeta debe tener efecto hover
   */
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = 'default', padding = 'md', hoverable = false, children, ...props },
    ref
  ) => {
    const baseStyles = `
      rounded-xl
      bg-white dark:bg-gray-800
      transition-all duration-base
    `;

    const variants = {
      default: 'shadow-card',
      elevated: 'shadow-card-hover',
      outlined: 'border-2 border-gray-200 dark:border-gray-700',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverable && 'hover:shadow-card-hover hover:scale-[1.01] cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
