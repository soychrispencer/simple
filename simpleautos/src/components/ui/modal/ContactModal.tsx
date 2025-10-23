"use client";
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconMail, IconMessageCircle, IconBrandWhatsapp, IconX, IconPhone, IconCopy, IconCheck, IconUser } from '@tabler/icons-react';
import Button from '../Button';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Información básica requerida
  contactName: string;
  // Información opcional del contacto
  email?: string;
  phone?: string;
  whatsapp?: string;
  // Información del contexto (vehículo, etc.)
  contextTitle?: string;
  contextType?: 'vehicle' | 'profile';
  // Callbacks opcionales
  onEmailContact?: () => void;
  onWhatsAppContact?: () => void;
  onPhoneCall?: () => void;
  onMessageContact?: () => void;
}

export default function ContactModal({
  isOpen,
  onClose,
  contactName,
  email,
  phone,
  whatsapp,
  contextTitle,
  contextType = 'profile',
  onEmailContact,
  onWhatsAppContact,
  onPhoneCall,
  onMessageContact
}: ContactModalProps) {
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Asegurarse de que estamos en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleEmailContact = () => {
    if (onEmailContact) {
      onEmailContact();
    } else if (email) {
      const subject = contextTitle
        ? encodeURIComponent(`Consulta sobre: ${contextTitle}`)
        : encodeURIComponent('Consulta');
      const body = contextTitle
        ? encodeURIComponent(`Hola ${contactName},\n\nEstoy interesado en "${contextTitle}".\n\n`)
        : encodeURIComponent(`Hola ${contactName},\n\nMe gustaría contactarte.\n\n`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
  };

  const handleWhatsAppContact = () => {
    if (onWhatsAppContact) {
      onWhatsAppContact();
    } else {
      const contactPhone = whatsapp || phone;
      if (contactPhone) {
        const cleanPhone = contactPhone.replace(/\D/g, '');
        const message = contextTitle
          ? encodeURIComponent(`Hola ${contactName}, estoy interesado en "${contextTitle}".`)
          : encodeURIComponent(`Hola ${contactName}, me gustaría contactarte.`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
      }
    }
  };

  const handlePhoneCall = () => {
    if (onPhoneCall) {
      onPhoneCall();
    } else if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleMessageContact = () => {
    if (onMessageContact) {
      onMessageContact();
    } else {
      alert('Sistema de mensajería en desarrollo');
      onClose();
    }
  };

  const copyToClipboard = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const modalContent = (
    <>
      {/* Overlay con blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] transition-opacity duration-300"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal centrado */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-lightcard dark:bg-darkcard rounded-3xl shadow-2xl max-w-lg w-full pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modalSlideUp 0.3s ease-out' }}
        >
          {/* Header con gradiente */}
          <div className="relative bg-gradient-to-br from-lightborder via-lightborder/95 to-lightborder/90 dark:from-darkbg dark:via-darkbg/95 dark:to-darkbg/90 px-6 py-8 text-darktext dark:text-darktext">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-all duration-200 hover:scale-110"
              aria-label="Cerrar"
            >
              <IconX size={22} />
            </button>

            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                {contextType === 'vehicle' ? (
                  <IconMessageCircle size={28} className="text-darktext" />
                ) : (
                  <IconUser size={28} className="text-darktext" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {contextType === 'vehicle' ? 'Contactar vendedor' : 'Contactar'}
                </h2>
                <p className="text-darktext/80 dark:text-darktext/70 text-sm mt-1">
                  {contactName}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Información del contexto */}
            {contextTitle && (
              <div className="mb-6 p-4 bg-lightbg dark:bg-darkbg rounded-2xl border border-lightborder/10 dark:border-darkborder/10">
                <p className="text-xs font-semibold text-lighttext/60 dark:text-darktext/60 uppercase tracking-wider mb-2">
                  {contextType === 'vehicle' ? 'Consultando sobre' : 'Sobre'}
                </p>
                <p className="font-semibold text-lighttext dark:text-darktext text-lg">
                  {contextTitle}
                </p>
              </div>
            )}

            {/* Opciones de contacto principales */}
            <div className="space-y-3 mb-4">
              {/* WhatsApp - Opción destacada */}
              {(whatsapp || phone) && (
                <button
                  onClick={handleWhatsAppContact}
                  className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconBrandWhatsapp size={26} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-base">Enviar WhatsApp</div>
                      <div className="text-sm text-green-50 opacity-90">{whatsapp || phone}</div>
                    </div>
                  </div>
                </button>
              )}

              {/* Email */}
              {email && (
                <button
                  onClick={handleEmailContact}
                  className="w-full p-4 bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkcard text-lighttext dark:text-darktext rounded-2xl transition-all duration-200 hover:shadow-md border border-lightborder/20 dark:border-darkborder/10 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-lightborder dark:bg-darkcard text-darktext flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconMail size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-base">Enviar correo</div>
                      <div className="text-sm text-lighttext/70 dark:text-darktext/70 opacity-90 truncate">{email}</div>
                    </div>
                  </div>
                </button>
              )}

              {/* Llamada telefónica */}
              {phone && (
                <button
                  onClick={handlePhoneCall}
                  className="w-full p-4 bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkcard text-lighttext dark:text-darktext rounded-2xl transition-all duration-200 hover:shadow-md border border-lightborder/20 dark:border-darkborder/10 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-lightborder dark:bg-darkcard text-darktext flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconPhone size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-base">Llamar ahora</div>
                      <div className="text-sm text-lighttext/70 dark:text-darktext/70 opacity-90">{phone}</div>
                    </div>
                  </div>
                </button>
              )}

              {/* Mensaje interno */}
              <button
                onClick={handleMessageContact}
                className="w-full p-4 bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkcard text-lighttext dark:text-darktext rounded-2xl transition-all duration-200 hover:shadow-md border border-lightborder/20 dark:border-darkborder/10 hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-lightborder dark:bg-darkcard text-darktext flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IconMessageCircle size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base">Mensaje interno</div>
                    <div className="text-sm text-lighttext/70 dark:text-darktext/70 opacity-90">Chat de SimpleAutos</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Opciones de copiar */}
            <div className="space-y-2 mb-4">
              {email && (
                <button
                  onClick={() => copyToClipboard(email, 'email')}
                  className="w-full p-3 bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkcard rounded-xl transition-all duration-200 flex items-center justify-between group border border-lightborder/10 dark:border-darkborder/5"
                >
                  <span className="text-sm text-lighttext/70 dark:text-darktext/70">Copiar email</span>
                  {copiedEmail ? (
                    <IconCheck size={18} className="text-green-500" />
                  ) : (
                    <IconCopy size={18} className="text-lighttext/50 dark:text-darktext/50 group-hover:text-lighttext/80 dark:group-hover:text-darktext/80" />
                  )}
                </button>
              )}
              {phone && (
                <button
                  onClick={() => copyToClipboard(phone, 'phone')}
                  className="w-full p-3 bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkcard rounded-xl transition-all duration-200 flex items-center justify-between group border border-lightborder/10 dark:border-darkborder/5"
                >
                  <span className="text-sm text-lighttext/70 dark:text-darktext/70">Copiar teléfono</span>
                  {copiedPhone ? (
                    <IconCheck size={18} className="text-green-500" />
                  ) : (
                    <IconCopy size={18} className="text-lighttext/50 dark:text-darktext/50 group-hover:text-lighttext/80 dark:group-hover:text-darktext/80" />
                  )}
                </button>
              )}
            </div>

            {/* Nota de privacidad */}
            <div className="pt-4 border-t border-lightborder/10 dark:border-darkborder/10">
              <p className="text-xs text-center text-lighttext/60 dark:text-darktext/60 leading-relaxed">
                🔒 Tu información será tratada de forma confidencial y solo será compartida con el contacto para facilitar la comunicación
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para animaciones */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );

  // Usar portal para renderizar fuera del DOM de la tarjeta
  return createPortal(modalContent, document.body);
}