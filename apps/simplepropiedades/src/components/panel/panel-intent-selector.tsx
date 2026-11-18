'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconBuildingCommunity, IconHome2, IconMessageCircle, IconListDetails } from '@tabler/icons-react';
import { PanelButton, PanelCard } from '@simple/ui/panel';

const STORAGE_KEY = 'simplepropiedades-panel-intent-dismissed-v1';

type IntentOption = {
    key: string;
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
};

export function PanelIntentSelector({
    hidden,
    accountId,
    operatorSubtype,
    memberRole,
    onDismiss,
}: {
    hidden?: boolean;
    accountId?: string;
    operatorSubtype?: string | null;
    memberRole?: string | null;
    onDismiss?: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const activityKey = operatorSubtype?.trim() || 'default';
    const legacyStorageKey = accountId ? `${STORAGE_KEY}:${accountId}` : null;
    const storageKey = accountId ? `${STORAGE_KEY}:${accountId}:${activityKey}` : null;

    useEffect(() => {
        if (hidden || !storageKey) {
            setVisible(false);
            return;
        }
        try {
            let dismissed = localStorage.getItem(storageKey) === '1';
            if (legacyStorageKey && localStorage.getItem(legacyStorageKey) === '1') {
                localStorage.setItem(storageKey, '1');
                localStorage.removeItem(legacyStorageKey);
                dismissed = true;
            }
            setVisible(!dismissed);
        } catch {
            setVisible(true);
        }
    }, [hidden, legacyStorageKey, storageKey]);

    function dismiss() {
        try {
            if (storageKey) localStorage.setItem(storageKey, '1');
            if (legacyStorageKey) localStorage.removeItem(legacyStorageKey);
        } catch {
            // La elección sigue siendo útil aunque el navegador no guarde la preferencia.
        }
        setVisible(false);
        onDismiss?.();
    }

    if (!visible) return null;

    const projectFirst = operatorSubtype === 'developer';
    const options: IntentOption[] = [
        projectFirst
            ? {
                key: 'project',
                title: 'Presentar un proyecto',
                description: 'Publica el proyecto y organiza el interés por sus unidades.',
                href: '/panel/publicar?op=project',
                icon: <IconBuildingCommunity size={18} />,
            }
            : {
                key: 'property',
                title: 'Publicar una propiedad',
                description: 'Crea un aviso y atiende las consultas desde Simple.',
                href: '/panel/publicar',
                icon: <IconHome2 size={18} />,
            },
        {
            key: 'contacts',
            title: 'Organizar contactos',
            description: 'Revisa consultas, responsables y próximos pasos.',
            href: '/panel/contactos',
            icon: <IconMessageCircle size={18} />,
        },
        {
            key: 'portfolio',
            title: 'Ver mi cartera',
            description: memberRole === 'agent'
                ? 'Revisa las propiedades y publicaciones que tienes asignadas.'
                : 'Administra las propiedades y publicaciones del espacio.',
            href: '/panel/publicaciones',
            icon: <IconListDetails size={18} />,
        },
    ];

    return (
        <PanelCard size="lg" className="space-y-4 p-4 md:p-6">
            <div className="space-y-1">
                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>¿Qué quieres resolver primero?</p>
                <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                    Simple reúne publicaciones, contactos y seguimiento. Elige por dónde partir; puedes combinar las herramientas después.
                </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                {options.map((option) => (
                    <Link
                        key={option.key}
                        href={option.href}
                        onClick={dismiss}
                        className="flex flex-col gap-3 rounded-2xl border p-4 transition-colors hover:bg-bg-muted"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                            {option.icon}
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium" style={{ color: 'var(--fg)' }}>{option.title}</p>
                            <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>{option.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
            <div className="flex justify-end">
                <PanelButton type="button" variant="ghost" size="sm" onClick={dismiss}>Omitir por ahora</PanelButton>
            </div>
        </PanelCard>
    );
}
