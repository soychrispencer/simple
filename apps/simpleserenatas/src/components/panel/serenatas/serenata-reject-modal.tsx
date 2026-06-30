'use client';

import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';
import {
    SERENATA_REJECT_OTHER_ID,
    SERENATA_REJECT_TEMPLATES,
    resolveSerenataRejectReason,
} from '@/lib/serenata-reject-templates';

export function SerenataRejectModal({
    open,
    recipientName,
    loading,
    onClose,
    onConfirm,
}: {
    open: boolean;
    recipientName: string;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [customText, setCustomText] = useState('');

    useEffect(() => {
        if (!open) return;
        setTemplateId(null);
        setCustomText('');
    }, [open]);

    if (!open) return null;

    const resolvedReason = templateId ? resolveSerenataRejectReason(templateId, customText) : null;
    const canConfirm = resolvedReason != null && resolvedReason.length >= 3;

    return (
        <PanelSheet onClose={onClose} ariaLabel="Rechazar solicitud" maxWidthClass="sm:max-w-md" constrainHeight>
            <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
                <div className="flex shrink-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-fg">Rechazar solicitud</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            {recipientName} · el cliente verá el motivo en la notificación.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                    <p className="text-xs font-medium text-fg-muted">Motivo del rechazo</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {SERENATA_REJECT_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                disabled={loading}
                                onClick={() => setTemplateId(template.id)}
                                className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                                    templateId === template.id
                                        ? 'border-accent-border bg-accent-soft text-accent'
                                        : 'border-border bg-surface text-fg-muted hover:border-accent-border hover:text-fg'
                                }`}
                            >
                                {template.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => setTemplateId(SERENATA_REJECT_OTHER_ID)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                templateId === SERENATA_REJECT_OTHER_ID
                                    ? 'border-accent-border bg-accent-soft text-accent'
                                    : 'border-border bg-surface text-fg-muted hover:border-accent-border hover:text-fg'
                            }`}
                        >
                            Otro motivo
                        </button>
                    </div>
                    {templateId === SERENATA_REJECT_OTHER_ID ? (
                        <textarea
                            value={customText}
                            disabled={loading}
                            onChange={(event) => setCustomText(event.target.value)}
                            placeholder="Escribe el motivo (mín. 3 caracteres)"
                            rows={3}
                            className="mt-4 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent-border focus:outline-none"
                        />
                    ) : templateId ? (
                        <p className="mt-4 rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg-secondary">
                            {SERENATA_REJECT_TEMPLATES.find((entry) => entry.id === templateId)?.message}
                        </p>
                    ) : (
                        <p className="mt-4 text-xs text-fg-muted">Selecciona un motivo para continuar.</p>
                    )}
                </div>

                <div className="mt-5 grid shrink-0 gap-2 border-t border-border pt-5 sm:grid-cols-2">
                    <PanelButton type="button" variant="secondary" className="w-full" disabled={loading} onClick={onClose}>
                        Cancelar
                    </PanelButton>
                    <PanelButton
                        type="button"
                        className="w-full"
                        disabled={loading || !canConfirm}
                        onClick={() => {
                            if (!resolvedReason) return;
                            onConfirm(resolvedReason);
                        }}
                    >
                        {loading ? 'Rechazando…' : 'Confirmar rechazo'}
                    </PanelButton>
                </div>
            </div>
        </PanelSheet>
    );
}
