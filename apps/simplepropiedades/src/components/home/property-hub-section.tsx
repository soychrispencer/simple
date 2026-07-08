'use client';

import Link from 'next/link';
import { IconArrowRight, IconShoppingBag, IconTool } from '@tabler/icons-react';
import { getOperatorProductCategories, getOperatorServiceCategories } from '@simple/utils';
import { PanelCard } from '@simple/ui/panel';

const FEATURED_SERVICE_CATEGORIES = ['cleaning', 'maintenance', 'moving', 'appraisal'] as const;
const FEATURED_PRODUCT_CATEGORIES = ['interior', 'exterior', 'tools', 'other'] as const;

export function PropertyHubSection() {
    const serviceCategories = getOperatorServiceCategories('propiedades');
    const productCategories = getOperatorProductCategories('propiedades');

    return (
        <section className="container-app section-marketing">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-2">
                    <p className="text-sm font-medium text-fg-muted">Todo para tu hogar</p>
                    <h2 className="text-2xl font-semibold text-fg md:text-3xl">Servicios y productos cerca de ti</h2>
                    <p className="text-base text-fg-secondary">
                        Aseo, mudanzas, tasaciones y artículos para el hogar — de negocios verificados en SimplePropiedades.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/servicios" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:underline">
                        Ver servicios <IconArrowRight size={14} />
                    </Link>
                    <Link href="/productos" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:underline">
                        Ver productos <IconArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard size="lg" className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle text-fg">
                            <IconTool size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-fg">Servicios inmobiliarios</h3>
                            <p className="text-sm text-fg-muted">Aseo, mudanzas, tasaciones y más</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {FEATURED_SERVICE_CATEGORIES.map((id) => {
                            const item = serviceCategories.find((category) => category.id === id);
                            if (!item) return null;
                            return (
                                <Link
                                    key={item.id}
                                    href={`/servicios?category=${encodeURIComponent(item.id)}`}
                                    className="inline-flex rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-bg-muted"
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </PanelCard>

                <PanelCard size="lg" className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle text-fg">
                            <IconShoppingBag size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-fg">Productos para el hogar</h3>
                            <p className="text-sm text-fg-muted">Artículos y suministros de negocios locales</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {FEATURED_PRODUCT_CATEGORIES.map((id) => {
                            const item = productCategories.find((category) => category.id === id);
                            if (!item) return null;
                            return (
                                <Link
                                    key={item.id}
                                    href={`/productos?category=${encodeURIComponent(item.id)}`}
                                    className="inline-flex rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-bg-muted"
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </PanelCard>
            </div>
        </section>
    );
}
