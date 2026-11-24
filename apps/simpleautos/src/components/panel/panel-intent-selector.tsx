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

export function PanelIntentSelector({
    hidden,
    accountId,
    operatorSubtype,
}: {
    hidden?: boolean;
    accountId?: string;
    operatorSubtype?: string | null;
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
            if (!dismissed && legacyStorageKey && localStorage.getItem(legacyStorageKey) === '1') {
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
            // ignore
        }
        setVisible(false);
    }

    if (!visible) return null;

    const serviceFirst = operatorSubtype === 'buyer_agent' || operatorSubtype === 'workshop';
    const options = serviceFirst ? [OPTIONS[2], OPTIONS[0], OPTIONS[1]] : OPTIONS;
    const firstOption = options[0];
    const firstDescription = operatorSubtype === 'buyer_agent'
        ? 'Publica tus servicios de asesoría y acompaña a tus clientes desde SimpleAutos.'
        : operatorSubtype === 'workshop'
            ? 'Presenta mecánica, mantenciones, revisión, lavado o detailing.'
            : firstOption.description;

    return (
        <PanelCard size="lg" className="space-y-4 p-4 md:p-6">
            <div className="space-y-1">
                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                    {serviceFirst ? 'Presenta el servicio que ofreces' : '¿Qué quieres hacer en SimpleAutos?'}
                </p>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Elige por dónde empezar; después puedes combinar vehículos, productos y servicios.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                {options.map((option, index) => (
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
                            <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                                {index === 0 ? firstDescription : option.description}
                            </p>
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
