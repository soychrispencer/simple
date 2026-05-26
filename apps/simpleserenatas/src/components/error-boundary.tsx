'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PanelCard, PanelButton, PanelNotice } from '@simple/ui/panel';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in SimpleSerenatas:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
                    <PanelCard className="max-w-md text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconAlertTriangle size={32} />
                        </div>
                        <h1 className="mt-6 text-xl font-bold" style={{ color: 'var(--fg)' }}>Algo salió mal</h1>
                        <p className="mt-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            La aplicación encontró un error inesperado. Hemos registrado el incidente.
                        </p>
                        <PanelNotice tone="error" className="mt-4 text-left text-xs">
                            {this.state.error?.message || 'Error desconocido'}
                        </PanelNotice>
                        <div className="mt-6 grid gap-2">
                            <PanelButton onClick={() => window.location.reload()}>
                                <IconRefresh size={16} className="mr-2" />
                                Reintentar cargar
                            </PanelButton>
                            <PanelButton variant="secondary" onClick={() => this.setState({ hasError: false, error: null })}>
                                Intentar continuar
                            </PanelButton>
                        </div>
                    </PanelCard>
                </div>
            );
        }

        return this.props.children;
    }
}
