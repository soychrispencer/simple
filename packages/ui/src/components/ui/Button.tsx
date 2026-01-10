"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neutral' | 'ghost' | 'danger' | 'outline' | 'subtle';
  shape?: 'pill' | 'rounded';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]';

const primaryBase = 'bg-black text-[var(--color-on-primary)] shadow-card dark:bg-white dark:text-black';
const primaryHover = 'hover:bg-black/90 active:bg-black/80 dark:hover:bg-white/90 dark:active:bg-white/80';

const neutralBase = 'bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)]';
const neutralHover = 'hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]';

const outlineBase = 'bg-transparent text-[var(--text-primary)] border border-[var(--field-border)]';
const outlineHover = 'hover:bg-[var(--surface-neutral-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--surface-neutral-active)] active:border-[var(--field-border-active)]';

const ghostBase = 'bg-transparent text-[var(--text-primary)]';
const ghostHover = 'hover:bg-[var(--surface-neutral-hover)] active:bg-[var(--surface-neutral-active)]';

const subtleBase = 'bg-[var(--color-primary-a10)] text-primary';
const subtleHover = 'hover:bg-[var(--color-primary-a15)] active:bg-[var(--color-primary-a20)]';

const dangerBase = 'bg-[var(--color-danger)] text-[var(--color-on-primary)] shadow-card';
const dangerHover = 'hover:opacity-95 active:opacity-90';

const transitionFx = 'transition-colors duration-200';
const variantMap: Record<string,string> = {
  primary: `${primaryBase} ${primaryHover} ${transitionFx}`,
  neutral: `${neutralBase} ${neutralHover} ${transitionFx}`,
  outline: `${outlineBase} ${outlineHover} ${transitionFx}`,
  subtle: `${subtleBase} ${subtleHover} ${transitionFx}`,
  ghost: `${ghostBase} ${ghostHover} ${transitionFx}`,
  danger: `${dangerBase} ${dangerHover} ${transitionFx}`,
};

const sizeMap: Record<string,string> = {
  xs: 'text-[11px] h-6 px-2.5',
  sm: 'text-xs h-8 px-3',
  md: 'text-sm h-10 px-4',
  lg: 'text-base h-12 px-5'
};

export const Button = ({
  variant = 'primary',
  shape = 'rounded',
  size = 'md',
  className = '',
  children,
  loading = false,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) => {
  const base = `inline-flex items-center justify-center font-medium tracking-tight select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
  const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded-md';
  const variantClass = variantMap[variant] || variantMap.primary;
  const sizeClass = sizeMap[size] || sizeMap.md;
  const classes = [base, shapeClass, variantClass, sizeClass, loading ? 'opacity-90 pointer-events-none' : '', className]
    .join(' ')
    .replace(/\s+/g,' ')
    .trim();

  if ((props as any).asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement;
    const childProps: any = { ...(child.props || {}) };
    childProps.className = [childProps.className || '', classes].filter(Boolean).join(' ');
    if (loading || props.disabled) {
      childProps['aria-disabled'] = true;
    }
    const cleanedProps = { ...props } as any;
    delete cleanedProps.asChild;
    delete cleanedProps.type;
    Object.assign(childProps, cleanedProps);
    return React.cloneElement(child, childProps);
  }

  return (
    <button
      className={classes + ' relative'}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center w-full h-full gap-1">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-current/40 border-t-current animate-spin" />
          <span className="sr-only">Cargando</span>
        </span>
      ) : (
        <span className="flex items-center gap-2 h-full">
          {leftIcon ? <span className="flex items-center">{leftIcon}</span> : null}
          {children}
          {rightIcon ? <span className="flex items-center">{rightIcon}</span> : null}
        </span>
      )}
    </button>
  );
};

export default Button;
