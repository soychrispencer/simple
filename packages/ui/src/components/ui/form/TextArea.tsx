import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'pill';
};

const sizeMap: Record<string, string> = {
  md: 'text-sm px-4 py-3',
  sm: 'text-xs px-3 py-2'
};
const shapeMap: Record<string, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full'
};

export default function TextArea({ label, error, placeholder, className = '', readOnly, rows = 4, size='md', shape='rounded', ...props }: Props) {
  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium mb-1 text-[var(--text-primary)]">{label}</span>}
      <textarea
        {...props}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
        data-invalid={!!error || undefined}
        className={[
          'w-full font-normal leading-snug resize-vertical transition-colors focus:outline-none',
          'bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)]',
          'hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]',
          'placeholder:text-[var(--field-placeholder)]',
          'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[var(--field-focus-ring)]',
          error ? 'border-[var(--field-invalid-border)] focus-visible:ring-[var(--field-invalid-ring)]' : '',
          readOnly ? 'bg-[var(--field-bg)] opacity-90' : '',
          sizeMap[size] || sizeMap.md,
          shapeMap[shape] || shapeMap.rounded,
          className
        ].join(' ')}
      />
      {error && <span className="block text-xs text-[var(--color-danger)] mt-1">{error}</span>}
    </label>
  );
}