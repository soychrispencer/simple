import { IconCheck } from '@tabler/icons-react';

type BookingConfirmationProps = {
    time: string;
    label: string;
    compact?: boolean;
    variant?: 'spotlight' | 'record';
};

export function BookingConfirmation({ time, label, compact = false, variant = 'spotlight' }: BookingConfirmationProps) {
    return (
        <div className={`agenda-confirmation text-left ${variant === 'record' ? 'agenda-confirmation--record' : ''} ${compact ? 'px-2.5 py-2 sm:px-3' : 'px-4 py-3.5 sm:px-5'}`}>
            <span className="block text-[0.625rem] font-bold uppercase tracking-[0.1em] sm:text-[0.6875rem]">{label}</span>
            <span className={`agenda-numeral block font-bold leading-tight tabular-nums ${compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`}>{time}</span>
            <span className={`flex items-center gap-1 font-semibold ${compact ? 'text-[0.6875rem]' : 'text-sm'}`}>
                <IconCheck size={compact ? 13 : 16} stroke={2.5} aria-hidden="true" />
                Reserva confirmada
            </span>
        </div>
    );
}
