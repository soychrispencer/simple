import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, helperText, options, placeholder, size = 'md', disabled, className, ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-9 text-sm',
      md: 'h-10 text-base',
      lg: 'h-12 text-lg',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              // Base
              'w-full rounded-lg border bg-white dark:bg-gray-900',
              'px-3.5 py-2',
              'text-gray-900 dark:text-gray-100',
              'transition-all duration-200',
              'appearance-none',
              'cursor-pointer',

              // Focus
              'focus:outline-none focus:ring-2 focus:ring-primary/20',

              // States
              error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700',

              disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',

              // Size
              sizeClasses[size],

              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {(error || helperText) && (
          <p
            className={cn(
              'text-sm mt-1.5',
              error ? 'text-red-600 dark:text-red-500' : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
