type Recurrence = 'weekly' | 'biweekly' | 'monthly';

function wallTime(formatter: Intl.DateTimeFormat, instant: Date): Date {
    const values = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, Number(value)]));
    return new Date(Date.UTC(values.year!, values.month! - 1, values.day!, values.hour!, values.minute!, values.second!));
}

export function recurringBookingStart(base: Date, index: number, frequency: Recurrence | null, timezone: string): Date | null {
    if (index === 0 || !frequency) return base;
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const target = wallTime(formatter, base);
    if (frequency === 'monthly') {
        const day = target.getUTCDate();
        target.setUTCDate(1);
        target.setUTCMonth(target.getUTCMonth() + index);
        const finalDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
        target.setUTCDate(Math.min(day, finalDay));
    } else {
        target.setUTCDate(target.getUTCDate() + index * (frequency === 'weekly' ? 7 : 14));
    }

    // Enumerar los desfases de ambos lados del cambio de hora. Para una hora repetida,
    // la primera ocurrencia es la opción determinista. Una hora inexistente no se mueve en silencio.
    const targetTime = target.getTime();
    const dayMs = 86_400_000;
    const possibleInstants = [-dayMs, 0, dayMs].map((difference) => {
        const probe = targetTime + difference;
        const offset = wallTime(formatter, new Date(probe)).getTime() - probe;
        return targetTime - offset;
    }).filter((value) => wallTime(formatter, new Date(value)).getTime() === targetTime);
    return possibleInstants.length ? new Date(Math.min(...possibleInstants)) : null;
}
