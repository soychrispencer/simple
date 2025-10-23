"use client";
import React from "react";

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  'aria-label': string;
  size?: number; // px
  variant?: 'default' | 'primary' | 'ghost';
}

export const CircleButton = ({ children, 'aria-label': ariaLabel, size = 40, className = '', variant='default', ...props }: CircleButtonProps) => {
  const base = 'inline-flex interactive-scale items-center justify-center rounded-full p-0 select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string,string> = {
    default: 'bg-white dark:bg-darkcard text-black dark:text-white shadow',
    primary: 'bg-primary text-white shadow',
    ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  };
  const style = { width: size, height: size };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
  className={[base, variants[variant] || variants.default, className].filter(Boolean).join(' ')}
  style={style}
      {...props}
    >
      {children}
    </button>
  );
};

export default CircleButton;
