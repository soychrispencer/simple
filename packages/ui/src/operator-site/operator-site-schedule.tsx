'use client';

import { IconClock } from '@tabler/icons-react';
import { formatBusinessScheduleRange, isBusinessOpenNow } from '@simple/utils';
import type { OperatorSiteSchedule } from './types.js';

function ScheduleBody({ schedule }: { schedule: OperatorSiteSchedule }) {
    const todayDow = new Date().getDay();
    const today = schedule.days.find((day) => day.dayOfWeek === todayDow && day.isActive);
    const openNow = schedule.alwaysOpen
        || (today ? isBusinessOpenNow(today.startTime, today.endTime) : false);

    if (schedule.alwaysOpen) {
        return (
            <div className="os-schedule-status os-schedule-status--open">
                <IconClock size={16} />
                Disponible 24/7
            </div>
        );
    }

    return (
        <>
            {today ? (
                <div className={`os-schedule-status ${openNow ? 'os-schedule-status--open' : 'os-schedule-status--closed'}`}>
                    <IconClock size={16} />
                    {openNow ? 'Abierto ahora' : 'Cerrado ahora'}
                </div>
            ) : null}
            <div className="os-schedule-sidebar__grid">
                {schedule.days.map((day) => (
                    <div key={day.dayOfWeek} className="os-schedule-row">
                        <span className="os-schedule-row__day">{day.dayLabel}</span>
                        <span className="os-schedule-row__time">
                            {!day.isActive
                                ? 'Cerrado'
                                : formatBusinessScheduleRange(day.startTime, day.endTime)}
                        </span>
                    </div>
                ))}
            </div>
        </>
    );
}

/** Barra lateral sticky con horarios de atención. */
export function OperatorSiteScheduleSidebar({ schedule }: { schedule: OperatorSiteSchedule }) {
    return (
        <div className="os-schedule-sidebar os-glass">
            <p className="os-schedule-sidebar__label">Horarios</p>
            <h2 className="os-schedule-sidebar__title">Cuándo atiendo</h2>
            <ScheduleBody schedule={schedule} />
            {schedule.scheduleNote ? (
                <p className="os-schedule-sidebar__note">{schedule.scheduleNote}</p>
            ) : null}
        </div>
    );
}

/** @deprecated Usar OperatorSiteScheduleSidebar en layout de dos columnas. */
export function OperatorSiteScheduleSection({ schedule }: { schedule: OperatorSiteSchedule }) {
    return (
        <section id="horarios" className="os-section">
            <div className="os-section__inner">
                <p className="os-section__label">Horarios</p>
                <h2 className="os-section__title">Cuándo atiendo</h2>
                <ScheduleBody schedule={schedule} />
                {schedule.scheduleNote ? (
                    <p className="os-section__lead" style={{ marginTop: '1rem' }}>{schedule.scheduleNote}</p>
                ) : null}
            </div>
        </section>
    );
}
