import React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  shape?: 'rounded' | 'pill';
  fieldSize?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/*
  Nuevo sistema de estilos para campos:
  - Se eliminan clases legacy .field-base/.field-pill/.field-md...
  - Uso de utilidades Tailwind + tokens (variables CSS) ya presentes en el theme.
  - Alturas consistentes: md=40px, sm=32px.
  - Estados: default, hover, focus-visible (ring), invalid, readOnly, disabled.
*/

const baseCommon = "w-full font-normal leading-none transition-colors placeholder:text-[var(--field-placeholder)] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]";
const sizeMap: Record<string, string> = {
  md: "h-10 text-sm px-4",
  sm: "h-8 text-xs px-3"
};
const shapeMap: Record<string, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full"
};

// Focus ring actualizado:
// - ring-inset para que no se vea más grande que el contorno
// - color negro (#000) en modo claro y blanco (#fff) en modo oscuro
// - sin offset visual (el ring se dibuja dentro del borde)
const focusStyles = "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white";
const invalidStyles = "data-[invalid=true]:border-[var(--field-invalid-border)] data-[invalid=true]:focus-visible:ring-[var(--field-invalid-ring)]";
const readOnlyStyles = "read-only:bg-gray-100 read-only:dark:bg-neutral-700 read-only:opacity-90";

const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  className = "",
  readOnly,
  shape = 'rounded',
  fieldSize = 'md',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const sizeClass = sizeMap[fieldSize] || sizeMap.md;
  const shapeClass = shapeMap[shape] || shapeMap.rounded;
  const invalid = !!error;

  const inputEl = (
    <div className="relative flex items-center w-full">
      {leftIcon && (
        <span className="absolute left-3 inline-flex items-center text-gray-500 dark:text-gray-400 pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        {...props}
        readOnly={readOnly}
        data-invalid={invalid || undefined}
        className={[
          baseCommon,
          sizeClass,
          shapeClass,
          focusStyles,
            invalidStyles,
          readOnlyStyles,
          leftIcon ? 'pl-9' : '',
          rightIcon ? 'pr-10' : '',
          className
        ].join(' ')}
      />
      {rightIcon && (
        <span className="absolute right-3 inline-flex items-center text-gray-500 dark:text-gray-400">
          {rightIcon}
        </span>
      )}
    </div>
  );

  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium mb-1 text-black dark:text-white">{label}</span>}
      {inputEl}
      {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  );
};

export default Input;
