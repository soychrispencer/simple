'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IconCheck, IconHeart, IconLoader2, IconAlertCircle, IconStar } from '@tabler/icons-react';
import { fetchPublicNpsContext, submitPublicNps, type PublicNpsContext } from '@/lib/agenda-api';
import { fmtDateMedium } from '@/lib/format';

const STARS = [1, 2, 3, 4, 5] as const;
const STAR_LABELS: Record<number, string> = {
    1: 'Muy mala experiencia',
    2: 'Podría mejorar',
    3: 'Buena atención',
    4: 'Muy buena atención',
    5: 'Excelente atención',
};

function scoreColor(score: number) {
    if (score >= 9) return 'var(--accent)';
    if (score >= 7) return 'var(--color-warning-solid)';
    return 'var(--color-error-solid)';
}

export default function NpsPublicPage() {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? '';

    const [context, setContext] = useState<PublicNpsContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [stars, setStars] = useState<number | null>(null);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [publicConsent, setPublicConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;
        let active = true;
        (async () => {
            const ctx = await fetchPublicNpsContext(token);
            if (!active) return;
            setContext(ctx);
            if (ctx?.alreadySubmitted) setDone(true);
            setLoading(false);
        })();
        return () => { active = false; };
    }, [token]);

    const handleSubmit = async () => {
        if (stars === null) {
            setError('Selecciona una calificación de 1 a 5 estrellas antes de enviar.');
            return;
        }
        setError('');
        setSubmitting(true);
        const res = await submitPublicNps(token, stars, comment.trim() || undefined, publicConsent);
        setSubmitting(false);
        if (res.ok) {
            setDone(true);
        } else {
            setError(res.error ?? 'No pudimos registrar tu respuesta. Intenta de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
                <IconLoader2 size={28} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
            </div>
        );
    }

    if (!context) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
                <div className="text-center max-w-sm">
                    <IconAlertCircle size={44} className="mx-auto mb-4" style={{ color: 'var(--color-error)' }} />
                    <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Enlace inválido</h1>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        El enlace de la encuesta no es válido o ha expirado.
                    </p>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
                <div className="text-center max-w-sm">
                    <div
                        className="mx-auto mb-4 flex size-16 items-center justify-center rounded-card bg-(--accent-soft) text-(--accent-ink)"
                    >
                        <IconCheck size={32} aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>¡Gracias por tu opinión!</h1>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Tu respuesta nos ayuda a mejorar la experiencia.
                    </p>
                    {context.professional ? (
                        <a
                            href={`/${context.professional.slug}`}
                            className="mt-6 inline-block px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            Volver al perfil
                        </a>
                    ) : null}
                </div>
            </div>
        );
    }

    const prof = context.professional;
    const appt = context.appointment;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6" style={{ background: 'var(--bg)' }}>
            <div
                className="w-full max-w-lg rounded-2xl border p-6 md:p-8"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="flex items-center gap-3 mb-4">
                    {prof?.avatarUrl ? (
                         
                        <img
                            src={prof.avatarUrl}
                            alt={prof.displayName}
                            className="w-12 h-12 rounded-full object-cover border"
                            style={{ borderColor: 'var(--border)' }}
                        />
                    ) : (
                        <span
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
                        >
                            <IconHeart size={22} />
                        </span>
                    )}
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Encuesta</div>
                        <div className="text-base font-semibold truncate" style={{ color: 'var(--fg)' }}>
                            {prof?.displayName ?? 'Profesional'}
                        </div>
                    </div>
                </div>

                <h1 className="text-lg md:text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                    ¿Cómo calificarías tu atención{prof?.displayName ? ` con ${prof.displayName}` : ''}?
                </h1>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                    Elige de 1 a 5 estrellas según tu experiencia.
                    {appt?.startsAt ? (
                        <>
                            {' '}
                            <span style={{ color: 'var(--fg-secondary)' }}>
                                Cita del {fmtDateMedium(appt.startsAt)}.
                            </span>
                        </>
                    ) : null}
                </p>

                <div className="flex items-center justify-center gap-2 mb-2">
                    {STARS.map((value) => {
                        const active = (hoveredStar ?? stars ?? 0) >= value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStars(value)}
                                onMouseEnter={() => setHoveredStar(value)}
                                onMouseLeave={() => setHoveredStar(null)}
                                aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                                aria-pressed={stars === value}
                                className="p-1.5 rounded-xl transition-transform hover:scale-110 focus:outline-none"
                                style={{
                                    color: active ? '#f59e0b' : 'var(--border-strong, var(--border))',
                                }}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-9 h-9 md:w-10 md:h-10"
                                    fill={active ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    strokeWidth={1.75}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                    />
                                </svg>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-center min-h-[1rem] mb-5" style={{ color: 'var(--fg-muted)' }}>
                    {(hoveredStar ?? stars) ? `${hoveredStar ?? stars}/5 · ${STAR_LABELS[hoveredStar ?? stars ?? 5]}` : 'Toca una estrella para calificar'}
                </p>

                <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>
                    Comentario <span className="normal-case" style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                    placeholder="Cuéntanos qué te gustó o qué podríamos mejorar…"
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-(--accent)"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                />

                <label className="flex items-start gap-2.5 mt-4 mb-2 cursor-pointer select-none text-xs" style={{ color: 'var(--fg-secondary)' }}>
                    <input
                        type="checkbox"
                        checked={publicConsent}
                        onChange={(e) => setPublicConsent(e.target.checked)}
                        className="mt-0.5 rounded border"
                    />
                    <span>
                        Autorizo mostrar mi calificación y comentario con mi nombre de pila en la página pública del profesional.
                    </span>
                </label>

                {error ? (
                    <div
                        className="mt-3 text-sm px-3 py-2 rounded-lg border flex items-start gap-2"
                        style={{ borderColor: 'var(--color-error-border)', background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
                    >
                        <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || stars === null}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        {submitting ? (
                            <IconLoader2 size={15} className="animate-spin" />
                        ) : (
                            <IconStar size={15} />
                        )}
                        Enviar respuesta
                    </button>
                </div>
            </div>
        </div>
    );
}
