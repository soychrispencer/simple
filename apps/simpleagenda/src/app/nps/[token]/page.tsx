'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IconCheck, IconHeart, IconLoader2, IconAlertCircle, IconStar } from '@tabler/icons-react';
import { fetchPublicNpsContext, submitPublicNps, type PublicNpsContext } from '@/lib/agenda-api';
import { fmtDateMedium } from '@/lib/format';

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function scoreColor(score: number) {
    if (score >= 9) return 'var(--accent)';
    if (score >= 7) return '#d97706';
    return '#dc2626';
}

export default function NpsPublicPage() {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? '';

    const [context, setContext] = useState<PublicNpsContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState<number | null>(null);
    const [comment, setComment] = useState('');
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
        if (score === null) {
            setError('Selecciona una puntuación antes de enviar.');
            return;
        }
        setError('');
        setSubmitting(true);
        const res = await submitPublicNps(token, score, comment.trim() || undefined);
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
                    <IconAlertCircle size={44} className="mx-auto mb-4" style={{ color: '#dc2626' }} />
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
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    >
                        <IconCheck size={32} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>¡Gracias por tu opinión!</h1>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Tu respuesta nos ayuda a mejorar la experiencia.
                    </p>
                    {context.professional ? (
                        <a
                            href={`/${context.professional.slug}`}
                            className="mt-6 inline-block px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--accent)', color: '#fff' }}
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
                            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
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
                    ¿Recomendarías {prof?.displayName ? `a ${prof.displayName}` : 'esta atención'}?
                </h1>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                    Del 0 al 10, ¿qué tan probable es que nos recomiendes?
                    {appt?.startsAt ? (
                        <>
                            {' '}
                            <span style={{ color: 'var(--fg-secondary)' }}>
                                Cita del {fmtDateMedium(appt.startsAt)}.
                            </span>
                        </>
                    ) : null}
                </p>

                <div className="grid grid-cols-11 gap-1 md:gap-1.5 mb-2">
                    {SCORES.map((n) => {
                        const active = score === n;
                        return (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setScore(n)}
                                aria-pressed={active}
                                aria-label={`${n} de 10`}
                                className="h-10 rounded-lg border text-sm font-semibold transition-colors"
                                style={{
                                    borderColor: active ? scoreColor(n) : 'var(--border)',
                                    background: active ? scoreColor(n) : 'var(--surface)',
                                    color: active ? '#fff' : 'var(--fg)',
                                }}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-between text-[11px] mb-5" style={{ color: 'var(--fg-muted)' }}>
                    <span>Nada probable</span>
                    <span>Muy probable</span>
                </div>

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

                {error ? (
                    <div
                        className="mt-3 text-sm px-3 py-2 rounded-lg border flex items-start gap-2"
                        style={{ borderColor: '#fecaca', background: 'color-mix(in srgb, #dc2626 6%, transparent)', color: '#991b1b' }}
                    >
                        <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || score === null}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
                        style={{ background: 'var(--accent)', color: '#fff' }}
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
