"use client";
import React from "react";

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
    default: 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:text-primary active:text-primary',
    primary: 'bg-primary text-[var(--color-on-primary)] hover:bg-[var(--color-primary-a90)] active:bg-[var(--color-primary-a80)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-primary active:text-primary'
  };
  const style = { width: size, height: size, minWidth: size, minHeight: size, borderRadius: '9999px' };
  
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={[base, variants[variant] || variants.default, className, '!rounded-full aspect-square'].filter(Boolean).join(' ')}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};

export default CircleButton;
