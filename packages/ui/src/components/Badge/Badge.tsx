import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
    primary: 'bg-primary/10 text-primary dark:bg-primary/20',
    success:
      'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400',
    warning:
      'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const dotColorClasses = {
    default: 'bg-gray-500 dark:bg-gray-400',
    primary: 'bg-primary',
    success: 'bg-green-500 dark:bg-green-400',
    warning: 'bg-yellow-500 dark:bg-yellow-400',
    danger: 'bg-red-500 dark:bg-red-400',
    info: 'bg-blue-500 dark:bg-blue-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'rounded-full font-medium',
        'transition-colors duration-200',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            dotColorClasses[variant]
          )}
        />
      )}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
