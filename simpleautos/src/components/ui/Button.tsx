"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neutral' | 'ghost' | 'danger' | 'outline' | 'subtle';
  shape?: 'pill' | 'rounded';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  asChild?: boolean; // para futura integración con <Link> o <a>
  loading?: boolean;
}

// Variantes basadas en tokens y utilidades tailwind (sin colores arbitrarios)
const variantMap: Record<string,string> = {
  primary: 'bg-primary text-white hover:brightness-105 active:brightness-95',
  neutral: 'bg-black text-white hover:bg-black/90 active:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90',
  outline: 'border border-black/40 dark:border-white/30 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10',
  subtle: 'bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/15',
  ghost: 'bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700'
};
const sizeMap: Record<string,string> = {
  xs: 'text-[11px] h-6 px-2.5',
  sm: 'text-xs h-8 px-3',
  md: 'text-sm h-10 px-4',
  lg: 'text-base h-12 px-5'
};

export const Button = ({
  variant = 'primary',
  shape = 'pill',
  size = 'md',
  className = '',
  children,
  loading = false,
  ...props
}: ButtonProps) => {
  const base = `inline-flex items-center justify-center font-medium select-none transition-colors duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-50 disabled:cursor-not-allowed`;
  const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded-lg';
  const variantClass = variantMap[variant] || variantMap.primary;
  const sizeClass = sizeMap[size] || sizeMap.md;
  const classes = [base, shapeClass, variantClass, sizeClass, loading ? 'opacity-90 pointer-events-none' : '', className]
    .join(' ') // limpiar espacios
    .replace(/\s+/g,' ')
    .trim();

  // support rendering a child element (like <Link>) with button classes
  if ((props as any).asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement;
    const childProps: any = { ...(child.props || {}) };
    // merge/append className
    childProps.className = [childProps.className || '', classes].filter(Boolean).join(' ');
    // pass disabled as aria-disabled for non-button elements
    if (loading || props.disabled) {
      childProps['aria-disabled'] = true;
    }
    // remove internal prop to avoid passing it down
    const cleanedProps = { ...props } as any;
    delete cleanedProps.asChild;
    // avoid passing 'type' to anchors
    delete cleanedProps.type;
    // merge remaining props (onClick, etc.)
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
          <span className="inline-block w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          <span className="sr-only">Cargando</span>
        </span>
      ) : (
        <span className="flex items-center gap-2 h-full">{children}</span>
      )}
    </button>
  );
};

export default Button;
