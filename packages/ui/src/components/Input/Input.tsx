import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label del input
   */
  label?: string;
  
  /**
   * Mensaje de error
   */
  error?: string;
  
  /**
   * Texto de ayuda
   */
  helperText?: string;
  
  /**
   * Ícono a la izquierda
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Ícono a la derecha
   */
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={cn(
              `
                w-full px-3 py-2
                text-base
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-700
                rounded-md
                transition-all duration-base
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder:text-gray-400 dark:placeholder:text-gray-500
              `,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-error focus:ring-error',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
