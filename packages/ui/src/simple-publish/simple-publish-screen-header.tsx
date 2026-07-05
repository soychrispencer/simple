'use client';

export type SimplePublishScreenHeaderProps = {
    title: string;
    description?: string;
};

export function SimplePublishScreenHeader({ title, description }: SimplePublishScreenHeaderProps) {
    return (
        <header className="mb-5 sm:mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-(--fg) sm:text-[1.35rem]">
                {title}
            </h2>
            {description ? (
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-(--fg-muted)">
                    {description}
                </p>
            ) : null}
        </header>
    );
}
