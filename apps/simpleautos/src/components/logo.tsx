'use client';

interface LogoProps {
    showText?: boolean;
    size?: 'sm' | 'md';
}

// Abstract aerodynamic shape inspired by hero illustrations
const AutosShape = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path 
            d="M3 14.5C6 11 10 9 14 9C18 9 21 11 21 14.5" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round"
        />
        <path 
            d="M2 17C5 13.5 9.5 12 14 12C18.5 12 22 13.5 22 17" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
            opacity="0.6"
        />
        <circle cx="6" cy="19" r="1.5" fill="currentColor" />
        <circle cx="18" cy="19" r="1.5" fill="currentColor" />
    </svg>
);

export function Logo({ showText = true, size = 'md' }: LogoProps) {
    const isSmall = size === 'sm';
    
    return (
        <div className="flex items-center gap-1 group shrink-0">
            <div 
                className={`flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
                    isSmall ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-[10px]'
                }`}
                style={{ background: 'var(--accent)', color: '#fff' }}
            >
                <AutosShape size={isSmall ? 16 : 18} />
            </div>
            {showText && (
                <span className={`inline-flex items-end gap-[0.08rem] tracking-tight text-(--fg) ${
                    isSmall ? 'text-[0.95rem]' : 'text-[1.05rem]'
                }`}>
                    <span className="font-semibold leading-none">Simple</span>
                    <span className="translate-y-[0.02em] font-normal leading-none text-(--fg-muted)">Autos</span>
                </span>
            )}
        </div>
    );
}
