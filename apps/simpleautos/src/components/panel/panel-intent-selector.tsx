'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconCar, IconShoppingBag, IconTool } from '@tabler/icons-react';
import { PanelButton, PanelCard } from '@simple/ui/panel';

const STORAGE_KEY = 'simpleautos-panel-intent-dismissed-v1';

type IntentOption = {
    key: string;
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
};

const OPTIONS: IntentOption[] = [
    {
        key: 'vehicles',
        title: 'Vender vehículos',
        description: 'Publica autos, motos o camiones en venta o arriendo.',
        href: '/panel/publicar',
        icon: <IconCar size={18} />,
    },
    {
        key: 'products',
        title: 'Vender productos',
        description: 'Accesorios, repuestos, stickers y más en tu tienda.',
        href: '/panel/publicar?op=product',
        icon: <IconShoppingBag size={18} />,
    },
    {
        key: 'services',
        title: 'Ofrecer servicios',
        description: 'Lavado, taller, detailing u otros servicios automotrices.',
        href: '/panel/publicar?op=service',
        icon: <IconTool size={18} />,
    },
];

export function PanelIntentSelector({ hidden, accountId }: { hidden?: boolean; accountId?: string }) {
    const [visible, setVisible] = useState(false);
    const storageKey = accountId ? `${STORAGE_KEY}:${accountId}` : null;

    useEffect(() => {
        if (hidden || !storageKey) {
            setVisible(false);
            return;
        }
        try {
            setVisible(localStorage.getItem(storageKey) !== '1');
        } catch {
            setVisible(true);
        }
    }, [hidden, storageKey]);

    function dismiss() {
        try {
            if (storageKey) localStorage.setItem(storageKey, '1');
        } catch {
            // ignore
        }
        setVisible(false);
    }

    if (!visible) return null;

    return (
        <PanelCard size="lg" className="space-y-4 p-4 md:p-6">
            <div className="space-y-1">
                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>¿Qué quieres hacer en SimpleAutos?</p>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Elige tu camino — puedes combinar vehículos, productos y servicios después.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                {OPTIONS.map((option) => (
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
