import Link from 'next/link';

export type SiteInfoSection = {
    title: string;
    paragraphs: string[];
    bullets?: string[];
};

export type SiteInfoPageData = {
    eyebrow: string;
    title: string;
    intro: string;
    summary: string[];
    sections: SiteInfoSection[];
    primaryCta: {
        label: string;
        href: string;
    };
    secondaryCta?: {
        label: string;
        href: string;
    };
    footerNav: Array<{
        label: string;
        href: string;
    }>;
};

export function SiteInfoPage({ page }: { page: SiteInfoPageData }) {
    const sectionAnchors = page.sections.map((section) => ({
        ...section,
        id: slugify(section.title),
    }));

    return (
        <main>
            <section className="container-app py-16 md:py-20">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="max-w-4xl">
                        <p
                            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            {page.eyebrow}
                        </p>
                        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl" style={{ color: 'var(--fg)' }}>
                            {page.title}
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-8 md:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                            {page.intro}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link href={page.primaryCta.href} className="btn btn-primary">
                                {page.primaryCta.label}
                            </Link>
                            {page.secondaryCta ? (
                                <Link href={page.secondaryCta.href} className="btn btn-outline">
                                    {page.secondaryCta.label}
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    <aside
                        className="h-fit rounded-[24px] border p-5 lg:sticky lg:top-24"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                            Puntos clave
                        </p>
                        <ul className="mt-4 space-y-3">
                            {page.summary.map((item) => (
                                <li key={item} className="flex items-start gap-3 text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>
                                    <span
                                        className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0"
                                        style={{ background: 'var(--fg)' }}
                                    />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                                Navegación
                            </p>
                            <nav className="mt-3 flex flex-col gap-2">
                                {page.footerNav.map((item) => (
                                    <Link key={item.href} href={item.href} className="text-sm transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg-secondary)' }}>
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </aside>
                </div>
            </section>

            <section className="container-app pb-20">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <article className="space-y-10">
                        {sectionAnchors.map((section) => (
                            <section
                                key={section.id}
                                id={section.id}
                                className="rounded-[28px] border px-6 py-7 md:px-8"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <h2 className="text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--fg)' }}>
                                    {section.title}
                                </h2>

                                <div className="mt-4 space-y-4">
                                    {section.paragraphs.map((paragraph) => (
                                        <p key={paragraph} className="text-sm leading-7 md:text-[15px]" style={{ color: 'var(--fg-secondary)' }}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>

                                {section.bullets?.length ? (
                                    <ul className="mt-5 space-y-3">
                                        {section.bullets.map((bullet) => (
                                            <li key={bullet} className="flex items-start gap-3 text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>
                                                <span
                                                    className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0"
                                                    style={{ background: 'var(--fg)' }}
                                                />
                                                <span>{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </section>
                        ))}
                    </article>

                    <aside className="hidden lg:block">
                        <div className="rounded-[24px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                                En esta página
                            </p>
                            <nav className="mt-4 flex flex-col gap-2.5">
                                {sectionAnchors.map((section) => (
                                    <a key={section.id} href={`#${section.id}`} className="text-sm transition-colors hover:text-[var(--fg)]" style={{ color: 'var(--fg-secondary)' }}>
                                        {section.title}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
