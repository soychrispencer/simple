'use client';

import { IconBrandWhatsapp } from '@tabler/icons-react';
import { buildWhatsAppClickUrl } from '@/lib/whatsapp-click';

type Props = {
    phone?: string | null;
    message: string;
    label?: string;
    /** Solo icono (útil en toolbars). */
    iconOnly?: boolean;
    className?: string;
    disabled?: boolean;
    title?: string;
    'aria-label'?: string;
};

export function WhatsAppClickButton({
    phone,
    message,
    label = 'WhatsApp',
    iconOnly = false,
    className = '',
    disabled = false,
    title,
    'aria-label': ariaLabel,
}: Props) {
    const href = buildWhatsAppClickUrl(phone, message);
    const canOpen = !disabled && Boolean(message.trim());

    if (!canOpen) {
        return (
            <span
                className={`inline-flex items-center justify-center gap-2 opacity-40 cursor-not-allowed ${className}`}
                title={title ?? 'Agrega un teléfono o WhatsApp del cliente'}
                aria-disabled
            >
                <IconBrandWhatsapp size={14} />
                {!iconOnly ? label : null}
            </span>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 ${className}`}
            style={{ background: '#25D366', color: '#fff' }}
            title={title}
            aria-label={ariaLabel ?? label}
        >
            <IconBrandWhatsapp size={14} />
            {!iconOnly ? label : null}
        </a>
    );
}
