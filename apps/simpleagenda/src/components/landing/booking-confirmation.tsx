export function BookingConfirmation({ time, label, compact = false }: { time: string; label: string; compact?: boolean }) {
    return (
        <div className={"rounded-lg bg-[#0F766E] text-left text-white shadow-md" + (compact ? " px-3 py-2.5" : " px-5 py-4") }>
            <span className="block text-xs font-semibold uppercase tracking-widest">{label}</span>
            <span className={compact ? "block text-2xl font-extrabold leading-tight" : "block text-3xl font-extrabold tracking-tight sm:text-4xl"}>{time}</span>
            <span className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>✓ Reserva confirmada</span>
        </div>
    );
}
