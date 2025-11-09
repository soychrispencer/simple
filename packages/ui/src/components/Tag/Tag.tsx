import { HTMLAttributes, MouseEvent } from 'react';
import { cn } from '../../lib/utils';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onRemove?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const Tag = ({
  variant = 'default',
  size = 'md',
  onRemove,
  className,
  children,
  ...props
}: TagProps) => {
  const variantClasses = {
    default:
      'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
    primary:
      'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:border-primary/30',
    success:
      'bg-green-100 text-green-900 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    warning:
      'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    danger:
      'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const removeButtonSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'rounded-md border font-medium',
        'transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'rounded-sm hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-1 focus:ring-primary/20'
          )}
          aria-label="Eliminar"
        >
          <svg
            className={removeButtonSizeClasses[size]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
};

Tag.displayName = 'Tag';
