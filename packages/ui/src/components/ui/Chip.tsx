import React from 'react';
import { IconStar, IconStarFilled } from '@tabler/icons-react';

export interface ChipProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'warning' | 'success' | 'error';
  className?: string;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  children
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const variantClasses = {
    default: 'bg-[var(--field-bg)] border border-[var(--field-border)] text-lighttext/80 dark:text-darktext/80',
    subtle: 'bg-[var(--field-bg)] border border-[var(--field-border)] text-lighttext/70 dark:text-darktext/70',
    warning: 'bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] text-[var(--color-warn)] shadow-token-sm',
    success: 'bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] text-[var(--color-success)] shadow-token-sm',
    error: 'bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] text-[var(--color-danger)] shadow-token-sm'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export interface RatingChipProps {
  value: number;
  total: number;
  onClick?: () => void;
  className?: string;
}

export const RatingChip: React.FC<RatingChipProps> = ({
  value,
  total,
  onClick,
  className = ''
}) => {
  const average = total > 0 ? value / total : 0;

  const clickable = typeof onClick === 'function';
  const Tag: any = clickable ? 'button' : 'span';

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[var(--color-primary-a10)] border border-[var(--color-primary-a30)] text-primary hover:bg-[var(--color-primary-a15)] active:bg-[var(--color-primary-a20)] transition-colors text-xs font-medium ${clickable ? 'cursor-pointer focus-ring' : ''} ${className}`}
      role={clickable ? undefined : 'img'}
      aria-label={clickable ? undefined : `Calificación ${average.toFixed(1)} de 5 (${total})`}
    >
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-current">
            {star <= Math.floor(average) ? (
              <IconStarFilled size={12} fill="currentColor" />
            ) : star - 0.5 <= average ? (
              <span className="relative inline-flex w-3 h-3">
                <IconStar size={12} className="absolute inset-0" />
                <span className="absolute inset-y-0 left-0 w-1.5 overflow-hidden">
                  <IconStarFilled size={12} fill="currentColor" />
                </span>
              </span>
            ) : (
              <IconStar size={12} />
            )}
          </span>
        ))}
      </div>
      <span className="ml-1">
        {average.toFixed(1)} ({total})
      </span>
    </Tag>
  );
};
