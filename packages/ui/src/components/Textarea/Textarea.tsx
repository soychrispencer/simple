import { forwardRef, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      resize = 'vertical',
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            // Base
            'w-full rounded-lg border bg-white dark:bg-gray-900',
            'px-3.5 py-2.5',
            'text-base text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-500 dark:placeholder:text-gray-500',
            'transition-all duration-200',
            'min-h-[100px]',

            // Focus
            'focus:outline-none focus:ring-2 focus:ring-primary/20',

            // States
            error
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-700',

            disabled &&
              'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',

            // Resize
            resizeClasses[resize],

            className
          )}
          {...props}
        />

        {(error || helperText) && (
          <p
            className={cn(
              'text-sm mt-1.5',
              error
                ? 'text-red-600 dark:text-red-500'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
