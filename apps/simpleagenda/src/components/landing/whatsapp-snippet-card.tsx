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
        <section className="scroll-mt-24 border-b border-[var(--border)] py-14 sm:py-18" style={{ background: 'var(--bg)' }}>
            <div className="container-app">
                <div className="max-w-4xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 shadow-sm overflow-hidden relative">
                    {/* Background glow */}
                    <div
                        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
                        style={{ background: '#25D366' }}
                        aria-hidden
                    />

                    <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
                        {/* Left column: Explanatory copy */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <IconBrandWhatsapp size={15} />
                                Atiende en automático
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg)] leading-snug">
                                Pasa de coordinar por chat a recibir citas confirmadas en 2 segundos
                            </h2>
                            <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                                No tienes que cambiar tu forma de trabajar ni convencer a tus pacientes de instalar nada. Solo configura esta respuesta rápida en WhatsApp Business y compártela cada vez que alguien pregunte por tu disponibilidad.
                            </p>
                            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-[var(--fg-secondary)]">
                                <IconSparkles size={16} className="text-amber-500 shrink-0" />
                                <span>Tus pacientes reservan en 30 segundos desde cualquier celular.</span>
                            </div>
                        </div>

                        {/* Right column: Simulated WhatsApp chat bubble */}
                        <div className="lg:col-span-6">
                            <div className="rounded-2xl border border-emerald-500/20 bg-[#ECE5DD]/40 dark:bg-zinc-900/60 p-4 sm:p-5 shadow-inner">
                                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 mb-3 text-xs text-[var(--fg-muted)]">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <IconBrandWhatsapp size={14} />
                                        Plantilla recomendada
                                    </span>
                                    <span>Respuesta Rápida /agenda</span>
                                </div>

                                {/* Speech bubble */}
                                <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 p-4 shadow-sm text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/10 space-y-2">
                                    <p>¡Hola! 👋 Gracias por escribirme. Para ver mis horarios disponibles en tiempo real y elegir el que más te acomode, puedes agendar directamente aquí:</p>
                                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 break-all bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                                        👉 https://simpleagenda.app/tu-nombre
                                    </p>
                                    <p className="text-xs text-[var(--fg-muted)]">
                                        Tu cita se confirma automáticamente y te llegará un recordatorio antes de la sesión. ¡Nos vemos!
                                    </p>
                                    <div className="flex justify-end items-center gap-1 text-[10px] text-zinc-400 pt-1">
                                        <span>12:35</span>
                                        <span className="text-emerald-500 font-bold">✓✓</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
                                        style={{
                                            background: copied ? '#10B981' : 'var(--accent)',
                                            color: '#fff',
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
