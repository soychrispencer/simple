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

interface Serenata {
    id: string;
    status: string;
    recipientName: string;
    date: string;
    captainName?: string;
    captainId?: string;
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
                    setSerenata(data.serenata);
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
                    role: user?.role === 'captain' ? 'captain' : 'client',
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
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <IconLoader className="animate-spin text-rose-500" size={32} />
            </div>
        );
    }

    if (!serenata) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <p className="text-zinc-500">Serenata no encontrada</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconCheck className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">¡Gracias!</h2>
                    <p className="text-zinc-500 mb-6">Tu review ha sido enviado exitosamente.</p>
                    <button
                        onClick={() => router.push('/inicio')}
                        className="bg-rose-500 text-white px-6 py-3 rounded-xl font-medium"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const isClient = user?.role !== 'captain';
    const reviewTarget = isClient ? serenata.captainName : 'el cliente';

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <button 
                    onClick={() => router.push('/inicio')}
                    className="flex items-center gap-2 text-zinc-600 mb-4"
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <h1 className="text-xl font-bold text-zinc-900">Calificar serenata</h1>
                <p className="text-sm text-zinc-500">
                    {isClient 
                        ? `¿Cómo fue el servicio de ${serenata.captainName || 'tu capitán'}?`
                        : '¿Cómo fue tu experiencia con este cliente?'
                    }
                </p>
            </div>

            {/* Review Form */}
            <div className="px-6 py-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    {/* Stars */}
                    <div className="text-center mb-6">
                        <p className="text-sm text-zinc-500 mb-3">Selecciona una calificación</p>
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
                                        <IconStar className="text-zinc-300" size={40} />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-lg font-medium text-zinc-900 mt-2">
                            {rating === 1 && 'Mala'}
                            {rating === 2 && 'Regular'}
                            {rating === 3 && 'Buena'}
                            {rating === 4 && 'Muy buena'}
                            {rating === 5 && 'Excelente'}
                        </p>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Comentario (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={isClient 
                                ? '¿Qué te gustó? ¿Qué podría mejorar?'
                                : '¿Cómo fue trabajar con este cliente?'
                            }
                            className="w-full px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[120px] resize-none"
                            maxLength={500}
                        />
                        <p className="text-xs text-zinc-400 mt-1 text-right">
                            {comment.length}/500
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className="w-full bg-rose-500 text-white py-4 rounded-xl font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                <p className="text-xs text-zinc-400 text-center mt-4">
                    Tu review ayuda a mejorar la comunidad de SimpleSerenatas
                </p>
            </div>
        </div>
    );
}
