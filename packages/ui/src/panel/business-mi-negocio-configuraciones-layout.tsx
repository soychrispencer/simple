'use client';

import type { ReactNode } from 'react';

export type BusinessMiNegocioConfiguracionesLayoutProps = {
    notice?: ReactNode;
    children: ReactNode;
};

/** Layout de Configuraciones: solo reglas y preferencias del negocio. */
export function BusinessMiNegocioConfiguracionesLayout({
    notice,
    children,
}: BusinessMiNegocioConfiguracionesLayoutProps) {
    return (
        <div className="flex w-full min-w-0 flex-col gap-6">
            {notice}
            {children}
        </div>
    );
}
