type Props = {
    tags: string[];
    max?: number;
    align?: 'start' | 'center';
    size?: 'xs' | 'sm';
};

export default function ListingMetaTags({ tags, max = 4, align = 'start', size = 'xs' }: Props) {
    const visible = tags.slice(0, max);
    if (visible.length === 0) return null;
    const sizeClass = size === 'sm' ? 'text-[12px] px-2 py-0.5' : 'text-[11px] px-2 py-0.5';
    const alignClass = align === 'center' ? 'justify-center' : 'justify-start';
    return (
        <div className={`flex flex-wrap gap-1.5 ${alignClass}`}>
            {visible.map((tag) => (
                <span
                    key={tag}
                    className={`${sizeClass} rounded-md whitespace-nowrap`}
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                >
                    {tag}
                </span>
            ))}
        </div>
    );
}
