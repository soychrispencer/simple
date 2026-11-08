'use client';

import { useState } from 'react';
import { IconBrandWhatsapp, IconCheck, IconCopy, IconSparkles } from '@tabler/icons-react';

export function WhatsAppSnippetCard() {
    const [copied, setCopied] = useState(false);

    const messageTemplate =
        '¡Hola! 👋 Gracias por escribirme. Para ver mis horarios disponibles en tiempo real y elegir el que más te acomode, puedes agendar directamente aquí:\n\n👉 https://simpleagenda.app/mi-agenda\n\nTu cita se confirma automáticamente y te llegará un recordatorio antes de la sesión. ¡Nos vemos!';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(messageTemplate);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    return (
        <section className="scroll-mt-24 border-b border-[var(--border)] py-14 sm:py-20" style={{ background: 'var(--bg-subtle)' }}>
            <div className="container-app">
                <div className="agenda-surface-card max-w-4xl mx-auto rounded-2xl p-6 sm:p-10 relative">
                    <div className="grid lg:grid-cols-12 gap-8 items-center">
                        {/* Left column: Explanatory copy */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent-ink)] shadow-2xs">
                                <IconBrandWhatsapp size={14} />
                                Atiende en automático
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--fg)] leading-snug">
                                Pasa de coordinar por chat a recibir citas confirmadas en 2 segundos
                            </h2>
                            <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                                No tienes que cambiar tu forma de trabajar ni pedirle a tus pacientes que descarguen nada. Solo configura esta respuesta rápida en WhatsApp Business y compártela cada vez que alguien consulte por tu disponibilidad.
                            </p>
                            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-[var(--fg-secondary)]">
                                <IconSparkles size={16} className="text-[var(--accent-ink)] shrink-0" />
                                <span>Tus pacientes reservan en 30 segundos desde cualquier celular.</span>
                            </div>
                        </div>

                        {/* Right column: WhatsApp chat bubble preview */}
                        <div className="lg:col-span-6">
                            <div className="rounded-2xl bg-[var(--bg-subtle)] p-4 sm:p-5">
                                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3 text-xs text-[var(--fg-muted)]">
                                    <span className="font-semibold text-[var(--fg)] flex items-center gap-1.5">
                                        <IconBrandWhatsapp size={14} className="text-[var(--accent-ink)]" />
                                        Plantilla recomendada
                                    </span>
                                    <span>Respuesta Rápida /agenda</span>
                                </div>

                                {/* Speech bubble */}
                                <div className="rounded-2xl rounded-tl-sm bg-[var(--surface)] p-4 shadow-xs text-xs sm:text-sm leading-relaxed text-[var(--fg)] space-y-2">
                                    <p>¡Hola! 👋 Gracias por escribirme. Para ver mis horarios disponibles en tiempo real y elegir el que más te acomode, puedes agendar directamente aquí:</p>
                                    <p className="font-semibold text-[var(--accent-ink)] break-all bg-[var(--accent-subtle)] px-2.5 py-1.5 rounded-xl border border-[var(--accent-border)]">
                                        👉 https://simpleagenda.app/tu-nombre
                                    </p>
                                    <p className="text-xs text-[var(--fg-secondary)]">
                                        Tu cita se confirma automáticamente y te llegará un recordatorio antes de la sesión. ¡Nos vemos!
                                    </p>
                                    <div className="flex justify-end items-center gap-1 text-[10px] text-[var(--fg-muted)] pt-1">
                                        <span>12:35</span>
                                        <span className="text-[var(--accent-ink)] font-bold">✓✓</span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="w-full h-11 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
                                        style={{
                                            background: copied ? 'var(--color-success-solid)' : 'var(--accent)',
                                            color: copied ? 'var(--agenda-white)' : 'var(--accent-contrast)',
                                        }}
                                    >
                                        {copied ? (
                                            <>
                                                <IconCheck size={16} />
                                                ¡Mensaje copiado al portapapeles!
                                            </>
                                        ) : (
                                            <>
                                                <IconCopy size={16} />
                                                Copiar respuesta rápida para WhatsApp
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
