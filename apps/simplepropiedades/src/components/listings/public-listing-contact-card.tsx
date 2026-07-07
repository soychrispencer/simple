'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { IconBrandWhatsapp, IconMail, IconPhone } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { submitListingConversation } from '@simple/utils';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard } from '@simple/ui/panel';

export default function PublicListingContactCard(props: {
    listingId: string;
    listingTitle: string;
    sourcePage?: string | null;
    seller?: {
        email: string;
        phone: string | null;
        whatsapp?: string | null;
    } | null;
}) {
    const router = useRouter();
    const { user, isLoggedIn } = useAuth();
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [message, setMessage] = useState(`Hola, me interesa ${props.listingTitle}. ¿Sigue disponible?`);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);

    const whatsappNumber = props.seller?.whatsapp?.trim() || props.seller?.phone?.trim() || null;
    const phoneNumber = props.seller?.phone?.trim() || null;
    const emailAddress = props.seller?.email?.trim() || null;

    useEffect(() => {
        setContactName(user?.name ?? '');
        setContactEmail(user?.email ?? '');
        setContactPhone(user?.phone ?? '');
    }, [user]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isLoggedIn) {
            setFeedback('Inicia sesión para enviar un mensaje al anunciante.');
            return;
        }

        setSubmitting(true);
        setFeedback(null);
        setThreadId(null);

        const result = await submitListingConversation('propiedades', {
            listingId: props.listingId,
            message,
            contactName: contactName.trim() || undefined,
        });

        setSubmitting(false);
        if (!result.ok || !result.thread) {
            setFeedback(result.error || 'No pudimos enviar tu consulta.');
            return;
        }

        setThreadId(result.thread.id);
        setFeedback('Mensaje enviado. Ya quedó disponible en tu panel de mensajes.');
    }

    function handleQuickAction(source: 'whatsapp' | 'phone_call' | 'email') {
        if (source === 'whatsapp' && whatsappNumber) {
            const target = whatsappNumber.replace(/\D/g, '');
            window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            setFeedback('Abriendo WhatsApp.');
            return;
        }

        if (source === 'phone_call' && phoneNumber) {
            window.location.href = `tel:${phoneNumber}`;
            setFeedback('Iniciando llamada.');
            return;
        }

        if (source === 'email' && emailAddress) {
            const subject = encodeURIComponent(`Consulta por ${props.listingTitle}`);
            const body = encodeURIComponent(message);
            window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
            setFeedback('Abriendo correo.');
        }
    }

    return (
        <PanelCard size="md">
            <PanelBlockHeader title="Contactar anunciante" className="mb-4" />
            <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
                <label className="block space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Nombre</span>
                    <input className="form-input h-10 text-sm" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Correo</span>
                    <input className="form-input h-10 text-sm" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Teléfono</span>
                    <input className="form-input h-10 text-sm" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+56 9 1234 5678" />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Mensaje</span>
                    <textarea className="form-textarea min-h-28 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} required />
                </label>
                <div className="space-y-2">
                    <PanelButton type="submit" className="w-full" disabled={submitting || !message.trim() || !isLoggedIn}>
                        {submitting ? 'Enviando...' : isLoggedIn ? 'Enviar mensaje' : 'Inicia sesión para enviar'}
                    </PanelButton>
                    {whatsappNumber || phoneNumber || emailAddress ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !whatsappNumber}
                                onClick={() => handleQuickAction('whatsapp')}
                                ariaLabel="Contactar por WhatsApp"
                            >
                                <IconBrandWhatsapp size={16} />
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !phoneNumber}
                                onClick={() => handleQuickAction('phone_call')}
                                ariaLabel="Llamar por teléfono"
                            >
                                <IconPhone size={16} />
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !emailAddress}
                                onClick={() => handleQuickAction('email')}
                                ariaLabel="Enviar email"
                            >
                                <IconMail size={16} />
                            </PanelButton>
                        </div>
                    ) : null}
                    {threadId && isLoggedIn ? (
                        <PanelButton
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => router.push(`/panel/mensajes?thread=${encodeURIComponent(threadId)}`)}
                        >
                            Abrir conversación
                        </PanelButton>
                    ) : null}
                    <p className="text-xs" style={{ color: feedback?.toLowerCase().includes('no pudimos') || feedback?.toLowerCase().includes('inicia sesión') ? 'var(--color-error)' : 'var(--fg-muted)' }}>
                        {feedback || (isLoggedIn
                            ? 'Tu mensaje quedará guardado en el panel de mensajes del anunciante y el tuyo.'
                            : 'Debes iniciar sesión para enviar mensajes por la plataforma. También puedes usar WhatsApp, teléfono o correo.')}
                    </p>
                </div>
            </form>
        </PanelCard>
    );
}
