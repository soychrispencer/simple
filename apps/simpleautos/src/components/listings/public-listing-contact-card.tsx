'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { IconBrandWhatsapp, IconMail, IconPhone } from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { submitListingLead, submitListingLeadAction } from '@simple/utils';
import { PanelBlockHeader, PanelButton, PanelCard } from '@simple/ui';

export default function PublicListingContactCard(props: {
    listingId: string;
    listingTitle: string;
    sourcePage?: string | null;
    seller?: {
        email: string;
        phone: string | null;
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

    useEffect(() => {
        setContactName(user?.name ?? '');
        setContactEmail(user?.email ?? '');
        setContactPhone(user?.phone ?? '');
    }, [user]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setFeedback(null);
        setThreadId(null);

        const result = await submitListingLead('autos', {
            listingId: props.listingId,
            contactName,
            contactEmail,
            contactPhone: contactPhone || null,
            message,
            sourcePage: props.sourcePage ?? `/vehiculo/${props.listingId}`,
        });

        setSubmitting(false);
        if (!result.ok || !result.item) {
            setFeedback(result.error || 'No pudimos enviar tu consulta.');
            return;
        }

        setThreadId(result.thread?.id ?? result.item.threadId ?? null);
        setFeedback(
            result.thread?.id || result.item.threadId
                ? 'Mensaje enviado. Ya quedó disponible en tu panel de mensajes.'
                : 'Consulta enviada. El anunciante la verá en su panel.'
        );
    }

    async function handleQuickAction(source: 'whatsapp' | 'phone_call' | 'email') {
        if (contactName.trim().length < 2 || !contactEmail.includes('@')) {
            setFeedback('Completa tu nombre y correo antes de contactar al anunciante.');
            return;
        }

        setSubmitting(true);
        setFeedback(null);
        await submitListingLeadAction('autos', {
            listingId: props.listingId,
            source,
            contactName,
            contactEmail,
            contactPhone: contactPhone || null,
            contactWhatsapp: contactPhone || null,
            message,
            sourcePage: props.sourcePage ?? `/vehiculo/${props.listingId}`,
        });
        setSubmitting(false);

        if (source === 'whatsapp' && props.seller?.phone) {
            const target = props.seller.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            setFeedback('Accion registrada. Abriendo WhatsApp.');
            return;
        }

        if (source === 'phone_call' && props.seller?.phone) {
            window.location.href = `tel:${props.seller.phone}`;
            setFeedback('Accion registrada. Iniciando llamada.');
            return;
        }

        if (source === 'email' && props.seller?.email) {
            const subject = encodeURIComponent(`Consulta por ${props.listingTitle}`);
            const body = encodeURIComponent(message);
            window.location.href = `mailto:${props.seller.email}?subject=${subject}&body=${body}`;
            setFeedback('Accion registrada. Abriendo correo.');
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
                    <PanelButton type="submit" className="w-full" disabled={submitting || !message.trim()}>
                        {submitting ? 'Enviando...' : 'Enviar consulta'}
                    </PanelButton>
                    {props.seller?.phone || props.seller?.email ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !props.seller?.phone}
                                onClick={() => void handleQuickAction('whatsapp')}
                            >
                                <IconBrandWhatsapp size={16} />
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !props.seller?.phone}
                                onClick={() => void handleQuickAction('phone_call')}
                            >
                                <IconPhone size={16} />
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                disabled={submitting || !props.seller?.email}
                                onClick={() => void handleQuickAction('email')}
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
                    <p className="text-xs" style={{ color: feedback?.toLowerCase().includes('no pudimos') ? 'var(--color-error)' : 'var(--fg-muted)' }}>
                        {feedback || (isLoggedIn
                            ? 'Si tienes sesión abierta, este mensaje también se guardará en tu panel.'
                            : 'Si inicias sesión, además podrás seguir la conversación desde tu panel.')}
                    </p>
                </div>
            </form>
        </PanelCard>
    );
}
