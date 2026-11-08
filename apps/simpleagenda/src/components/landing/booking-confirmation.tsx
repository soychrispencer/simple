import { IconCheck } from '@tabler/icons-react';
import { ReservationTicket } from '@/components/agenda/reservation-ticket';

type BookingConfirmationProps = {
    time: string;
    label: string;
    variant: 'record' | 'ticket';
};

export function BookingConfirmation({ time, label, variant }: BookingConfirmationProps) {
    if (variant === 'ticket') {
        return <ReservationTicket time={time} label={label} />;
    }

    return (
        <div className="agenda-confirmation px-3 py-2.5 text-left sm:px-3.5">
            <span className="agenda-confirmation__label block text-[0.625rem] font-bold uppercase tracking-[0.12em] sm:text-[0.6875rem]">{label}</span>
            <span className="agenda-confirmation__time agenda-numeral block text-xl font-bold leading-tight tabular-nums sm:text-2xl">{time}</span>
            <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold">
                <IconCheck size={13} stroke={3} aria-hidden="true" />
                Reserva confirmada
            </span>
        </div>
    );
}
