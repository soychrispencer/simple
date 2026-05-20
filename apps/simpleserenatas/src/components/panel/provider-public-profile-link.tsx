'use client';

import { useMemo, useState } from 'react';
import { PanelButton, PanelNotice } from '@simple/ui';
import { IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react';
import type { ProviderGroup } from '@/lib/serenatas-api';
import {
    previewSlugFromName,
    publicMariachiProfileUrl,
} from '@/lib/public-mariachi-routes';

export function ProviderPublicProfileLink({
    group,
    nameDraft,
}: {
    group: ProviderGroup | null;
    nameDraft: string;
}) {
    const [copied, setCopied] = useState(false);

    const slug = useMemo(() => {
        if (!group) return previewSlugFromName(nameDraft);
        const savedName = group.name.trim();
        const draft = nameDraft.trim();
        if (draft.length >= 2 && draft !== savedName) {
            return previewSlugFromName(draft);
        }
        return group.slug;
    }, [group, nameDraft]);

    const url = useMemo(() => (slug ? publicMariachiProfileUrl(slug) : ''), [slug]);
    const isPreview = group ? nameDraft.trim() !== group.name.trim() : true;
    const isPublic = group?.status === 'active';

    if (nameDraft.trim().length < 2) {
        return (
            <PanelNotice tone="neutral" className="!py-3">
                <p className="text-sm text-fg-muted">
                    Escribe el nombre del mariachi para generar tu enlace público (por ejemplo{' '}
                    <span className="font-mono text-fg">simpleserenatas.app/mariachi-los-reyes</span>).
                </p>
            </PanelNotice>
        );
    }

    async function copyUrl() {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <PanelNotice tone="neutral" className="!py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Enlace público</p>
            <p className="mt-2 break-all font-mono text-sm text-fg">{url}</p>
            {isPreview ? (
                <p className="mt-2 text-xs text-fg-muted">
                    Vista previa del enlace. Guarda el perfil para aplicar el slug definitivo (puede variar si el nombre ya existe).
                </p>
            ) : null}
            {!isPublic ? (
                <p className="mt-2 text-xs text-fg-muted">
                    La página solo es visible para clientes cuando el mariachi está <strong>activo en marketplace</strong>.
                </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
                <PanelButton variant="secondary" size="sm" onClick={() => void copyUrl()} disabled={!url}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied ? 'Copiado' : 'Copiar enlace'}
                </PanelButton>
                {isPublic ? (
                    <PanelButton
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        disabled={!url}
                    >
                        <IconExternalLink size={14} />
                        Ver página
                    </PanelButton>
                ) : null}
            </div>
        </PanelNotice>
    );
}
