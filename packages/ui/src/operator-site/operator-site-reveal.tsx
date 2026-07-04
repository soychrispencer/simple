'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';

export type OperatorSiteRevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'scale-in';

export type OperatorSiteRevealProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
    /** Animación de entrada. Default: 'fade-up' */
    variant?: OperatorSiteRevealVariant;
    /** Índice para stagger automático (delay = index * 80ms) */
    staggerIndex?: number;
};

export function OperatorSiteReveal({
    children,
    className,
    delayMs,
    variant = 'fade-up',
    staggerIndex,
}: OperatorSiteRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const computedDelay = delayMs ?? (staggerIndex != null ? staggerIndex * 80 : 0);

    return (
        <div
            ref={ref}
            className={joinClasses(
                'os-reveal',
                `os-reveal--${variant}`,
                visible && 'os-reveal--visible',
                className,
            )}
            style={computedDelay > 0 ? { transitionDelay: `${computedDelay}ms` } : undefined}
        >
            {children}
        </div>
    );
}
