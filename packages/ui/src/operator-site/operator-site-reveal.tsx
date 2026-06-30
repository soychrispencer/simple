'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';

export type OperatorSiteRevealProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
};

export function OperatorSiteReveal({ children, className, delayMs = 0 }: OperatorSiteRevealProps) {
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
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={joinClasses('os-reveal', visible && 'os-reveal--visible', className)}
            style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
        >
            {children}
        </div>
    );
}
