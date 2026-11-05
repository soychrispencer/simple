'use client';

import { useState } from 'react';
import {
    IconCalculator,
    IconClockHour4,
    IconTrendingUp,
    IconArrowRight,
    IconSparkles,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { SectionHeader } from './section-header';

export function RoiCalculator({ onStartFree }: { onStartFree?: () => void }) {
    const [weeklyAppointments, setWeeklyAppointments] = useState<number>(20);
    const [avgPrice, setAvgPrice] = useState<number>(35000);

    // Cálculos realistas para profesionales en Chile
    // ~15 min ahorrados por cita coordinando por WhatsApp, confirmando y verificando transferencias
    const monthlyAppointments = weeklyAppointments * 4;
    const hoursSavedPerWeek = Math.round(weeklyAppointments * 0.25);
    const hoursSavedPerMonth = Math.round(monthlyAppointments * 0.25);

    // Los recordatorios automáticos reducen inasistencias en ~8-10%
    const noShowsSavedPerMonth = Math.max(1, Math.round(monthlyAppointments * 0.08));
    const revenueSavedPerMonth = noShowsSavedPerMonth * avgPrice;

    // Plan Pro anual mensual neto: $11.990
    const proCostMonthly = 11990;
    const roiMultiplier = Math.max(1, Math.round(revenueSavedPerMonth / proCostMonthly));

    return (
        <section id="calculadora" className="scroll-mt-20 py-14 sm:py-20 border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <div className="container-app">
                <SectionHeader
                    badgeIcon={<IconCalculator size={14} />}
                    badgeLabel="Calculadora de retorno"
                    title="¿Cuánto tiempo y dinero estás perdiendo en WhatsApp?"
                    subtitle="Desliza los valores según tu consulta y calcula las horas que recuperas al mes y los ingresos que dejas de perder por inasistencias."
                />

                <div className="mx-auto max-w-4xl grid gap-8 lg:grid-cols-12 items-center">
                    {/* Controls column */}
                    <div
                        className="lg:col-span-7 rounded-2xl border p-6 sm:p-8 space-y-7 shadow-xs"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--surface)',
                        }}
                    >
                        {/* Slider 1: Citas semanales */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-[var(--fg)]">
                                    Citas que atiendes por semana:
                                </label>
                                <span className="text-base font-extrabold text-[var(--accent)]">
                                    {weeklyAppointments} citas / sem
                                </span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={50}
                                step={1}
                                value={weeklyAppointments}
                                onChange={(e) => setWeeklyAppointments(Number(e.target.value))}
                                className="w-full h-2.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                            />
                            <div className="flex justify-between text-[11px] text-[var(--fg-muted)] mt-1.5 font-medium">
                                <span>5 (Part-time)</span>
                                <span>20 (Consulta estándar)</span>
                                <span>50 (Centro / Salón)</span>
                            </div>
                        </div>

                        {/* Slider 2: Valor promedio por cita */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-[var(--fg)]">
                                    Valor promedio por consulta o sesión:
                                </label>
                                <span className="text-base font-extrabold text-[var(--accent)]">
                                    ${avgPrice.toLocaleString('es-CL')} CLP
                                </span>
                            </div>
                            <input
                                type="range"
                                min={15000}
                                max={80000}
                                step={5000}
                                value={avgPrice}
                                onChange={(e) => setAvgPrice(Number(e.target.value))}
                                className="w-full h-2.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                            />
                            <div className="flex justify-between text-[11px] text-[var(--fg-muted)] mt-1.5 font-medium">
                                <span>$15.000</span>
                                <span>$35.000</span>
                                <span>$80.000+</span>
                            </div>
                        </div>

                        {/* Fast Presets */}
                        <div className="pt-2 border-t border-[var(--border)]">
                            <p className="text-xs font-semibold text-[var(--fg-muted)] mb-2.5">
                                Ejemplos comunes en Chile:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setWeeklyAppointments(18); setAvgPrice(35000); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--accent-border)] transition-colors text-[var(--fg-secondary)]"
                                >
                                    Psicología (18 citas · $35.000)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setWeeklyAppointments(28); setAvgPrice(18000); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--accent-border)] transition-colors text-[var(--fg-secondary)]"
                                >
                                    Barbería / Estética (28 citas · $18.000)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setWeeklyAppointments(22); setAvgPrice(40000); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--accent-border)] transition-colors text-[var(--fg-secondary)]"
                                >
                                    Salud / Nutrición (22 citas · $40.000)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results column */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* Result Card 1: Hours saved */}
                        <div
                            className="rounded-2xl border p-5 sm:p-6 shadow-sm"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--surface)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                                    <IconClockHour4 size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[var(--fg-muted)]">Tiempo libre recuperado</p>
                                    <p className="text-2xl font-extrabold text-[var(--fg)] mt-0.5">
                                        ~{hoursSavedPerMonth} horas <span className="text-xs font-normal text-[var(--fg-muted)]">/ al mes</span>
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-[var(--fg-secondary)] leading-relaxed">
                                Equivalente a <strong>~{hoursSavedPerWeek} horas semanales</strong> que ya no pierdes respondiendo mensajes, cuadrando horarios y revisando comprobantes.
                            </p>
                        </div>

                        {/* Result Card 2: Revenue saved */}
                        <div
                            className="rounded-2xl border p-5 sm:p-6 shadow-sm"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--surface)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                    <IconTrendingUp size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[var(--fg-muted)]">Ingresos que dejas de perder</p>
                                    <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                                        +${revenueSavedPerMonth.toLocaleString('es-CL')}{' '}
                                        <span className="text-xs font-normal text-[var(--fg-muted)]">CLP / mes</span>
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-[var(--fg-secondary)] leading-relaxed">
                                Al reducir inasistencias de última hora con confirmaciones y recordatorios por email automáticos (~{noShowsSavedPerMonth} citas rescatadas al mes).
                            </p>
                        </div>

                        {/* Summary highlight */}
                        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-subtle)]/40 p-4 text-xs">
                            <div className="flex items-start gap-2.5">
                                <IconSparkles size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-[var(--fg)]">
                                        SimpleAgenda Pro cuesta $11.990/mes.
                                    </p>
                                    <p className="text-[var(--fg-secondary)] mt-0.5">
                                        Se paga sola con <strong>1 sola cita recuperada</strong>. Retorno estimado de <strong>{roiMultiplier}x</strong> al mes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <PanelButton
                            type="button"
                            variant="accent"
                            className="w-full h-12 text-sm font-bold shadow-md gap-2"
                            onClick={onStartFree ?? (() => window.location.assign('#planes'))}
                        >
                            Empezar gratis y recuperar mi tiempo
                            <IconArrowRight size={16} />
                        </PanelButton>
                    </div>
                </div>
            </div>
        </section>
    );
}
