import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variantClasses = {
    default: 'bg-[var(--color-primary-a10)] text-primary shadow-token-sm',
    secondary: 'card-surface text-[var(--text-secondary)] shadow-token-sm',
    destructive: 'bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] shadow-token-sm',
    outline: 'text-[var(--text-secondary)] shadow-token-sm'
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};