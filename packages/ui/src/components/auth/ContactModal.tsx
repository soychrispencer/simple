'use client';

import React, { useState } from 'react';
import { Button } from '../ui';
import Modal from '../ui/modal/Modal';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contextTitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contextType?: 'vehicle' | 'profile' | 'general' | 'property';
  itemId?: string;
  itemType?: 'property' | 'vehicle';
  itemTitle?: string;
  isAuction?: boolean;
  auctionComponent?: React.ReactNode;
  supabaseClient: any;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  contactName,
  contextTitle,
  email,
  phone,
  whatsapp,
  contextType,
  itemId,
  itemType,
  itemTitle,
  isAuction = false,
  auctionComponent,
  supabaseClient,
}) => {
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [leadCreated, setLeadCreated] = useState(false);

  if (!isOpen) return null;

  const createLeadInCRM = async () => {
    if (!itemId || !itemType || !itemTitle) return;

    setIsCreatingLead(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        alert('Debes iniciar sesión para contactar');
        return;
      }

      const leadData = {
        user_id: user.id,
        name: contactName || 'Interesado anónimo',
        email,
        phone,
        whatsapp,
        source: 'website',
        status: 'new',
        priority: 'medium',
        notes: `Interés en ${itemTitle}`,
        property_interest: itemType === 'property' ? itemId : null,
        vehicle_interest: itemType === 'vehicle' ? itemId : null,
      };

      const { error } = await supabaseClient.from('leads').insert(leadData);
      if (error) throw error;

      setLeadCreated(true);

      const latestLead = await supabaseClient
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      await supabaseClient.from('lead_interactions').insert({
        lead_id: latestLead.data?.id,
        user_id: user.id,
        type: 'note',
        description: 'Lead creado desde página de detalle',
        notes: `Usuario mostró interés en ${itemTitle}`,
      });
    } catch (error) {
      console.error('Error creando lead:', error);
      alert('Error al registrar el interés. Intenta nuevamente.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleEmailClick = async () => {
    if (!email) return;
    await createLeadInCRM();
    window.location.href = `mailto:${email}?subject=Interesado en ${contextTitle || itemTitle}`;
  };

  const handlePhoneClick = async () => {
    if (!phone) return;
    await createLeadInCRM();
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppClick = async () => {
    if (!whatsapp && !phone) return;
    await createLeadInCRM();
    const target = whatsapp || phone || '';
    const digits = target.replace(/[^\d]/g, '');
    const url = `https://wa.me/${digits}`;
    window.open(url, '_blank');
  };

  const labelPrefix = itemType === 'property'
    ? 'Propiedad:'
    : itemType === 'vehicle'
      ? 'Vehículo:'
      : contextType === 'vehicle'
        ? 'Vehículo:'
        : contextType === 'property'
          ? 'Propiedad:'
          : 'Elemento:';

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      showClose={false}
      maxWidth={isAuction ? 'max-w-2xl' : 'max-w-md'}
      contentClassName="p-0"
    >
      <div
        className={`card-surface border border-[var(--card-border)] ${isAuction ? 'max-h-[90vh] overflow-y-auto' : ''}`}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {isAuction ? `Subasta: ${contextTitle || itemTitle}` : 'Contactar'}
            </h3>
            <button
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)]"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {leadCreated && (
            <div className="p-3 bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] text-[var(--color-success)] rounded">
              ✅ Lead registrado en el CRM exitosamente
            </div>
          )}

          {isAuction && auctionComponent ? (
            <div className="space-y-4">
              {auctionComponent}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={onClose}
                  className="bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)]"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(contextTitle || itemTitle) && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{labelPrefix}</p>
                  <p className="font-medium text-[var(--text-primary)]">{contextTitle || itemTitle}</p>
                </div>
              )}

              <div className="space-y-2">
                {email && (
                  <Button
                    onClick={handleEmailClick}
                    disabled={isCreatingLead}
                    className="w-full bg-primary hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] disabled:opacity-50"
                  >
                    {isCreatingLead ? 'Registrando...' : 'Enviar Email'}
                  </Button>
                )}

                {phone && (
                  <Button
                    onClick={handlePhoneClick}
                    disabled={isCreatingLead}
                    className="w-full bg-primary hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] disabled:opacity-50"
                  >
                    {isCreatingLead ? 'Registrando...' : 'Llamar'}
                  </Button>
                )}

                {(whatsapp || phone) && (
                  <Button
                    onClick={handleWhatsAppClick}
                    disabled={isCreatingLead}
                    className="w-full bg-[var(--color-success)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] disabled:opacity-50"
                  >
                    {isCreatingLead ? 'Registrando...' : 'WhatsApp'}
                  </Button>
                )}

                {!email && !phone && !whatsapp && (
                  <div className="text-center py-4 text-[var(--text-secondary)]">
                    No hay información de contacto disponible
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={onClose}
                  className="bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)]"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ContactModal;
