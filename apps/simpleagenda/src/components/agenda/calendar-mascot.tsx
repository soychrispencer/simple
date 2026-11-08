type CalendarMascotProps = {
    className?: string;
};

/** Mascota-calendario SimpleAgenda para estados vacíos y momentos de bienvenida. */
export function CalendarMascot({ className }: CalendarMascotProps) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 176 152"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g stroke="#0E0E10" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M46 76 23 61m0 0-7-8m7 8-6 8M130 76l23-15m0 0 7-8m-7 8 6 8" />
                <path d="m66 123-7 17m50-17 7 17m-57 0-7 3m64-3 7 3" />
            </g>
            <g stroke="#B8DB3A" strokeWidth="5" strokeLinecap="round">
                <path d="m24 43-4-8m13 5-1-9m120 12 4-8m-13 4 1-9" />
            </g>
            <rect x="44" y="35" width="88" height="90" rx="20" fill="#FFFFFF" stroke="#0E0E10" strokeWidth="5" />
            <path d="M45 60h86" stroke="#0E0E10" strokeWidth="5" />
            <rect x="60" y="25" width="14" height="24" rx="7" fill="#B8DB3A" stroke="#0E0E10" strokeWidth="4" />
            <rect x="102" y="25" width="14" height="24" rx="7" fill="#B8DB3A" stroke="#0E0E10" strokeWidth="4" />
            <g fill="#0E0E10">
                <ellipse cx="73" cy="73" rx="3.5" ry="5" />
                <ellipse cx="103" cy="73" rx="3.5" ry="5" />
            </g>
            <path d="M78 83q10 10 20 0" stroke="#0E0E10" strokeWidth="4" strokeLinecap="round" />
            <g stroke="#0E0E10" strokeWidth="3">
                <rect x="59" y="94" width="15" height="11" rx="3" fill="#FFFFFF" />
                <rect x="80" y="94" width="15" height="11" rx="3" fill="#B8DB3A" />
                <rect x="101" y="94" width="15" height="11" rx="3" fill="#FFFFFF" />
                <rect x="59" y="110" width="15" height="8" rx="3" fill="#FFFFFF" />
                <rect x="80" y="110" width="15" height="8" rx="3" fill="#FFFFFF" />
                <rect x="101" y="110" width="15" height="8" rx="3" fill="#FFFFFF" />
            </g>
            <path d="m84 99 4 4 7-8" stroke="#0E0E10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
