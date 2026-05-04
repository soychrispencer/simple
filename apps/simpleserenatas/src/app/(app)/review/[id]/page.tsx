'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    IconArrowLeft,
    IconStar,
    IconStarFilled,
    IconSend,
    IconLoader,
    IconCheck,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Serenata {
    id: string;
    status: string;
    recipientName: string;
    date: string;
    coordinatorName?: string;
    coordinatorId?: string;
    hasReview?: boolean;
}

export default function ReviewPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const serenataId = params.id as string;

    const [serenata, setSerenata] = useState<Serenata | null>(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetchSerenata();
    }, [serenataId]);

    const fetchSerenata = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ok) {
                    setSerenata({
                        ...data.serenata,
                        coordinatorName: data.serenata.coordinatorName,
                        coordinatorId: data.serenata.coordinatorId,
                    });
                    // Check if already reviewed
                    const reviewsRes = await fetch(`${API_BASE}/api/serenatas/${serenataId}/reviews`, {
                        credentials: 'include',
                    });
                    if (reviewsRes.ok) {
                        const reviewsData = await reviewsRes.json();
                        const myReview = reviewsData.reviews?.find((r: any) => r.reviewer?.id === user?.id);
                        if (myReview) {
                            setSubmitted(true);
                            setRating(myReview.rating);
                            setComment(myReview.comment || '');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Selecciona una calificación');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    rating,
                    comment,
                    role: user?.role === 'coordinator' ? 'coordinator' : 'client',
                }),
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                const data = await res.json();
                alert(data.error || 'Error al enviar review');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    if (!serenata) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center px-6">
                <p style={{ color: 'var(--fg-secondary)' }}>Serenata no encontrada</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
                <div className="text-center">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'color-mix(in oklab, var(--success) 15%, transparent)' }}
                    >
                        <IconCheck size={32} style={{ color: 'var(--success)' }} />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fg)' }}>¡Gracias!</h2>
                    <p className="mb-6" style={{ color: 'var(--fg-secondary)' }}>Tu review ha sido enviado exitosamente.</p>
                    <button
                        onClick={() => router.push('/inicio')}
                        className="px-6 py-3 rounded-xl font-medium"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const isClient = user?.role !== 'coordinator';

    return (
        <div className="pb-10">
            <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button 
                    type="button"
                    onClick={() => router.push('/inicio')}
                    className="serenatas-interactive mb-4 flex items-center gap-2 rounded-lg"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <SerenatasPageHeader
                    title="Calificar serenata"
                    description={
                        isClient
                            ? `¿Cómo fue el servicio de ${serenata.coordinatorName || 'tu coordinador'}?`
                            : '¿Cómo fue tu experiencia con este cliente?'
                    }
                    className="!mb-0"
                />
            </div>

            <SerenatasPageShell width="narrow">
                <div className="rounded-xl p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {/* Stars */}
                    <div className="text-center mb-6">
                        <p className="text-sm mb-3" style={{ color: 'var(--fg-secondary)' }}>Selecciona una calificación</p>
                        <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    {star <= (hoverRating || rating) ? (
                                        <IconStarFilled className="text-amber-400" size={40} />
                                    ) : (
                                        <IconStar size={40} style={{ color: 'var(--border-strong)' }} />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-lg font-medium mt-2" style={{ color: 'var(--fg)' }}>
                            {rating === 1 && 'Mala'}
                            {rating === 2 && 'Regular'}
                            {rating === 3 && 'Buena'}
                            {rating === 4 && 'Muy buena'}
                            {rating === 5 && 'Excelente'}
                        </p>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                            Comentario (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={isClient 
                                ? '¿Qué te gustó? ¿Qué podría mejorar?'
                                : '¿Cómo fue trabajar con este cliente?'
                            }
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 min-h-[120px] resize-none"
                            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            maxLength={500}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: 'var(--fg-muted)' }}>
                            {comment.length}/500
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className="w-full py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        {isSubmitting ? (
                            <IconLoader className="animate-spin" size={20} />
                        ) : (
                            <IconSend size={20} />
                        )}
                        {isSubmitting ? 'Enviando...' : 'Enviar review'}
                    </button>
                </div>

                {/* Info */}
                <p className="text-xs text-center mt-4" style={{ color: 'var(--fg-muted)' }}>
                    Tu review ayuda a mejorar la comunidad de SimpleSerenatas
                </p>
            </SerenatasPageShell>
        </div>
    );
}
