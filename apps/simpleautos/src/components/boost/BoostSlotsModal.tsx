'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import {
  getBoostPrice,
  type BoostSlotKey,
  type PaidBoostDuration,
  type FreeProfileDuration,
} from '@/lib/pricing';
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
import { logDebug } from '@/lib/logger';
import { logError } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const [slots, setSlots] = useState<BoostSlot[]>([]);
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [activeSlotEndsAt, setActiveSlotEndsAt] = useState<Record<string, string | null>>({});
  const [hasPublicProfile, setHasPublicProfile] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [paidDuration, setPaidDuration] = useState<PaidBoostDuration>('7_dias');
  const [freeProfileDuration, setFreeProfileDuration] = useState<FreeProfileDuration>('7_dias');
  const router = useRouter();
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

  const formatRemaining = useCallback((endsAtIso: string | null) => {
    if (!endsAtIso) {
      return { label: 'Indefinido', state: 'active' as const };
    }

    const endsAtMs = new Date(endsAtIso).getTime();
    if (!Number.isFinite(endsAtMs)) {
      return { label: 'Desconocido', state: 'unknown' as const };
    }

    const diffMs = endsAtMs - Date.now();
    if (diffMs <= 0) {
      return { label: 'Venció', state: 'expired' as const };
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (days === 0 && hours === 0) parts.push(`${minutes}m`);

    return { label: parts.join(' '), state: 'active' as const };
  }, []);

  const loadSlotsAndActive = useCallback(async () => {
    try {
      setLoading(true);

      if (!listingId) {
        addToast('No encontramos el ID de la publicación', { type: 'error' });
        return;
      }

      const params = new URLSearchParams({ listingId, listingType });
      const response = await fetch(`/api/boosts/slots?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, any>));
      if (!response.ok) {
        throw new Error(String((payload as any)?.error || 'Error loading boost slots'));
      }

      const slotsData = Array.isArray((payload as any)?.slots) ? (payload as any).slots : [];
      const filteredSlots = (slotsData || []).filter((slot: BoostSlot) => isSlotAvailableForListingType(slot));
      setSlots(filteredSlots);
      setHasPublicProfile(Boolean((payload as any)?.hasPublicProfile));
      setActiveSlots(Array.isArray((payload as any)?.activeSlotIds) ? (payload as any).activeSlotIds : []);
      setActiveSlotEndsAt((payload as any)?.activeSlotEndsAt && typeof (payload as any).activeSlotEndsAt === 'object'
        ? (payload as any).activeSlotEndsAt
        : {});
    } catch (error) {
      logError('Error loading slots', error);
      addToast('No pudimos cargar los espacios destacados', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast, isSlotAvailableForListingType, listingId, listingType]);

  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = 'hidden';
      loadSlotsAndActive();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mounted, loadSlotsAndActive]);

  const toggleSlot = (slotId: string) => {
    setActiveSlots(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const selectedSlots = slots.filter((slot) => activeSlots.includes(slot.id));
  const selectedPaidSlots = selectedSlots.filter((slot) => isPaidSlot(slot));

  const paidTotalClp = selectedPaidSlots.reduce((sum, slot) => {
    const slotKey = slot.key as BoostSlotKey;
    return sum + getBoostPrice(slotKey, paidDuration);
  }, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!listingId) {
        addToast('No encontramos el ID de la publicación', { type: 'error' });
        return;
      }

      // 0. Obtener el userId (de prop o de auth context)
      const userId = propUserId || user?.id || '';

      if (!userId) {
        addToast('No pudimos validar tu sesión, intenta nuevamente', { type: 'error' });
        return;
      }

      // Verificar si hay slots pagados seleccionados
      const paidSlots = selectedPaidSlots;

      if (paidSlots.length > 0) {
        // Hay slots pagados - redirigir a pago
        const allSelectedSlotKeys = paidSlots.map((slot) => slot.key as BoostSlotKey);
        const allSelectedSlotIds = paidSlots.map((slot) => slot.id);

        // Crear pago con MercadoPago
        try {
          await createBoostPayment({
            slotIds: allSelectedSlotIds,
            slotKeys: allSelectedSlotKeys,
            duration: paidDuration,
            listingId,
            listingTitle: vehicleTitle,
            userId,
          });
        } catch (e: any) {
          addToast(e?.message || 'No se pudo iniciar el pago', { type: 'error' });
        }
        // La función redirigirá automáticamente a MercadoPago
        return;
      }

      // Solo slots gratuitos - aplicar directamente
      // 1. Crear/obtener boost usando Server Action
      const durationDays = freeProfileDuration === 'indefinido'
        ? null
        : freeProfileDuration === '30_dias'
          ? 30
          : freeProfileDuration === '15_dias'
            ? 15
            : 7;

      const boostResult = await createVehicleBoost(listingId, userId, 1, durationDays);
      
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
      const slotsResult = await updateVehicleBoostSlots(listingId, userId, activeSlots, durationDays);

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
                    {selectedPaidSlots.length > 0 ? (
                      `Pagar ${paidTotalClp.toLocaleString()} CLP`
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
                    const hasExistingBoost = Object.prototype.hasOwnProperty.call(activeSlotEndsAt, slot.id);
                    const paidSlot = isPaidSlot(slot);
                    const SlotIcon = getSlotIcon(slot);
                    const isUserPageSlot = slot.key === 'user_page';
                    const userPageDisabled = !paidSlot && isUserPageSlot && !hasPublicProfile;

                    return (
                      <div key={slot.id}>
                        <div
                          onClick={() => {
                            if (userPageDisabled) return;
                            toggleSlot(slot.id);
                          }}
                          onKeyDown={(e) => {
                            if (userPageDisabled) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSlot(slot.id);
                            }
                          }}
                          aria-disabled={userPageDisabled}
                          role="button"
                          tabIndex={userPageDisabled ? -1 : 0}
                          className={`w-full p-4 rounded-2xl transition-all duration-200 text-left relative overflow-hidden shadow-card card-surface ${
                            isActive
                              ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a10)] shadow-token-md'
                              : 'hover:ring-[color:var(--color-primary-a40)] hover:shadow-token-md'
                          } ${userPageDisabled ? 'opacity-60 cursor-not-allowed hover:ring-transparent hover:shadow-none hover:scale-100 active:scale-100' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  isActive
                                    ? 'bg-[var(--color-primary-a10)] text-primary ring-1 ring-[color:var(--color-primary)]'
                                    : 'card-surface shadow-card text-lighttext dark:text-darktext'
                                }`}>
                                  <SlotIcon size={24} />
                                </div>
                                <div>
                                  <h3 className={`font-bold text-base ${
                                    'text-lighttext dark:text-darktext'
                                  }`}>
                                    {slot.title}
                                  </h3>
                                  <p className={`text-sm mt-0.5 ${
                                    'text-lighttext/70 dark:text-darktext/70'
                                  }`}>
                                    {slot.description}
                                  </p>

                                  {isActive && hasExistingBoost && (
                                    <p className="text-xs mt-1">
                                      {(() => {
                                        const remaining = formatRemaining(activeSlotEndsAt[slot.id] ?? null);
                                        const cls =
                                          remaining.state === 'expired'
                                            ? 'text-[var(--color-warn)]'
                                            : remaining.state === 'unknown'
                                              ? 'text-lighttext/60 dark:text-darktext/60'
                                              : 'text-primary';
                                        return <span className={cls}>Te queda: {remaining.label}</span>;
                                      })()}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSlotBadgeColor(slot)}`}>
                                  {paidSlot ? 'PAGADO' : 'GRATIS'}
                                </span>

                                {userPageDisabled && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] text-[var(--color-warn)] inline-flex items-center gap-1">
                                    <IconClock size={12} />
                                    Requiere perfil público
                                  </span>
                                )}

                                {slot.key === 'home_main' && (
                                  <span className="px-2 py-0.5 bg-[var(--color-warn)] text-[var(--color-on-primary)] rounded-full text-xs font-medium flex items-center gap-1">
                                    <IconSparkles size={12} />
                                    +50% VISIBILIDAD
                                  </span>
                                )}

                              </div>

                              {userPageDisabled && (
                                <div className="mt-3">
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onClose();
                                      router.push('/panel/mis-suscripciones');
                                    }}
                                  >
                                    Activar Pro
                                  </Button>
                                </div>
                              )}
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
                        </div>

                        {/* Selector de días/precios (solo debajo del slot pagado seleccionado) */}
                        {paidSlot && isActive && (
                          <div className="mt-2 p-3 card-surface ring-1 ring-[color:var(--color-primary-a20)] rounded-xl">
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: '1_dia' as PaidBoostDuration, label: '1 Día' },
                                { key: '3_dias' as PaidBoostDuration, label: '3 Días' },
                                { key: '7_dias' as PaidBoostDuration, label: '7 Días' },
                                { key: '15_dias' as PaidBoostDuration, label: '15 Días' },
                                { key: '30_dias' as PaidBoostDuration, label: '30 Días' },
                                { key: '90_dias' as PaidBoostDuration, label: '90 Días' },
                              ].map((duration) => {
                                const price = getBoostPrice(slot.key as BoostSlotKey, duration.key);
                                return (
                                  <button
                                    key={duration.key}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPaidDuration(duration.key);
                                    }}
                                    className={`p-3 rounded-lg text-left transition-all shadow-card card-surface ${
                                      paidDuration === duration.key
                                        ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a10)] text-primary shadow-token-sm'
                                        : 'hover:ring-[color:var(--color-primary-a40)] hover:shadow-token-sm'
                                    }`}
                                  >
                                    <div className="font-medium text-sm">{duration.label}</div>
                                    <div className="text-xs text-lighttext/60 dark:text-darktext/60">
                                      ${price.toLocaleString()} CLP
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Selector gratis (perfil vendedor): 7d / 15d / 30d / indefinido */}
                        {!paidSlot && isActive && slot.key === 'user_page' && (
                          <div className="mt-2 p-3 card-surface ring-1 ring-[color:var(--color-primary-a20)] rounded-xl">
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: '7_dias' as FreeProfileDuration, label: '7 Días' },
                                { key: '15_dias' as FreeProfileDuration, label: '15 Días' },
                                { key: '30_dias' as FreeProfileDuration, label: '30 Días' },
                                { key: 'indefinido' as FreeProfileDuration, label: 'Indefinido' },
                              ].map((duration) => (
                                <button
                                  key={duration.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setFreeProfileDuration(duration.key);
                                  }}
                                  className={`p-3 rounded-lg text-left transition-all shadow-card card-surface ${
                                    freeProfileDuration === duration.key
                                      ? 'ring-[color:var(--color-primary)] bg-[var(--color-primary-a10)] text-primary shadow-token-sm'
                                      : 'hover:ring-[color:var(--color-primary-a40)] hover:shadow-token-sm'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{duration.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Resumen (desglose + total) */}
            {selectedPaidSlots.length > 0 && (
              <div className="mt-6 p-4 card-surface ring-1 ring-[color:var(--color-primary-a20)] rounded-xl">
                <div className="text-xs font-semibold text-lighttext/80 dark:text-darktext/80 mb-2">
                  Resumen
                </div>
                <div className="space-y-1">
                  {selectedPaidSlots.map((slot) => {
                    const price = getBoostPrice(slot.key as BoostSlotKey, paidDuration);
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between text-xs text-lighttext/70 dark:text-darktext/70"
                      >
                        <span className="truncate pr-2">{slot.title}</span>
                        <span className="font-medium">${price.toLocaleString()} CLP</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-lighttext dark:text-darktext">
                    Total
                  </span>
                  <span className="text-sm font-semibold text-lighttext dark:text-darktext">
                    ${selectedPaidSlots
                      .reduce((acc, slot) => {
                        const price = getBoostPrice(slot.key as BoostSlotKey, paidDuration);
                        return acc + price;
                      }, 0)
                      .toLocaleString()} CLP
                  </span>
                </div>
              </div>
            )}
      </div>
    </Modal>
  );
}







