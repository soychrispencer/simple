import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, size = 'md', disabled, className, ...props }, ref) => {
    const sizeClasses = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'translate-x-4',
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'translate-x-5',
      },
      lg: {
        track: 'h-7 w-14',
        thumb: 'h-6 w-6',
        translate: 'translate-x-7',
      },
    };

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <label
        className={cn(
          'flex items-start gap-3',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative inline-block">
          <input
            type="checkbox"
            ref={ref}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />

          {/* Track */}
          <div
            className={cn(
              'rounded-full transition-all duration-200',
              'bg-gray-300 dark:bg-gray-700',
              'peer-checked:bg-primary',
              'peer-focus:ring-2 peer-focus:ring-primary/20 peer-focus:ring-offset-2',
              'dark:peer-focus:ring-offset-gray-900',
              disabled && 'cursor-not-allowed',
              sizeClasses[size].track
            )}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-0.5 left-0.5',
              'bg-white dark:bg-white',
              'rounded-full shadow-md',
              'transition-transform duration-200',
              'peer-checked:' + sizeClasses[size].translate,
              sizeClasses[size].thumb
            )}
          />
        </div>

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
    );
  }
);

Switch.displayName = 'Switch';
