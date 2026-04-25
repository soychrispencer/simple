'use client';

import { IconLoader2 } from '@tabler/icons-react';

interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    text?: string;
}

const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
};

export function Loading({ size = 'md', fullScreen = false, text }: LoadingProps) {
    const content = (
        <div className="flex flex-col items-center justify-center gap-3">
            <IconLoader2 
                className={`animate-spin text-rose-500 ${sizeClasses[size]}`} 
            />
            {text && (
                <p className="text-zinc-500 text-sm">{text}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                {content}
            </div>
        );
    }

    return (
        <div className="p-8 flex items-center justify-center">
            {content}
        </div>
    );
}
