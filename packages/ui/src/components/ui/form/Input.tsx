import React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  shape?: 'rounded' | 'pill';
  fieldSize?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  appearance?: 'filled' | 'line';
}

/*
  Nuevo sistema de estilos para campos:
  - Se eliminan clases legacy .field-base/.field-pill/.field-md...
  - Uso de utilidades Tailwind + tokens (variables CSS) ya presentes en el theme.
  - Alturas consistentes: md=40px, sm=32px.
  - Estados: default, hover, focus-visible (ring), invalid, readOnly, disabled.
*/

const baseCommon = "w-full font-normal leading-[1.25rem] transition-colors placeholder:text-[var(--field-placeholder)] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none text-[var(--field-text)]";
const autofillReset = "autofill:bg-[var(--field-bg)] autofill:text-[var(--field-text)] autofill:shadow-[0_0_0_1000px_var(--field-bg)_inset] autofill:border-[var(--field-border)] autofill:caret-current autofill:transition-colors autofill:rounded-[inherit]";
const sizeMap: Record<string, string> = {
  md: "h-10 text-sm px-4",
  sm: "h-8 text-xs px-3"
};
const shapeMap: Record<string, string> = {
  rounded: "rounded-md",
  pill: "rounded-full"
};

// Focus ring actualizado:
// - ring-inset para que no se vea más grande que el contorno
// - color tokenizado para modo claro/oscuro
// - sin offset visual (el ring se dibuja dentro del borde)
const focusStyles = "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[var(--field-focus-ring)]";
const invalidStyles = "data-[invalid=true]:border-[var(--field-invalid-border)] data-[invalid=true]:focus-visible:ring-[var(--field-invalid-ring)]";
const lineBase = "bg-transparent border-0 border-b border-[var(--field-border)] rounded-none px-0 py-2 hover:border-[var(--field-border-hover)] focus-visible:border-primary focus-visible:ring-0 active:border-[var(--field-border-active)]";
const filledBase = "bg-[var(--field-bg)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]";

const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  className = "",
  readOnly,
  shape = 'rounded',
  fieldSize = 'md',
  appearance = 'line',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const sizeClass = sizeMap[fieldSize] || sizeMap.md;
  const shapeClass = shapeMap[shape] || shapeMap.rounded;
  const invalid = !!error;
  const readOnlyClass = appearance === 'line' ? 'read-only:bg-transparent read-only:opacity-90' : 'read-only:bg-[var(--field-bg)] read-only:opacity-90';
  const disabledClass = appearance === 'line' ? 'disabled:bg-transparent' : 'disabled:bg-[var(--field-bg)]';

  const numberInputClasses = props.type === 'number'
    ? 'appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
    : '';

  const inputEl = (
    <div className="relative flex items-center w-full">
      {leftIcon && (
        <span className="absolute left-3 inset-y-0 inline-flex items-center text-lighttext/70 dark:text-darktext/70 pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        {...props}
        readOnly={readOnly}
        data-invalid={invalid || undefined}
        className={[
          baseCommon,
          autofillReset,
          appearance === 'line' ? lineBase : filledBase,
          appearance === 'line' ? `${fieldSize === 'sm' ? 'min-h-[32px] text-xs py-1' : 'min-h-[40px] text-sm py-2'} ${leftIcon ? 'pl-8' : ''} ${rightIcon ? 'pr-8' : ''}` : `${sizeClass} ${shapeClass}`,
          appearance === 'line' ? 'focus-visible:ring-0' : focusStyles,
          invalidStyles,
          readOnlyClass,
          disabledClass,
          appearance === 'line' ? '' : leftIcon ? 'pl-9' : '',
          appearance === 'line' ? '' : rightIcon ? 'pr-10' : '',
          numberInputClasses,
          className
        ].join(' ')}
      />
      {rightIcon && (
        <span className="absolute right-3 inset-y-0 inline-flex items-center text-lighttext/70 dark:text-darktext/70">
          {rightIcon}
        </span>
      )}
    </div>
  );

  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium mb-1 text-[var(--text-primary)]">{label}</span>}
      {inputEl}
      {hint && !error && <span className="block text-xs text-lighttext/70 dark:text-darktext/70 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-[var(--color-danger)] mt-1">{error}</span>}
    </label>
  );
};

export default Input;