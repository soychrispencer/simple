'use client';

import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorState({ 
    title = 'Algo salió mal', 
    message, 
    onRetry 
}: ErrorStateProps) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconAlertCircle className="text-rose-500" size={32} />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 mb-4">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="bg-rose-500 text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors"
                    >
                        Intentar de nuevo
                    </button>
                )}
            </div>
        </div>
    );
}
