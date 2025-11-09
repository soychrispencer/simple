import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  title?: string
  icon?: ReactNode
  onClose?: () => void
}

export const Alert = ({
  variant = 'default',
  title,
  icon,
  onClose,
  className,
  children,
  ...props
}: AlertProps) => {
  const variantClasses = {
    default:
      'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900/50 dark:border-gray-800 dark:text-gray-100',
    success:
      'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
    warning:
      'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400',
    danger:
      'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
  }

  const iconColorClasses = {
    default: 'text-gray-500 dark:text-gray-400',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    danger: 'text-red-500 dark:text-red-400',
    info: 'text-blue-500 dark:text-blue-400',
  }

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-lg border p-4',
        'transition-all duration-200',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <div className="flex gap-3">
        {icon && (
          <div className={cn('flex-shrink-0', iconColorClasses[variant])}>
            {icon}
          </div>
        )}

        <div className="flex-1">
          {title && (
            <h5 className="font-semibold mb-1 text-sm">{title}</h5>
          )}
          {children && <div className="text-sm">{children}</div>}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'flex-shrink-0 rounded-md p-1',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
            aria-label="Cerrar alerta"
          >
            <svg
              width="16"
              height="16"
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
      </div>
    </div>
  )
}

Alert.displayName = 'Alert'
