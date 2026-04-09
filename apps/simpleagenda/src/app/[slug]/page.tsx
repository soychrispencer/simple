import { notFound } from 'next/navigation';
import { IconMapPin, IconBrandWhatsapp } from '@tabler/icons-react';
import BookingFlow from './BookingFlow';

// Server component — use API_INTERNAL_URL (not proxied) for direct SSR calls
const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PublicProfile = {
    slug: string;
    displayName: string;
    profession: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    city: string | null;
    publicWhatsapp: string | null;
    timezone: string;
    bookingWindowDays: number;
    encuadre: string | null;
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    paymentMethods: {
        requiresAdvancePayment: boolean;
        mpConnected: boolean;
        paymentLinkUrl: string | null;
        bankTransferData: {
            bank: string;
            accountType: string;
            accountNumber: string;
            holderName: string;
            holderRut: string;
            holderEmail: string;
            alias?: string;
        } | null;
    };
    services: Array<{
        id: string;
        name: string;
        durationMinutes: number;
        price: string | null;
        currency: string;
        isOnline: boolean;
        isPresential: boolean;
    }>;
};

async function getProfessionalProfile(slug: string): Promise<PublicProfile | null> {
    // Skip API call for slugs that look like files (contain dots)
    if (slug.includes('.')) return null;

    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const data = await res.json() as { ok: boolean; profile: PublicProfile };
        return data.ok ? data.profile : null;
    } catch {
        return null;
    }
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const profile = await getProfessionalProfile(slug);

    if (!profile) return notFound();

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            {/* Professional header */}
            <div className="flex flex-col items-center text-center mb-10">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 overflow-hidden"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                    {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={encodeURI(profile.avatarUrl)} alt={profile.displayName ?? ''} className="w-full h-full object-cover" />
                    ) : (
                        profile.displayName?.charAt(0).toUpperCase() ?? '?'
                    )}
                </div>
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>{profile.displayName}</h1>
                {profile.profession && (
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent)' }}>{profile.profession}</p>
                )}
                {profile.headline && (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{profile.headline}</p>
                )}
                {profile.city && (
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />{profile.city}
                    </div>
                )}
            </div>

            {/* Bio */}
            {profile.bio && (
                <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{profile.bio}</p>
                </div>
            )}

            {/* Services + booking flow */}
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--fg)' }}>Servicios disponibles</h2>

            {profile.services.length === 0 ? (
                <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No hay servicios disponibles por el momento.</p>
                </div>
            ) : (
                <BookingFlow profile={profile} />
            )}

            {/* WhatsApp contact fallback */}
            {profile.publicWhatsapp && (
                <div className="mt-8 text-center">
                    <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>¿Prefieres coordinar por WhatsApp?</p>
                    <a
                        href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-[#25D366]/10"
                        style={{ borderColor: '#25D366', color: '#25D366' }}
                    >
                        <IconBrandWhatsapp size={16} />
                        Escribir por WhatsApp
                    </a>
                </div>
            )}
        </div>
    );
}
