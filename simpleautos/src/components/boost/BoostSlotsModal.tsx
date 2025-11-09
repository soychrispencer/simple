'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { getBoostPrice, BoostSlotKey, BoostDuration } from '@/lib/mercadopago';
import { 
  IconX, 
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
import { useToast } from '@/components/ui/toast/ToastProvider';
import { createVehicleBoost, updateVehicleBoostSlots } from '@/app/actions/boosts';

interface BoostSlot {
  id: number;
  key: string;
  name: string;
  description: string;
  is_paid: boolean;
  max_items: number;
  price_multiplier: number;
}

interface ActiveSlot {
  slot_id: number;
  end_date: string;
}

interface BoostSlotsModalProps {
  vehicleId: string;
  vehicleTitle: string;
  listingType: 'sale' | 'rent' | 'auction';
  userId?: string; // ID del usuario autenticado (opcional, se obtiene de sesión si no se pasa)
  onClose: () => void;
  onSuccess?: () => void;
}

export function BoostSlotsModal({ vehicleId, vehicleTitle, listingType, userId: propUserId, onClose, onSuccess }: BoostSlotsModalProps) {
  const [slots, setSlots] = useState<BoostSlot[]>([]);
  const [activeSlots, setActiveSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<BoostDuration>('7_dias');
  const supabase = getSupabaseClient();
  const { addToast } = useToast();
  const { createBoostPayment, loading: paymentLoading, error: paymentError } = useMercadoPago();

  // Función para determinar qué slots están disponibles según el tipo de publicación
  const isSlotAvailableForListingType = (slotKey: string): boolean => {
    // home_main y user_page están disponibles para todos
    if (slotKey === 'home_main' || slotKey === 'user_page') {
      return true;
    }

    // Mapear el tipo de publicación con su slot correspondiente
    const slotMapping: Record<string, string> = {
      'sale': 'venta_tab',
      'rent': 'arriendo_tab',
      'auction': 'subasta_tab'
    };

    return slotKey === slotMapping[listingType];
  };

  // Asegurarse de que estamos en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = 'hidden';
      loadSlotsAndActive();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mounted, vehicleId]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function loadSlotsAndActive() {
    try {
      // Cargar todos los slots disponibles
      const { data: slotsData, error: slotsError } = await supabase
        .from('boost_slots')
        .select('*')
        .order('price_multiplier', { ascending: false });

      if (slotsError) throw slotsError;
      
      // Filtrar slots según el tipo de publicación
      const filteredSlots = (slotsData || []).filter(slot => 
        isSlotAvailableForListingType(slot.key)
      );
      
      setSlots(filteredSlots);

      // Cargar slots activos para este vehículo
      const { data: activeData, error: activeError } = await supabase
        .from('vehicle_boost_slots')
        .select('slot_id, end_date')
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString());

      if (activeError) throw activeError;
      
      const activeSlotIds = (activeData || []).map((item: ActiveSlot) => item.slot_id);
      setActiveSlots(activeSlotIds);

    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSlot = (slotId: number, isPaid: boolean) => {
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
      // 0. Obtener el userId (de prop o de sesión)
      let userId = propUserId;
      
      if (!userId) {
        console.log('⚠️ No userId from props, getting from session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          console.error('Error getting session:', sessionError);
          addToast('Debes iniciar sesión para impulsar vehículos', { type: 'error' });
          return;
        }
        
        userId = session.user.id;
        console.log('✅ Got userId from session:', userId);
      }

      // Verificar si hay slots pagados seleccionados
      const selectedSlots = slots.filter(slot => activeSlots.includes(slot.id));
      const paidSlots = selectedSlots.filter(slot => slot.is_paid);

      if (paidSlots.length > 0) {
        // Hay slots pagados - redirigir a pago
        if (paidSlots.length > 1) {
          addToast('Solo puedes seleccionar un slot pagado a la vez', { type: 'error' });
          return;
        }

        const slot = paidSlots[0];
        const slotKey = slot.key as BoostSlotKey;

        // Crear pago con MercadoPago
        await createBoostPayment(slotKey, selectedDuration, vehicleId, vehicleTitle);
        // La función redirigirá automáticamente a MercadoPago
        return;
      }

      // Solo slots gratuitos - aplicar directamente
      // 1. Crear/obtener boost usando Server Action
      const boostResult = await createVehicleBoost(vehicleId, userId, 1);
      
      if (!boostResult.success || !boostResult.boost?.id) {
        console.error('❌ Error en createVehicleBoost:', boostResult.error);
        addToast(boostResult.error || 'Error al crear el boost', { type: 'error' });
        return;
      }

      console.log('✅ Boost ready:', boostResult.boost.id);

      // 2. Actualizar slots usando Server Action
      console.log('🚀 Llamando updateVehicleBoostSlots...');
      const slotsResult = await updateVehicleBoostSlots(vehicleId, userId, activeSlots);

      if (!slotsResult.success) {
        console.error('❌ Error en updateVehicleBoostSlots:', slotsResult.error);
        addToast(slotsResult.error || 'Error al actualizar slots', { type: 'error' });
        return;
      }

      console.log('✅ Slots actualizados:', slotsResult);

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
      console.error('Error saving slots:', error);
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
    if (!slot.is_paid) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  if (!mounted) return null;

  const modalContent = (
    <>
      {/* Overlay con blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] transition-opacity duration-300"
        onClick={handleOverlayClick}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      
      {/* Modal centrado */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-lightcard dark:bg-darkcard rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modalSlideUp 0.3s ease-out' }}
        >
          {/* Header con gradiente */}
          <div className="relative bg-gradient-to-br from-lightborder via-lightborder/95 to-lightborder/90 dark:from-darkbg dark:via-darkbg/95 dark:to-darkbg/90 px-6 py-6 text-lighttext dark:text-darktext flex-shrink-0">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-all duration-200"
              aria-label="Cerrar"
              disabled={saving}
            >
              <IconX size={22} />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <IconBolt size={28} className="text-lighttext" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Impulsar Publicación</h2>
                <p className="text-lighttext/80 dark:text-darktext/70 text-sm mt-1">
                  Elige dónde quieres que aparezca tu vehículo
                </p>
              </div>
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Información del vehículo */}
            <div className="mb-4 p-4 bg-lightbg dark:bg-darkbg rounded-xl border border-lightborder/10 dark:border-darkborder/10">
              <p className="text-xs font-semibold text-lighttext/60 dark:text-darktext/60 uppercase tracking-wider mb-2">
                Destacando vehículo
              </p>
              <p className="font-semibold text-lighttext dark:text-darktext">
                {vehicleTitle}
              </p>
            </div>

            {/* Mensaje informativo */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/30 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Haz clic en un espacio</strong> para seleccionarlo/deseleccionarlo. Luego presiona <strong>"Guardar Cambios"</strong>.
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
                    const canToggle = !slot.is_paid;
                    const SlotIcon = getSlotIcon(slot);

                    return (
                      <button
                        key={slot.id}
                        onClick={() => canToggle && toggleSlot(slot.id, slot.is_paid)}
                        disabled={!canToggle || slot.is_paid}
                        className={`w-full p-4 rounded-2xl transition-all duration-200 text-left border-2 relative overflow-hidden ${
                          isActive
                            ? 'bg-primary/10 border-primary shadow-md'
                            : slot.is_paid
                            ? 'bg-lightbg/50 dark:bg-darkbg/50 border-lightborder/10 dark:border-darkborder/10 opacity-75 cursor-not-allowed'
                            : 'bg-lightbg dark:bg-darkbg border-lightborder/20 dark:border-darkborder/10 hover:border-lightborder/40 dark:hover:border-darkborder/20 hover:shadow-md'
                        } ${!canToggle || slot.is_paid ? 'cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
                      >
                        {/* Badge "Próximamente" */}
                        {slot.is_paid && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-md flex items-center gap-1">
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
                                  ? 'bg-primary/20 text-primary' 
                                  : slot.is_paid
                                  ? 'bg-lightborder/50 dark:bg-darkcard/50 text-lighttext/40 dark:text-darktext/40'
                                  : 'bg-lightborder dark:bg-darkcard text-lighttext dark:text-darktext'
                              }`}>
                                <SlotIcon size={24} />
                              </div>
                              <div>
                                <h3 className={`font-bold text-base ${
                                  slot.is_paid 
                                    ? 'text-lighttext/50 dark:text-darktext/50'
                                    : 'text-lighttext dark:text-darktext'
                                }`}>
                                  {slot.name}
                                </h3>
                                <p className={`text-sm mt-0.5 ${
                                  slot.is_paid
                                    ? 'text-lighttext/40 dark:text-darktext/40'
                                    : 'text-lighttext/70 dark:text-darktext/70'
                                }`}>
                                  {slot.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {!slot.is_paid && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSlotBadgeColor(slot)}`}>
                                  GRATIS
                                </span>
                              )}
                              
                              {slot.key === 'home_main' && !slot.is_paid && (
                                <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
                                  <IconSparkles size={12} />
                                  +50% VISIBILIDAD
                                </span>
                              )}
                              
                              <span className={`text-xs ${
                                slot.is_paid
                                  ? 'text-lighttext/40 dark:text-darktext/40'
                                  : 'text-lighttext/60 dark:text-darktext/60'
                              }`}>
                                Máx. {slot.max_items} publicaciones
                              </span>
                            </div>
                          </div>
                          
                          {/* Checkmark */}
                          {isActive && (
                            <div className="flex-shrink-0 ml-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <IconCheck size={22} className="text-white" />
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
            {slots.some(slot => slot.is_paid && activeSlots.includes(slot.id)) && (
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border border-primary/20">
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
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedDuration === duration.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-lightborder/30 dark:border-darkborder/30 hover:border-primary/50'
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

          {/* Footer sticky con botones */}
          <div className="sticky bottom-0 px-6 py-4 bg-lightcard dark:bg-darkcard border-t border-lightborder/10 dark:border-darkborder/10 flex gap-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 rounded-xl font-medium bg-lightbg dark:bg-darkbg text-lighttext dark:text-darktext hover:bg-lightborder/20 dark:hover:bg-darkcard transition-all duration-200"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <IconLoader2 className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <IconCheck size={20} />
                  {slots.some(slot => slot.is_paid && activeSlots.includes(slot.id)) ? (
                    `Pagar ${getBoostPrice(
                      slots.find(slot => slot.is_paid && activeSlots.includes(slot.id))!.key as BoostSlotKey,
                      selectedDuration
                    ).toLocaleString()} CLP`
                  ) : (
                    'Guardar Cambios'
                  )}
                </>
              )}
            </button>
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

  // Usar portal para renderizar fuera del DOM
  return createPortal(modalContent, document.body);
}
