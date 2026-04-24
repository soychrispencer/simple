'use client';

interface LogoProps {
    showText?: boolean;
    size?: 'sm' | 'md';
}

// Abstract architectural L-shape inspired by hero illustrations
const PropiedadesShape = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path 
            d="M4 20V10L12 4L20 10V20" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path 
            d="M9 20V13H15V20" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
        />
        <rect x="10.5" y="7" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.9" />
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
                <PropiedadesShape size={isSmall ? 16 : 18} />
            </div>
            {showText && (
                <span className={`inline-flex items-end gap-[0.08rem] tracking-tight text-(--fg) ${
                    isSmall ? 'text-[0.95rem]' : 'text-[1.05rem]'
                }`}>
                    <span className="font-semibold leading-none">Simple</span>
                    <span className="translate-y-[0.02em] font-normal leading-none text-(--fg-muted)">Propiedades</span>
                </span>
            )}
        </div>
    );
}
