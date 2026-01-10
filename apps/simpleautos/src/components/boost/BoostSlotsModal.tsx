'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { getBoostPrice, BoostSlotKey, BoostDuration } from '@/lib/mercadopago';
import { 
  IconCheck, 
  IconLoader2, 
  IconBolt,
  IconHome,
  IconShoppingCart,
  IconKey,
  IconGavel,
  IconUser,
  IconSparkles,
  IconClock
} from '@tabler/icons-react';
import { useToast, Modal, Button } from '@simple/ui';
import { createVehicleBoost, updateVehicleBoostSlots } from '@/app/actions/boosts';
import { listAutosBoostSlots } from '@/lib/boosts';
import { logDebug } from '@/lib/logger';
import { logError } from '@/lib/logger';

interface BoostSlot {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  placement?: string | null;
  max_active?: number | null;
  default_duration_days?: number | null;
  config?: Record<string, any> | null;
}

interface BoostSlotsModalProps {
  listingId: string;
  vehicleTitle: string;
  listingType: 'sale' | 'rent' | 'auction';
  userId?: string; // ID del usuario autenticado (opcional, se obtiene de sesión si no se pasa)
  onClose: () => void;
  onSuccess?: () => void;
}

export function BoostSlotsModal({ listingId, vehicleTitle, listingType, userId: propUserId, onClose, onSuccess }: BoostSlotsModalProps) {
  const [slots, setSlots] = useState<BoostSlot[]>([]);
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<BoostDuration>('7_dias');
  const supabase = getSupabaseClient();
  const { addToast } = useToast();
  const { createBoostPayment } = useMercadoPago();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Función para determinar qué slots están disponibles según el tipo de publicación
  const isSlotAvailableForListingType = useCallback((slot: BoostSlot): boolean => {
    const allowed = Array.isArray(slot.config?.listing_types) ? slot.config?.listing_types : null;
    if (!allowed || allowed.length === 0) {
      return true;
    }
    return allowed.includes(listingType);
  }, [listingType]);

  const isPaidSlot = useCallback((slot: BoostSlot) => (slot.price ?? 0) > 0, []);

  const loadSlotsAndActive = useCallback(async () => {
    try {
      setLoading(true);
      const slotsData = await listAutosBoostSlots(supabase);
      const filteredSlots = (slotsData || []).filter((slot) => isSlotAvailableForListingType(slot));
      setSlots(filteredSlots);

      if (!listingId) {
        addToast('No encontramos el ID de la publicación', { type: 'error' });
        return;
      }

      const { data: activeData, error: activeError } = await supabase
        .from('listing_boost_slots')
        .select('slot_id')
        .eq('listing_id', listingId)
        .eq('is_active', true);

      if (activeError) throw activeError;

      const activeSlotIds = (activeData || []).map((item: { slot_id: string }) => item.slot_id);
      setActiveSlots(activeSlotIds);
    } catch (error) {
      logError('Error loading slots', error);
      addToast('No pudimos cargar los espacios destacados', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast, isSlotAvailableForListingType, supabase, listingId]);

  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = 'hidden';
      loadSlotsAndActive();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mounted, loadSlotsAndActive]);

  const toggleSlot = (slotId: string, isPaid: boolean) => {
    // Por ahora, solo permitir slots gratuitos
    if (isPaid) {
      return; // No hacer nada si es pagado
    }

    setActiveSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!listingId) {
        addToast('No encontramos el ID de la publicación', { type: 'error' });
        return;
      }

      // 0. Obtener el userId (de prop o de sesión)
      let userId = propUserId;
      
      if (!userId) {
        logDebug('[BoostSlotsModal] No userId from props; getting from session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          logError('Error getting session', sessionError);
          addToast('Debes iniciar sesión para impulsar vehículos', { type: 'error' });
          return;
        }
        
        userId = session.user.id;
        logDebug('[BoostSlotsModal] Got userId from session', { userId });
      }

      if (!userId) {
        addToast('No pudimos validar tu sesión, intenta nuevamente', { type: 'error' });
        return;
      }

      // Verificar si hay slots pagados seleccionados
      const selectedSlots = slots.filter(slot => activeSlots.includes(slot.id));
      const paidSlots = selectedSlots.filter((slot) => isPaidSlot(slot));

      if (paidSlots.length > 0) {
        // Hay slots pagados - redirigir a pago
        if (paidSlots.length > 1) {
          addToast('Solo puedes seleccionar un slot pagado a la vez', { type: 'error' });
          return;
        }

        const slot = paidSlots[0];
        const slotKey = slot.key as BoostSlotKey;

        // Crear pago con MercadoPago
        await createBoostPayment({
          slotId: slot.id,
          slotKey,
          duration: selectedDuration,
          listingId,
          listingTitle: vehicleTitle,
          userId,
        });
        // La función redirigirá automáticamente a MercadoPago
        return;
      }

      // Solo slots gratuitos - aplicar directamente
      // 1. Crear/obtener boost usando Server Action
      const boostResult = await createVehicleBoost(listingId, userId, 1);
      
      if (!boostResult.success || !boostResult.boost?.id) {
        logError('[BoostSlotsModal] Error en createVehicleBoost', {
          error: boostResult.error,
          details: (boostResult as any).details,
          listingId,
          userId,
        });
        addToast(boostResult.error || 'Error al crear el boost', { type: 'error' });
        return;
      }

      logDebug('[BoostSlotsModal] Boost ready', { boostId: boostResult.boost.id });

      // 2. Actualizar slots usando Server Action
      logDebug('[BoostSlotsModal] Calling updateVehicleBoostSlots');
      const slotsResult = await updateVehicleBoostSlots(listingId, userId, activeSlots);

      if (!slotsResult.success) {
        logError('[BoostSlotsModal] Error en updateVehicleBoostSlots', slotsResult.error);
        addToast(slotsResult.error || 'Error al actualizar slots', { type: 'error' });
        return;
      }

      logDebug('[BoostSlotsModal] Slots updated', slotsResult);

      // 3. Mensaje de éxito
      const totalChanges = (slotsResult.addedCount || 0) + (slotsResult.removedCount || 0);
      if (totalChanges > 0) {
        const messages = [];
        if (slotsResult.addedCount && slotsResult.addedCount > 0) messages.push(`${slotsResult.addedCount} slot(s) agregado(s)`);
        if (slotsResult.removedCount && slotsResult.removedCount > 0) messages.push(`${slotsResult.removedCount} slot(s) removido(s)`);
        addToast(`Cambios guardados: ${messages.join(', ')}`, { type: 'success' });
      } else {
        addToast('No hay cambios que guardar', { type: 'info' });
      }
      
      onSuccess?.();
      onClose();

    } catch (error) {
      logError('Error saving slots', error);
      addToast('Error al guardar cambios', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getSlotIcon = (slot: BoostSlot) => {
    switch (slot.key) {
      case 'home_main': return IconHome;
      case 'venta_tab': return IconShoppingCart;
      case 'arriendo_tab': return IconKey;
      case 'subasta_tab': return IconGavel;
      case 'user_page': return IconUser;
      default: return IconBolt;
    }
  };

  const getSlotBadgeColor = (slot: BoostSlot) => {
    if (!isPaidSlot(slot)) {
      return 'bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] text-[var(--color-success)]';
    }
    return 'bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] text-[var(--color-warn)]';
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (saving) return;
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      open
      onClose={handleClose}
      title="Impulsar publicación"
      maxWidth="max-w-2xl"
      footer={(
        <div className="flex gap-3">
          <Button type="button" variant="ghost" size="md" onClick={handleClose} disabled={saving} className="flex-1">
            Cancelar
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <IconLoader2 className="animate-spin" size={18} />
                Guardando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <IconCheck size={18} />
                {slots.some(slot => isPaidSlot(slot) && activeSlots.includes(slot.id)) ? (
                  `Pagar ${getBoostPrice(
                    slots.find(slot => isPaidSlot(slot) && activeSlots.includes(slot.id))!.key as BoostSlotKey,
                    selectedDuration
                  ).toLocaleString()} CLP`
                ) : (
                  'Guardar cambios'
                )}
              </span>
            )}
          </Button>
        </div>
      )}
      contentClassName="p-0 flex flex-col min-h-0"
      containerClassName="max-h-[90vh] flex flex-col"
    >
      <div className="px-6 py-5 border-b border-border/60 card-surface">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full card-surface shadow-card flex items-center justify-center">
            <IconBolt size={24} className="text-[var(--text-primary)]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">
              Elige dónde quieres que aparezca tu vehículo
            </p>
            <p className="text-sm font-semibold text-lighttext dark:text-darktext truncate">
              {vehicleTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {/* Información del vehículo */}
            {/* Mensaje informativo */}
            <div className="mb-4 p-3 card-surface rounded-xl shadow-card">
              <p className="text-xs text-lighttext/80 dark:text-darktext/80 flex items-center gap-2">
                <span>
                  <strong>Haz clic en un espacio</strong> para seleccionarlo/deseleccionarlo. Luego presiona <strong>“Guardar cambios”</strong>.
                </span>
              </p>
            </div>

            {/* Slots disponibles */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <IconLoader2 className="animate-spin text-lighttext dark:text-darktext" size={32} />
                </div>
              ) : (
                <>
                  {slots.map(slot => {
                    const isActive = activeSlots.includes(slot.id);
                    const paidSlot = isPaidSlot(slot);
                    const canToggle = !paidSlot;
                    const SlotIcon = getSlotIcon(slot);

                    return (
                      <button
                        key={slot.id}
                        onClick={() => canToggle && toggleSlot(slot.id, paidSlot)}
                        disabled={!canToggle || paidSlot}
                        className={`w-full p-4 rounded-2xl transition-all duration-200 text-left relative overflow-hidden shadow-card card-surface ${
                          isActive
                            ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a10)] shadow-token-md'
                            : paidSlot
                            ? 'card-surface/80 ring-border/40 opacity-75 cursor-not-allowed'
                            : 'hover:ring-[color:var(--color-primary-a40)] hover:shadow-token-md'
                        } ${!canToggle || paidSlot ? 'cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
                      >
                        {/* Badge "Próximamente" */}
                        {paidSlot && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-3 py-1 bg-[var(--color-warn)] text-[var(--color-on-primary)] rounded-full text-xs font-bold flex items-center gap-1">
                              <IconClock size={14} />
                              PRÓXIMAMENTE
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                isActive 
                                  ? 'bg-[var(--color-primary-a10)] text-primary ring-1 ring-[color:var(--color-primary)]'
                                  : paidSlot
                                  ? 'card-surface/60 ring-1 ring-border/40 text-lighttext/40 dark:text-darktext/40'
                                  : 'card-surface shadow-card text-lighttext dark:text-darktext'
                              }`}>
                                <SlotIcon size={24} />
                              </div>
                              <div>
                                <h3 className={`font-bold text-base ${
                                  paidSlot 
                                    ? 'text-lighttext/50 dark:text-darktext/50'
                                    : 'text-lighttext dark:text-darktext'
                                }`}>
                                  {slot.title}
                                </h3>
                                <p className={`text-sm mt-0.5 ${
                                  paidSlot
                                    ? 'text-lighttext/40 dark:text-darktext/40'
                                    : 'text-lighttext/70 dark:text-darktext/70'
                                }`}>
                                  {slot.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {!paidSlot && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSlotBadgeColor(slot)}`}>
                                  GRATIS
                                </span>
                              )}
                              
                              {slot.key === 'home_main' && !paidSlot && (
                                <span className="px-2 py-0.5 bg-[var(--color-warn)] text-[var(--color-on-primary)] rounded-full text-xs font-medium flex items-center gap-1">
                                  <IconSparkles size={12} />
                                  +50% VISIBILIDAD
                                </span>
                              )}
                              
                              <span className={`text-xs ${
                                paidSlot
                                  ? 'text-lighttext/40 dark:text-darktext/40'
                                  : 'text-lighttext/60 dark:text-darktext/60'
                              }`}>
                                Máx. {slot.max_active ?? '∞'} publicaciones
                              </span>
                            </div>
                          </div>
                          
                          {/* Checkmark */}
                          {isActive && (
                            <div className="flex-shrink-0 ml-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <IconCheck size={22} className="text-[var(--color-on-primary)]" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Selección de duración para slots pagados */}
            {slots.some(slot => isPaidSlot(slot) && activeSlots.includes(slot.id)) && (
              <div className="mt-6 p-4 card-surface ring-1 ring-[color:var(--color-primary-a20)] rounded-xl">
                <h3 className="text-sm font-semibold text-lighttext dark:text-darktext mb-3 flex items-center gap-2">
                  <IconClock size={16} />
                  Duración del destacado
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: '1_dia' as BoostDuration, label: '1 Día', price: getBoostPrice('home_main', '1_dia') },
                    { key: '3_dias' as BoostDuration, label: '3 Días', price: getBoostPrice('home_main', '3_dias') },
                    { key: '7_dias' as BoostDuration, label: '7 Días', price: getBoostPrice('home_main', '7_dias') },
                    { key: '15_dias' as BoostDuration, label: '15 Días', price: getBoostPrice('home_main', '15_dias') },
                    { key: '30_dias' as BoostDuration, label: '30 Días', price: getBoostPrice('home_main', '30_dias') },
                  ].map((duration) => (
                    <button
                      key={duration.key}
                      onClick={() => setSelectedDuration(duration.key)}
                      className={`p-3 rounded-lg text-left transition-all shadow-card card-surface ${
                        selectedDuration === duration.key
                          ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a10)] text-primary shadow-token-sm'
                          : 'hover:ring-[color:var(--color-primary-a40)] hover:shadow-token-sm'
                      }`}
                    >
                      <div className="font-medium text-sm">{duration.label}</div>
                      <div className="text-xs text-lighttext/60 dark:text-darktext/60">
                        ${duration.price.toLocaleString()} CLP
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
      </div>
    </Modal>
  );
}







