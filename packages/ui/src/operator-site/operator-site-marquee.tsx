'use client';

type OperatorSiteMarqueeProps = {
    items: string[];
};

export function OperatorSiteMarquee({ items }: OperatorSiteMarqueeProps) {
    const unique = items.map((item) => item.trim()).filter(Boolean);
    if (unique.length < 2) return null;

    const track = [...unique, ...unique];

    return (
        <div className="os-marquee" aria-hidden>
            <div className="os-marquee__track">
                {track.map((text, index) => (
                    <span key={`${text}-${index}`} className="os-marquee__item">
                        {text}
                        <span className="os-marquee__sep">✦</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
