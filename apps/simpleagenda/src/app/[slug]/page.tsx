import { notFound } from 'next/navigation';
import {
    IconMapPin,
    IconBrandWhatsapp,
    IconMail,
    IconPhone,
    IconWorld,
    IconBrandInstagram,
    IconBrandFacebook,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandYoutube,
    IconBrandX,
} from '@tabler/icons-react';
import BookingFlow from './BookingFlow';

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PublicProfile = {
    slug: string;
    displayName: string;
    profession: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    city: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    linkedinUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    twitterUrl: string | null;
    timezone: string;
    bookingWindowDays: number;
    allowsRecurrentBooking: boolean;
    encuadre: string | null;
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    paymentMethods: {
        requiresAdvancePayment: boolean;
        mpConnected: boolean;
        paymentLinkUrl: string | null;
        bankTransferData: {
            bank: string; accountType: string; accountNumber: string;
            holderName: string; holderRut: string; holderEmail: string; alias?: string;
        } | null;
    };
    services: Array<{
        id: string; name: string; durationMinutes: number;
        price: string | null; currency: string; isOnline: boolean; isPresential: boolean;
        preconsultFields?: Array<{ id: string; label: string; type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number'; required: boolean; placeholder?: string; options?: string[] }>;
    }>;
    locations: Array<{
        id: string;
        name: string;
        addressLine: string;
        city: string | null;
        region: string | null;
        notes: string | null;
        googleMapsUrl: string | null;
    }>;
};

async function getProfessionalProfile(slug: string): Promise<PublicProfile | null> {
    if (slug.includes('.')) return null;
    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        const data = await res.json() as { ok: boolean; profile: PublicProfile };
        return data.ok ? data.profile : null;
    } catch { return null; }
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const profile = await getProfessionalProfile(slug);
    if (!profile) return notFound();

    const socialLinks = [
        profile.instagramUrl && { href: profile.instagramUrl, Icon: IconBrandInstagram, label: 'Instagram', color: '#E1306C' },
        profile.facebookUrl  && { href: profile.facebookUrl,  Icon: IconBrandFacebook,  label: 'Facebook',  color: '#1877F2' },
        profile.linkedinUrl  && { href: profile.linkedinUrl,  Icon: IconBrandLinkedin,  label: 'LinkedIn',  color: '#0A66C2' },
        profile.tiktokUrl    && { href: profile.tiktokUrl,    Icon: IconBrandTiktok,    label: 'TikTok',    color: 'var(--fg)' },
        profile.youtubeUrl   && { href: profile.youtubeUrl,   Icon: IconBrandYoutube,   label: 'YouTube',   color: '#FF0000' },
        profile.twitterUrl   && { href: profile.twitterUrl,   Icon: IconBrandX,         label: 'X',         color: 'var(--fg)' },
    ].filter(Boolean) as Array<{ href: string; Icon: React.ElementType; label: string; color: string }>;

    const hasContacts = profile.publicEmail || profile.publicPhone || profile.publicWhatsapp || profile.websiteUrl || socialLinks.length > 0;

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            {/* ── Cover + Avatar ─────────────────────────────────── */}
            <div className="flex flex-col items-center px-4 sm:px-6 pt-4 sm:pt-6">
                {/* Cover - full width mobile, wider on desktop */}
                <div className="relative w-full max-w-4xl">
                    <div
                        className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm"
                        style={{
                            height: 240,
                            maxHeight: '40vh',
                            background: profile.coverUrl
                                ? `url('${encodeURI(profile.coverUrl)}') center/cover no-repeat`
                                : 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 40%, #1a1a2e) 50%, #0f0f23 100%)',
                        }}
                    />
                    {/* Avatar overlapping bottom of cover - responsive size */}
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -36 }}>
                        <div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg"
                            style={{
                                border: '4px solid var(--bg)',
                                background: profile.avatarUrl
                                    ? `url('${encodeURI(profile.avatarUrl)}') center/cover no-repeat`
                                    : 'linear-gradient(135deg, var(--accent-soft) 0%, var(--accent-subtle) 100%)',
                                color: profile.avatarUrl ? 'transparent' : 'var(--accent)',
                            }}
                        >
                            {!profile.avatarUrl && (profile.displayName?.charAt(0).toUpperCase() ?? '?')}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Profile info ───────────────────────────────────── */}
            <div className="flex flex-col items-center text-center px-4 pt-10 sm:pt-12 pb-6 sm:pb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>{profile.displayName}</h1>
                {profile.profession && (
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>{profile.profession}</p>
                )}
                {profile.headline && (
                    <p className="text-sm max-w-sm" style={{ color: 'var(--fg-muted)' }}>{profile.headline}</p>
                )}
                {profile.city && (
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={12} />{profile.city}
                    </div>
                )}
            </div>

            <div className="max-w-lg mx-auto px-4 pb-16 flex flex-col gap-6">
                {/* ── WhatsApp CTA (prominent) ──────────────────────── */}
                {profile.publicWhatsapp && (
                    <a
                        href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                            color: '#fff',
                            boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                        }}
                    >
                        <IconBrandWhatsapp size={20} />
                        Escríbeme por WhatsApp
                    </a>
                )}
                {/* ── Bio ──────────────────────────────────────────── */}
                {profile.bio && (
                    <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--fg-secondary)' }}>{profile.bio}</p>
                    </div>
                )}

                {/* ── Services ──────────────────────────────────────── */}
                <div>
                    <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>Servicios</h2>
                    {profile.services.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No hay servicios disponibles por el momento.</p>
                        </div>
                    ) : (
                        <BookingFlow profile={profile} />
                    )}
                </div>

                {/* ── Locations ─────────────────────────────────────── */}
                {(profile.locations?.length ?? 0) > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>Direcciones</h2>
                        <div className="rounded-2xl p-4 flex flex-col gap-2 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            {profile.locations.map((loc) => {
                                const mapUrl = loc.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.addressLine, loc.city, loc.region].filter(Boolean).join(', '))}`;
                                return (
                                    <a
                                        key={loc.id}
                                        href={mapUrl}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-(--bg-subtle)"
                                        style={{ background: 'var(--bg)' }}
                                    >
                                        <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                            <IconMapPin size={15} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--fg)' }}>{loc.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{loc.addressLine}</p>
                                            {(loc.city || loc.region) && (
                                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{[loc.city, loc.region].filter(Boolean).join(', ')}</p>
                                            )}
                                            {loc.notes && (
                                                <p className="text-xs mt-1 italic" style={{ color: 'var(--fg-muted)' }}>{loc.notes}</p>
                                            )}
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Contact ──────────────────────────────────────── */}
                {hasContacts && (
                    <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                profile.publicWhatsapp && {
                                    href: `https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`,
                                    Icon: IconBrandWhatsapp, label: 'WhatsApp',
                                    iconBg: '#25D36615', iconColor: '#25D366', external: true,
                                },
                                profile.publicPhone && {
                                    href: `tel:${profile.publicPhone}`,
                                    Icon: IconPhone, label: 'Teléfono',
                                    iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', external: false,
                                },
                                profile.publicEmail && {
                                    href: `mailto:${profile.publicEmail}`,
                                    Icon: IconMail, label: 'Email',
                                    iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', external: false,
                                },
                                profile.websiteUrl && {
                                    href: profile.websiteUrl,
                                    Icon: IconWorld, label: 'Sitio web',
                                    iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', external: true,
                                },
                            ].filter(Boolean).map((item) => {
                                const { href, Icon, label, iconBg, iconColor, external } = item as any;
                                return (
                                    <a
                                        key={label}
                                        href={href}
                                        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-sm"
                                        style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
                                    >
                                        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-110" style={{ background: iconBg, color: iconColor }}>
                                            <Icon size={16} />
                                        </span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</span>
                                    </a>
                                );
                            })}
                        </div>
                        {socialLinks.length > 0 && (
                            <div className="mt-4 pt-4 flex flex-col items-center" style={{ borderTop: '1px solid var(--border)' }}>
                                <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sígueme</p>
                                <div className="flex items-center gap-2">
                                    {socialLinks.map(({ href, Icon, label, color }) => (
                                        <a
                                        key={label}
                                        href={href}
                                        target="_blank" rel="noopener noreferrer"
                                        title={label}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-sm"
                                        style={{ color, border: '1px solid var(--border)', background: 'var(--bg)' }}
                                        >
                                            <Icon size={20} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
