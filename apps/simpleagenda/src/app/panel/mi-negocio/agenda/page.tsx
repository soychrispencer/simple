'use client';

import { useEffect, useState } from 'react';
import { IconAdjustmentsHorizontal, IconClock, IconCreditCard } from '@tabler/icons-react';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaScheduleContent } from '@/components/panel/agenda-schedule-content';
import { AgendaConfiguracionesContent } from '@/components/panel/agenda-configuraciones-content';
import { AgendaGoogleCalendarIntegrationCard } from '@/components/panel/agenda-google-calendar-integration-card';
import { AgendaSetupTip } from '@/components/panel/agenda-setup-tip';

type AgendaSubTab = 'schedule' | 'rules' | 'payments';

function resolveTabFromHash(hash: string): AgendaSubTab {
    const clean = hash.replace(/^#/, '').toLowerCase();
    if (clean === 'reservas') return 'rules';
    if (clean === 'cobros' || clean === 'mercadopago') return 'payments';
    return 'schedule';
}

export default function AgendaYReservasPage() {
    const [activeTab, setActiveTab] = useState<AgendaSubTab>('schedule');

    useEffect(() => {
        const sync = () => {
            if (window.location.hash) {
                setActiveTab(resolveTabFromHash(window.location.hash));
            }
        };
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);

    const selectTab = (tab: AgendaSubTab, hash: string) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${hash}`);
        }
    };

    const subTabs: Array<{ id: AgendaSubTab; hash: string; label: string; icon: typeof IconClock }> = [
        { id: 'schedule', hash: 'horario', label: 'Horarios y bloqueos', icon: IconClock },
        { id: 'rules', hash: 'reservas', label: 'Reservas y avisos', icon: IconAdjustmentsHorizontal },
        { id: 'payments', hash: 'cobros', label: 'Cobros', icon: IconCreditCard },
    ];

    return (
        <AgendaMiNegocioShell
            activeKey="agenda"
            title="Agenda y reservas"
            description="Organiza cuándo atiendes, cómo se confirman las citas y qué métodos de cobro aceptas."
        >
            <div className="space-y-6">
                <AgendaSetupTip focusStepId="horarios" />

                {/* Sub-navegación limpia por píldoras */}
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-(--border) bg-(--bg-subtle) p-1.5">
                    {subTabs.map(({ id, hash, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => selectTab(id, hash)}
                                className={`inline-flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition ${
                                    active
                                        ? 'bg-(--surface) text-fg shadow-xs'
                                        : 'text-fg-muted hover:text-fg'
                                }`}
                            >
                                <Icon size={16} aria-hidden="true" />
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    })}
                </div>

                <section
                    id="horario"
                    className={activeTab === 'schedule' ? 'scroll-mt-24 space-y-5' : 'hidden'}
                    aria-hidden={activeTab !== 'schedule'}
                >
                    <AgendaScheduleContent />
                    <AgendaGoogleCalendarIntegrationCard />
                </section>

                <section
                    id="reservas"
                    className={activeTab === 'rules' ? 'scroll-mt-24' : 'hidden'}
                    aria-hidden={activeTab !== 'rules'}
                >
                    <AgendaConfiguracionesContent section="rules" />
                </section>

                <section
                    id="cobros"
                    className={activeTab === 'payments' ? 'scroll-mt-24' : 'hidden'}
                    aria-hidden={activeTab !== 'payments'}
                >
                    <AgendaConfiguracionesContent section="payments" />
                </section>
            </div>
        </AgendaMiNegocioShell>
    );
}
