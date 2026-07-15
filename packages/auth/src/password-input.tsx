'use client';

import { useState, type CSSProperties } from 'react';
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';

const INPUT_CLASS = 'form-input form-input-has-leading-icon w-full';
const INPUT_STYLE: CSSProperties = {
    background: 'var(--surface)',
    color: 'var(--fg)',
    borderColor: 'var(--border)',
    height: '44px',
    paddingRight: '44px',
};
const ICON_STYLE: CSSProperties = { color: 'var(--fg-muted)', left: '14px', top: '50%', transform: 'translateY(-50%)' };
const TOGGLE_STYLE: CSSProperties = {
    color: 'var(--fg-muted)',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
};

type PasswordInputProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoComplete: string;
    required?: boolean;
    minLength?: number;
    className?: string;
    /** Sin icono izquierdo (p. ej. reset-password). */
    plain?: boolean;
};

export function PasswordInput({
    id,
    value,
    onChange,
    placeholder,
    autoComplete,
    required,
    minLength,
    className,
    plain = false,
}: PasswordInputProps) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative w-full">
            {plain ? null : (
                <IconLock size={16} className="pointer-events-none absolute" style={ICON_STYLE} />
            )}
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                autoComplete={autoComplete}
                minLength={minLength}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={className ?? (plain ? 'form-input w-full' : INPUT_CLASS)}
                placeholder={placeholder}
                required={required}
                style={plain ? { paddingRight: '44px', height: '44px' } : INPUT_STYLE}
            />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="absolute inline-flex items-center justify-center rounded-md p-1"
                style={TOGGLE_STYLE}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
                {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
        </div>
    );
}
