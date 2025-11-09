import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    }

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }

    return (
      <div className="w-full">
        <label
          className={cn(
            'flex items-start gap-3',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          <input
            type="radio"
            ref={ref}
            disabled={disabled}
            className={cn(
              // Base
              'mt-0.5 rounded-full border-2 bg-white dark:bg-gray-900',
              'transition-all duration-200',
              'cursor-pointer',

              // Border
              error
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700',

              // Checked state
              'checked:bg-primary checked:border-primary',
              'checked:hover:bg-primary/90 checked:hover:border-primary/90',

              // Focus
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
              'dark:focus:ring-offset-gray-900',

              // Disabled
              disabled && 'cursor-not-allowed opacity-50',

              // Size
              sizeClasses[size],

              className
            )}
            {...props}
          />

          {(label || description) && (
            <div className="flex-1">
              {label && (
                <span
                  className={cn(
                    'block font-medium text-gray-900 dark:text-gray-100',
                    labelSizeClasses[size]
                  )}
                >
                  {label}
                </span>
              )}
              {description && (
                <span className="block text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-500 mt-1.5">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'
