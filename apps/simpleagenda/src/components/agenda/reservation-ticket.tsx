import { IconCheck } from '@tabler/icons-react';

type ReservationTicketProps = {
    time: string;
    label: string;
    status?: string;
    className?: string;
};

export function ReservationTicket({
    time,
    label,
    status = 'Reserva confirmada',
    className = '',
}: ReservationTicketProps) {
    return (
        <div className={`agenda-ticket ${className}`}>
            <div className="agenda-ticket__body">
                <span className="agenda-ticket__label">{label}</span>
                <span className="agenda-ticket__time">{time}</span>
                <span className="agenda-ticket__status">{status}</span>
            </div>
            <span className="agenda-ticket__stub" aria-hidden="true">
                <IconCheck size={22} stroke={2.4} />
            </span>
        </div>
    );
}
