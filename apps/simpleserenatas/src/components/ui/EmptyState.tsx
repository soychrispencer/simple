'use client';

import { IconBox, IconProps } from '@tabler/icons-react';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ComponentType<IconProps>;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ 
    title, 
    description, 
    icon: Icon = IconBox,
    action 
}: EmptyStateProps) {
    return (
        <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="text-zinc-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-zinc-500 mb-4">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="bg-rose-500 text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
