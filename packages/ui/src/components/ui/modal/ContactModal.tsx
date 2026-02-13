"use client";

import React, { useEffect, useState } from 'react';
import { IconBrandWhatsapp, IconMail, IconPhone, IconUser, IconX } from '@tabler/icons-react';
import Modal from './Modal';
import { Button } from '../Button';
import Textarea from '../../forms/Textarea';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contextTitle?: string;
  contextType?: 'vehicle' | 'profile';
  onEmailContact?: () => void;
  onWhatsAppContact?: () => void;
  onPhoneCall?: () => void;

  // Mensaje directo (opcional): lo implementa el host (app) vía callback.
  onSendMessage?: (message: string) => Promise<void> | void;
  canSendMessage?: boolean;
  messagePlaceholder?: string;
  messageCtaLabel?: string;
  messageDisabledHint?: string;
}

function sanitizePhone(raw: string) {
  return String(raw || '').replace(/[\s\-().]/g, '').replace(/^00/, '+');
}

function phoneToWhatsAppDigits(raw: string) {
  const digitsOnly = String(raw || '').replace(/\D/g, '');
  if (!digitsOnly) return '';
  // Heurística simple: si parece número chileno local (9 dígitos), prefijar 56.
  if (digitsOnly.length === 9) return `56${digitsOnly}`;
  // Si ya viene con 56, úsalo tal cual.
  return digitsOnly;
}

function buildPrefillMessage(params: { contactName: string; contextType?: 'vehicle' | 'profile'; contextTitle?: string }) {
  const { contactName, contextType, contextTitle } = params;
  const base = contextType === 'vehicle'
    ? 'Hola, estoy interesado en tu publicación.'
    : 'Hola, quisiera contactarte.';
  const context = contextTitle ? `\n\nContexto: ${contextTitle}` : '';
  return `${base}\n\nContacto: ${contactName}${context}`.trim();
}

const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  contactName,
  email,
  phone,
  whatsapp,
  contextTitle,
  contextType,
  onEmailContact,
  onWhatsAppContact,
  onPhoneCall,
  onSendMessage,
  canSendMessage = true,
  messagePlaceholder,
  messageCtaLabel,
  messageDisabledHint,
}) => {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setMessage('');
    setMessageSent(false);
    setMessageError(null);
    setSendingMessage(false);
  }, [isOpen]);

  const hasAnyContactMethod = Boolean(email || phone || whatsapp);

  const handleWhatsAppContact = () => {
    if (onWhatsAppContact) return onWhatsAppContact();
    const raw = whatsapp || phone;
    if (!raw) return;
    const to = phoneToWhatsAppDigits(raw);
    if (!to) return;
    const text = buildPrefillMessage({ contactName, contextType, contextTitle });
    const url = `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmailContact = () => {
    if (onEmailContact) return onEmailContact();
    if (!email) return;
    const subject = contextType === 'vehicle'
      ? `Consulta por: ${contextTitle || 'publicación'}`
      : `Contacto: ${contactName}`;
    const body = buildPrefillMessage({ contactName, contextType, contextTitle });
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handlePhoneCall = () => {
    if (onPhoneCall) return onPhoneCall();
    if (!phone) return;
    const tel = sanitizePhone(phone);
    window.location.href = `tel:${tel}`;
  };

  const handleSendMessage = async () => {
    if (!onSendMessage) return;
    if (!canSendMessage) return;

    const content = message.trim();
    if (!content) return;

    setSendingMessage(true);
    setMessageError(null);
    try {
      await onSendMessage(content);
      setMessageSent(true);
      setMessage('');
    } catch (e: unknown) {
      setMessageError(e instanceof Error ? e.message : 'No pudimos enviar tu mensaje.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      showClose={false}
      maxWidth="max-w-xl"
      contentClassName="p-0"
    >
      <div className="card-surface text-[var(--text-primary)]">
        <div className="relative px-6 py-5 border-b border-border/60 card-surface">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)]"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-[var(--field-bg)] border border-[var(--field-border)] flex items-center justify-center">
              <IconUser size={24} className="text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {contextType === 'vehicle' ? 'Contactar vendedor' : 'Contactar'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{contactName}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {contextTitle && (
            <div className="p-4 rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)]">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                {contextType === 'vehicle' ? 'Consultando sobre' : 'Sobre'}
              </p>
              <p className="font-semibold text-lg text-[var(--text-primary)]">{contextTitle}</p>
            </div>
          )}

          {onSendMessage ? (
            <div className="p-4 rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] space-y-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Mensaje directo
                </p>
              </div>

              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  messagePlaceholder ||
                  (contextType === 'vehicle'
                    ? 'Escribe tu consulta (disponibilidad, financiamiento, permuta, etc.)'
                    : 'Escribe tu mensaje')
                }
              />

              {messageError ? (
                <p className="text-xs text-[var(--color-danger)]">{messageError}</p>
              ) : messageSent ? (
                <p className="text-xs text-[var(--color-success)]">Mensaje enviado.</p>
              ) : null}

              {!canSendMessage && messageDisabledHint ? (
                <p className="text-xs text-[var(--text-secondary)]">{messageDisabledHint}</p>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={sendingMessage}
                  disabled={!canSendMessage || !message.trim()}
                  onClick={handleSendMessage}
                >
                  {messageCtaLabel || 'Enviar mensaje'}
                </Button>
              </div>
            </div>
          ) : null}

          {!hasAnyContactMethod ? (
            onSendMessage ? null : (
              <div className="p-4 rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] text-sm text-[var(--text-secondary)]">
                Este vendedor no tiene métodos de contacto publicados.
              </div>
            )
          ) : (
            <div className="p-4 rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)]">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))' }}>
                {(whatsapp || phone) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="neutral"
                    onClick={handleWhatsAppContact}
                    className="h-auto py-2 px-2"
                    aria-label="Contactar por WhatsApp"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <IconBrandWhatsapp size={20} />
                      <span className="text-[11px] text-[var(--text-secondary)]">WhatsApp</span>
                    </span>
                  </Button>
                ) : null}

                {email ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="neutral"
                    onClick={handleEmailContact}
                    className="h-auto py-2 px-2"
                    aria-label="Contactar por correo"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <IconMail size={20} />
                      <span className="text-[11px] text-[var(--text-secondary)]">Correo</span>
                    </span>
                  </Button>
                ) : null}

                {phone ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="neutral"
                    onClick={handlePhoneCall}
                    className="h-auto py-2 px-2"
                    aria-label="Llamar por teléfono"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <IconPhone size={20} />
                      <span className="text-[11px] text-[var(--text-secondary)]">Teléfono</span>
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ContactModal;
