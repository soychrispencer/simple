"use client";
import React from "react";
import { cn } from "../../lib/cn";

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  'aria-label': string;
  size?: number;
  variant?: 'default' | 'primary' | 'ghost';
}

export const CircleButton = ({ 
  children, 
  'aria-label': ariaLabel, 
  size = 40, 
  className = '', 
  variant='default', 
  ...props 
}: CircleButtonProps) => {
  const base = 'inline-flex items-center justify-center p-0 rounded-full select-none focus:outline-none focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-80 ease-out hover:scale-[1.02] active:scale-[0.985]';
  const variants: Record<string,string> = {
    default: 'bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--field-border)] shadow-token-sm hover:border-[var(--color-primary-a30)]',
    primary: 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border border-neutral-900/80 dark:border-neutral-200 shadow-card ring-1 ring-[var(--color-primary-a20)] hover:ring-[var(--color-primary-a40)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-neutral-hover)] active:bg-[var(--surface-neutral-active)]'
  };
  const sizeClasses: Record<number, string> = {
    32: 'w-8 h-8',
    36: 'w-9 h-9',
    40: 'w-10 h-10',
    44: 'w-11 h-11',
    48: 'w-12 h-12',
    128: 'w-32 h-32',
    160: 'w-40 h-40',
  };
  const sizeClass = sizeClasses[size] || sizeClasses[40];
  
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(base, variants[variant] || variants.default, sizeClass, className, '!rounded-full aspect-square')}
      {...props}
    >
      {children}
    </button>
  );
};

export default CircleButton;
