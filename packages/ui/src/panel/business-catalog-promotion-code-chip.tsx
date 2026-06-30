'use client';

import { useEffect, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export type BusinessCatalogPromotionCodeChipProps = {
    code: string;
    copiedCode?: string | null;
    onCopy: (code: string) => void;
};

export function BusinessCatalogPromotionCodeChip({
    code,
    copiedCode = null,
    onCopy,
}: BusinessCatalogPromotionCodeChipProps) {
    const copied = copiedCode === code;

    return (
        <button
            type="button"
            onClick={() => onCopy(code)}
            className="inline-flex items-center gap-1 rounded-lg bg-bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-fg hover:opacity-80"
        >
            {copied ? <><IconCheck size={11} /> Copiado</> : <><IconCopy size={11} /> {code}</>}
        </button>
    );
}

/** Copia al portapapeles y expone el código copiado durante un breve intervalo. */
export function useCatalogPromotionCodeCopy(timeoutMs = 1800) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        if (!copiedCode) return;
        const timer = window.setTimeout(() => {
            setCopiedCode((current) => (current === copiedCode ? null : current));
        }, timeoutMs);
        return () => window.clearTimeout(timer);
    }, [copiedCode, timeoutMs]);

    function copyCode(code: string) {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return;
        void navigator.clipboard.writeText(code);
        setCopiedCode(code);
    }

    return { copiedCode, copyCode };
}
