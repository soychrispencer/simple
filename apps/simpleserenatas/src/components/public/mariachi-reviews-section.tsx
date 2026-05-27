'use client';

import { useEffect, useState } from 'react';
import { IconStarFilled } from '@tabler/icons-react';
import { PanelCard } from '@simple/ui/panel';
import { GroupRatingDisplay } from '@/components/public/group-rating-display';
import { normalizeGroupRating } from '@/lib/marketplace-group-display';
import { serenatasApi, type ProviderGroup, type ProviderGroupReview } from '@/lib/serenatas-api';

function formatReviewDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' }).format(date);
}

export function MariachiReviewsSection({ group }: { group: ProviderGroup }) {
    const summary = normalizeGroupRating(group);
    const [reviews, setReviews] = useState<ProviderGroupReview[]>([]);
    const [loading, setLoading] = useState(summary.count > 0);

    useEffect(() => {
        if (summary.count <= 0) {
            setReviews([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        void serenatasApi.marketplaceGroupReviews(group.slug).then((response) => {
            if (cancelled) return;
            if (response.ok && Array.isArray(response.items)) {
                setReviews(response.items);
            } else {
                setReviews([]);
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [group.slug, summary.count]);

    if (summary.count <= 0) return null;

    return (
        <section id="valoraciones" className="scroll-mt-24">
            <PanelCard className="min-w-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-fg">Valoraciones</h2>
                <GroupRatingDisplay group={group} size="md" />
            </div>
            {loading ? (
                <p className="mt-4 text-sm text-fg-muted">Cargando valoraciones…</p>
            ) : reviews.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted">
                    Promedio basado en confirmaciones de clientes que cerraron su serenata.
                </p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {reviews.map((review) => (
                        <li
                            key={`${review.confirmedAt}-${review.rating}`}
                            className="rounded-button border border-border px-3 py-2.5"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-0.5" aria-label={`${review.rating} de 5 estrellas`}>
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <IconStarFilled
                                            key={index}
                                            size={14}
                                            className={index < review.rating ? 'text-amber-500' : 'text-amber-500/25'}
                                            aria-hidden
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-fg-muted">{formatReviewDate(review.confirmedAt)}</span>
                            </div>
                            {review.comment ? (
                                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{review.comment}</p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
            </PanelCard>
        </section>
    );
}
