"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getVehicleById, VehicleDetail } from "@/lib/getVehicleById";
import { getDemoVehicleDetail, isDemoListingsEnabled } from "@/lib/demo/demoVehicles";
import { Button, CircleButton, ContactModal, Modal, Select, Textarea, UserAvatar, useToast, useDisplayCurrency } from "@simple/ui";
import { createPortal } from "react-dom";
import {
  IconArrowLeft, IconMapPin,
  IconBookmark, IconBookmarkFilled, IconShare, IconFlag,
  IconSettings, IconShieldCheck, IconFileText,
  IconCheck, IconInfoCircle, IconChevronLeft, IconChevronRight,
  IconNotes, IconListDetails, IconPlayerPlay, IconExternalLink,
  IconTag, IconCar, IconCaravan, IconCalendar, IconRoad, IconPalette,
  IconGasStation, IconManualGearbox, IconSteeringWheel, IconEngine,
  IconBolt, IconUsers, IconDoor, IconBox, IconCircleDot,
  IconCategory, IconBadge,
  IconBrandFacebook, IconBrandX, IconBrandWhatsapp, IconLink
} from "@tabler/icons-react";
import { toSpanish, fuelTypeMap, transmissionMap, conditionMap } from "@/lib/vehicleTranslations";
import { capitalize, formatPrice } from "@/lib/format";
import { getSpecCategory } from "@/components/vehicle-wizard/specDescriptors";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { convertFromClp } from "@/lib/displayCurrency";
import { getAvatarUrl } from "@/lib/supabaseStorage";

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
type DetailRow = { label: string; value: string; iconCmp?: IconCmp };

function rowIcon(IconCmp: IconCmp) {
  return <IconCmp size={16} className="text-[var(--text-tertiary)]" />;
}

const GENERAL_FALLBACK_POOL: IconCmp[] = [
  IconInfoCircle,
  IconFileText,
  IconSettings,
  IconTag,
  IconCircleDot,
];

const SPECS_FALLBACK_POOL: IconCmp[] = [
  IconSettings,
  IconFileText,
  IconInfoCircle,
  IconTag,
  IconCircleDot,
];

function pickUniqueIcon(candidates: IconCmp[], used: Set<IconCmp>, fallbackPool: IconCmp[]) {
  for (const cand of candidates) {
    if (!used.has(cand)) {
      used.add(cand);
      return cand;
    }
  }
  for (const cand of fallbackPool) {
    if (!used.has(cand)) {
      used.add(cand);
      return cand;
    }
  }
  // Si ya se agotó todo, repetimos el primero coherente.
  const first = candidates[0] ?? IconCircleDot;
  used.add(first);
  return first;
}

function getGeneralInfoCandidates(label: string): IconCmp[] {
  const key = label.toLowerCase();
  if (key.includes('marca')) return [IconBadge, IconTag, IconInfoCircle];
  if (key.includes('modelo')) return [IconCar, IconTag, IconFileText];
  if (key === 'tipo' || key.includes('tipo')) return [IconCategory, IconCar, IconTag];
  if (key.includes('carrocer')) return [IconCaravan, IconCar, IconBox];
  if (key.includes('año')) return [IconCalendar, IconFileText, IconInfoCircle];
  if (key.includes('kilomet')) return [IconRoad, IconCar, IconFileText];
  if (key.includes('condic')) return [IconCheck, IconInfoCircle, IconFileText];
  if (key.includes('color')) return [IconPalette, IconTag, IconInfoCircle];
  return [IconCircleDot, IconInfoCircle, IconFileText];
}

function getSpecCandidates(fieldId: string, label: string): IconCmp[] {
  const key = `${fieldId} ${label}`.toLowerCase();
  if (key.includes('combust') || key.includes('fuel')) return [IconGasStation, IconTag, IconInfoCircle];
  if (key.includes('transmi') || key.includes('gear')) return [IconManualGearbox, IconSettings, IconFileText];
  if (key.includes('tracc') || key.includes('awd') || key.includes('4x4')) return [IconSteeringWheel, IconSettings, IconCar];
  if (key.includes('motor') || key.includes('engine') || key.includes('cilind')) return [IconEngine, IconSettings, IconFileText];
  if (key.includes('potenc') || key.includes('hp') || key.includes('cv') || key.includes('kw')) return [IconBolt, IconEngine, IconInfoCircle];
  if (key.includes('asient') || key.includes('pasaj') || key.includes('seat')) return [IconUsers, IconCar, IconInfoCircle];
  if (key.includes('puert') || key.includes('door')) return [IconDoor, IconCar, IconInfoCircle];
  if (key.includes('carga') || key.includes('capacidad') || key.includes('peso') || key.includes('payload')) return [IconBox, IconInfoCircle, IconFileText];
  if (key.includes('año')) return [IconCalendar, IconFileText, IconInfoCircle];
  if (key.includes('kilomet') || key.includes('km')) return [IconRoad, IconCar, IconFileText];
  if (key.includes('color')) return [IconPalette, IconTag, IconInfoCircle];
  return [IconCircleDot, IconInfoCircle, IconFileText];
}

export default function VehiculoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const supabase = useSupabase();
  const { user, openAuthModal } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { currency: displayCurrency } = useDisplayCurrency();

  const { addToast } = useToast();

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("informacion-general");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<string>("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);

  useEffect(() => {
    setModalMounted(true);
  }, []);

  const reportReasonOptions = [
    { value: "fraud", label: "Posible fraude / estafa" },
    { value: "misleading", label: "Información engañosa" },
    { value: "prohibited", label: "Contenido prohibido" },
    { value: "duplicate", label: "Publicación duplicada" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Otro" },
  ];

  const openReport = () => {
    if (!user?.id) {
      addToast("Inicia sesión para reportar una publicación.", { type: "info" });
      openAuthModal?.("login");
      return;
    }
    setReportModalOpen(true);
  };

  useEffect(() => {
    if (!modalMounted) return;
    const shouldOpen = searchParams?.get('report') === '1';
    if (!shouldOpen) return;
    if (reportModalOpen) return;
    openReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalMounted, searchParams, user?.id, reportModalOpen]);

  const closeReport = () => {
    if (reportSubmitting) return;
    setReportModalOpen(false);
    setReportReason("");
    setReportDetails("");
  };

  const submitReport = async () => {
    if (!user?.id) {
      addToast("Inicia sesión para reportar una publicación.", { type: "info" });
      openAuthModal?.("login");
      return;
    }
    if (!id) {
      addToast("No pudimos identificar la publicación.", { type: "error" });
      return;
    }
    if (!supabase) {
      addToast("No se pudo enviar (sin conexión).", { type: "error" });
      return;
    }
    if (!reportReason) {
      addToast("Selecciona un motivo para reportar.", { type: "error" });
      return;
    }
    if (!reportDetails.trim()) {
      addToast("Cuéntanos brevemente la situación.", { type: "error" });
      return;
    }

    setReportSubmitting(true);
    try {
      const { error } = await supabase
        .from("listing_reports")
        .insert({ listing_id: id, reason: reportReason, details: reportDetails.trim() });

      if (error) {
        addToast(error.message || "No se pudo enviar el reporte.", { type: "error" });
        return;
      }

      addToast("Reporte enviado. Gracias por ayudarnos a mejorar.", { type: "success" });
      closeReport();
    } catch {
      addToast("No se pudo enviar el reporte.", { type: "error" });
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = id?.startsWith('demo-') && isDemoListingsEnabled()
          ? getDemoVehicleDetail(id)
          : await getVehicleById(id);
        if (cancelled) return;

        if (!data) {
          setError("Vehículo no encontrado");
          return;
        }

        setVehicle(data);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error al cargar el vehículo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasActiveSellerPlan = !!vehicle?.profiles?.plan && vehicle.profiles.plan !== 'free';
  const sellerSlug = vehicle?.public_profile?.slug || '';
  const canShowPublicSellerCard = hasActiveSellerPlan && !!sellerSlug;


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">Cargando vehículo…</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-[var(--color-danger)]">{error || "Vehículo no encontrado"}</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  const formatMoney = (value: number) => {
    if (!Number.isFinite(value)) return 'Precio no disponible';
    return formatPrice(convertFromClp(value, displayCurrency), { currency: displayCurrency });
  };

  const getDisplayPrice = () => {
    if (vehicle.listing_type === 'rent') {
      const rentDaily = typeof vehicle.rent_daily_price === 'number' ? vehicle.rent_daily_price : null;
      const rentWeekly = typeof vehicle.rent_weekly_price === 'number' ? vehicle.rent_weekly_price : null;
      const rentMonthly = typeof vehicle.rent_monthly_price === 'number' ? vehicle.rent_monthly_price : null;
      const rentPeriod = (vehicle as any).rent_price_period || (vehicle.metadata as any)?.rent_price_period || null;

      const rentBase = (() => {
        if (rentPeriod === 'daily' && rentDaily != null) return { amount: rentDaily, suffix: 'día' };
        if (rentPeriod === 'weekly' && rentWeekly != null) return { amount: rentWeekly, suffix: 'semana' };
        if (rentPeriod === 'monthly' && rentMonthly != null) return { amount: rentMonthly, suffix: 'mes' };
        if (rentDaily != null) return { amount: rentDaily, suffix: 'día' };
        if (rentWeekly != null) return { amount: rentWeekly, suffix: 'semana' };
        if (rentMonthly != null) return { amount: rentMonthly, suffix: 'mes' };
        return null;
      })();

      const advanced = ((vehicle.metadata as any)?.advanced_conditions ?? null) as any;
      const discountItems = advanced?.discounts && Array.isArray(advanced.discounts) ? (advanced.discounts as any[]) : [];
      if (rentBase && discountItems.length > 0) {
        const percentSum = discountItems
          .filter((d: any) => String(d?.type || '') === 'percentage' && typeof d?.value === 'number')
          .reduce((acc: number, d: any) => acc + Number(d.value), 0);
        const fixedSum = discountItems
          .filter((d: any) => String(d?.type || '') === 'fixed_amount' && typeof d?.value === 'number')
          .reduce((acc: number, d: any) => acc + Number(d.value), 0);
        const clampedPercent = Math.max(0, Math.min(100, percentSum));
        const afterPercent = Math.round(rentBase.amount * (1 - clampedPercent / 100));
        const finalPrice = Math.max(0, afterPercent - fixedSum);
        const savings = rentBase.amount - finalPrice;
        if (savings > 0) return `${formatMoney(finalPrice)}/${rentBase.suffix}`;
      }

      if (rentBase) return `${formatMoney(rentBase.amount)}/${rentBase.suffix}`;
      return vehicle.price ? formatMoney(vehicle.price) : 'Precio no disponible';
    }

    if (vehicle.listing_type === 'auction') {
      const basePrice = typeof vehicle.auction_start_price === 'number' ? vehicle.auction_start_price : (typeof vehicle.price === 'number' ? vehicle.price : null);
      const advanced = ((vehicle.metadata as any)?.advanced_conditions ?? null) as any;
      const discountItems = advanced?.discounts && Array.isArray(advanced.discounts) ? (advanced.discounts as any[]) : [];

      if (basePrice != null && discountItems.length > 0) {
        const percentSum = discountItems
          .filter((d: any) => String(d?.type || '') === 'percentage' && typeof d?.value === 'number')
          .reduce((acc: number, d: any) => acc + Number(d.value), 0);
        const fixedSum = discountItems
          .filter((d: any) => String(d?.type || '') === 'fixed_amount' && typeof d?.value === 'number')
          .reduce((acc: number, d: any) => acc + Number(d.value), 0);

        const clampedPercent = Math.max(0, Math.min(100, percentSum));
        const afterPercent = Math.round(basePrice * (1 - clampedPercent / 100));
        const finalPrice = Math.max(0, afterPercent - fixedSum);
        const savings = basePrice - finalPrice;
        if (savings > 0) return `${formatMoney(finalPrice)} (Precio base)`;
      }

      return basePrice != null ? `${formatMoney(basePrice)} (Precio base)` : 'Precio no disponible';
    }

    // Venta: si hay descuentos configurados, mostramos el precio con descuento aplicado.
    if (vehicle.listing_type === 'sale') {
      const basePrice = typeof vehicle.price === 'number' ? vehicle.price : null;
      const advanced = ((vehicle.metadata as any)?.advanced_conditions ?? null) as any;
      const discountItems = advanced?.discounts && Array.isArray(advanced.discounts) ? (advanced.discounts as any[]) : [];

      const percentSum = discountItems
        .filter((d: any) => String(d?.type || '') === 'percentage' && typeof d?.value === 'number')
        .reduce((acc: number, d: any) => acc + Number(d.value), 0);
      const fixedSum = discountItems
        .filter((d: any) => String(d?.type || '') === 'fixed_amount' && typeof d?.value === 'number')
        .reduce((acc: number, d: any) => acc + Number(d.value), 0);

      const clampedPercent = Math.max(0, Math.min(100, percentSum));
      const afterPercent = basePrice == null ? null : Math.round(basePrice * (1 - clampedPercent / 100));
      const finalPrice = afterPercent == null ? null : Math.max(0, afterPercent - fixedSum);
      const savings = basePrice != null && finalPrice != null ? basePrice - finalPrice : null;

      if (basePrice != null && finalPrice != null && savings != null && savings > 0) {
        return formatMoney(finalPrice);
      }
      return basePrice != null ? formatMoney(basePrice) : 'Precio no disponible';
    }

    return vehicle.price ? formatMoney(vehicle.price) : 'Precio no disponible';
  };

  const images: string[] = (() => {
    const fromUrls = Array.isArray(vehicle.image_urls) ? vehicle.image_urls.filter(Boolean) : [];
    const fromRows = Array.isArray(vehicle.images) ? vehicle.images.map((r) => r?.url).filter(Boolean) : [];
    return (fromUrls.length > 0 ? fromUrls : fromRows) as string[];
  })();

  const currentImage = images[currentImageIndex] || images[0] || '/hero-cars.jpg';

  // Etiqueta del tipo de listado
  const getListingTypeLabel = () => {
    switch (vehicle.listing_type) {
      case "sale": return "Venta";
      case "rent": return "Arriendo";
      case "auction": return "Subasta";
      default: return "Venta";
    }
  };

  const getListingTypeColor = () => {
    switch (vehicle.listing_type) {
      case "sale": return "bg-[var(--color-success-subtle-bg)] text-[var(--color-success)]";
      case "rent": return "bg-[var(--color-warn-subtle-bg)] text-[var(--color-warn)]";
      case "auction": return "bg-[var(--color-primary-a10)] text-[var(--color-primary)]";
      default: return "bg-[var(--color-success-subtle-bg)] text-[var(--color-success)]";
    }
  };

  // Extraer specs
  const extraSpecs = vehicle.specs || {};
  const bodyType = extraSpecs.body_type ?? extraSpecs.legacy?.body_type ?? null;
  const fuelType = vehicle.fuel_type ?? extraSpecs.fuel_type ?? extraSpecs.legacy?.fuel_legacy ?? null;
  const transmission = vehicle.transmission ?? extraSpecs.transmission ?? extraSpecs.legacy?.transmission_legacy ?? null;
  const traction = vehicle.traction ?? extraSpecs.traction ?? extraSpecs.legacy?.drivetrain ?? null;
  const condition = vehicle.condition ?? extraSpecs.condition ?? extraSpecs.legacy?.condition ?? null;
  const vehicleTypeLabel = vehicle.vehicle_types?.label ?? vehicle.vehicle_types?.name ?? null;

  const moreInfoTags = (() => {
    const fromTags = Array.isArray((vehicle as any).tags) ? ((vehicle as any).tags as unknown[]) : [];
    const fromExtra = Array.isArray((extraSpecs as any).more_info_tags) ? (((extraSpecs as any).more_info_tags as unknown[]) || []) : [];
    const fromMeta = Array.isArray((vehicle.metadata as any)?.more_info_tags)
      ? (((vehicle.metadata as any)?.more_info_tags as unknown[]) || [])
      : [];
    const fromMetaString = typeof (vehicle.metadata as any)?.more_info === 'string' ? String((vehicle.metadata as any).more_info) : '';
    const fromExtraString = typeof (extraSpecs as any)?.more_info === 'string' ? String((extraSpecs as any).more_info) : '';

    const combined = [
      ...fromTags,
      ...fromExtra,
      ...fromMeta,
      ...fromMetaString.split(/\n+/g),
      ...fromExtraString.split(/\n+/g),
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean);

    return Array.from(new Set(combined));
  })();

  const hasMoreInfo = moreInfoTags.length > 0;
  const hasVideo = Boolean(String(vehicle.video_url || '').trim());
  const hasDocs = (() => {
    const publicDocs = Array.isArray((vehicle as any).public_documents) ? ((vehicle as any).public_documents as any[]) : null;
    const urls = Array.isArray((vehicle as any).document_urls) ? ((vehicle as any).document_urls as string[]) : null;
    const legacyDocs = Array.isArray((extraSpecs as any).documentation) ? ((extraSpecs as any).documentation as string[]) : null;
    return Boolean((publicDocs && publicDocs.length > 0) || (urls && urls.length > 0) || (legacyDocs && legacyDocs.length > 0));
  })();

  const sectionOptions = [
    { value: 'informacion-general', label: 'Información General' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'especificaciones', label: 'Especificaciones' },
    { value: 'equipamiento', label: 'Equipamiento' },
    ...(hasMoreInfo ? [{ value: 'mas-informacion', label: 'Más información' }] : []),
    ...(hasVideo ? [{ value: 'video', label: 'Video' }] : []),
    ...(hasDocs ? [{ value: 'documentacion', label: 'Documentación' }] : []),
    { value: 'condiciones', label: 'Condiciones' },
  ];

  const typeKey = (vehicle.metadata as any)?.type_key ?? null;
  const specCategory = getSpecCategory(typeof typeKey === 'string' ? typeKey : null);
  const bodyTypeLabel = (() => {
    if (!bodyType) return null;
    const bodyField = specCategory?.fields?.find((f) => f.id === 'body_type');
    const opt = bodyField?.options?.find((o) => o.value === bodyType);
    return opt?.label ?? capitalize(String(bodyType));
  })();

  // Funciones de interacción
  const handleShare = (platform?: string) => {
    const url = window.location.href;
    const text = `${vehicle.title} - ${getDisplayPrice()}`;
    
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else {
      // Copiar al portapapeles
      navigator.clipboard.writeText(url);
      addToast('Enlace copiado al portapapeles', { type: 'success' });
    }
    setShowShareMenu(false);
  };

  const favorite = isFavorite(vehicle.id);
  const handleToggleFavorite = () => {
    void toggleFavorite(vehicle.id);
  };

  const isOwnListing = Boolean(user?.id && vehicle?.owner_id && vehicle.owner_id === user.id);
  const canSendDirectMessage = Boolean(supabase && user?.id && vehicle?.owner_id && !isOwnListing);
  const onSendDirectMessage = async (content: string) => {
    if (!supabase || !user?.id) {
      throw new Error('Debes iniciar sesión para enviar un mensaje.');
    }
    if (!vehicle?.owner_id) {
      throw new Error('No se pudo resolver el destinatario.');
    }
    if (vehicle.owner_id === user.id) {
      throw new Error('No puedes enviarte mensajes a ti mismo.');
    }

    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch {}
    const sanitized = DOMPurify ? DOMPurify.sanitize(content) : content;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: vehicle.owner_id,
      listing_id: vehicle.id,
      subject: vehicle.title,
      content: sanitized,
      is_read: false,
    });
    if (error) throw error;

    addToast('Mensaje enviado', { type: 'success' });
  };

  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      {/* Header con breadcrumbs y acciones */}
      <div className="card-surface/90 sticky top-0 z-40 backdrop-blur-sm shadow-card">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumbs y botón volver */}
            <div className="flex items-center gap-3">
              <Button
                variant="neutral"
                size="sm"
                shape="rounded"
                onClick={() => router.back()}
                className="gap-2"
              >
                <IconArrowLeft size={18} />
                Volver
              </Button>
              <div className="hidden md:flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                <span className="cursor-pointer hover:text-[var(--color-primary)]" onClick={() => router.push('/')}>Inicio</span>
                <span>/</span>
                <span className="cursor-pointer hover:text-[var(--color-primary)]" onClick={() => router.push('/ventas')}>
                  {getListingTypeLabel()}
                </span>
                <span>/</span>
                <span className="text-[var(--text-primary)]">{vehicle.brands?.name || 'Vehículo'}</span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-2">
              <CircleButton
                aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                variant={favorite ? 'primary' : 'default'}
                onClick={handleToggleFavorite}
                title="Guardar en favoritos"
              >
                {favorite ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
              </CircleButton>
              
              <div className="relative">
                <CircleButton
                  aria-label="Compartir"
                  variant="default"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Compartir"
                >
                  <IconShare size={20} />
                </CircleButton>
                
                {/* Menú de compartir */}
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 card-surface rounded-xl shadow-card p-2 min-w-[200px] z-50">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--field-bg-hover)] rounded-lg transition text-left"
                    >
                      <span className="w-6 text-[var(--text-tertiary)] inline-flex items-center justify-center"><IconBrandFacebook size={18} /></span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--field-bg-hover)] rounded-lg transition text-left"
                    >
                      <span className="w-6 text-[var(--text-tertiary)] inline-flex items-center justify-center"><IconBrandX size={18} /></span>
                      <span>X</span>
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--field-bg-hover)] rounded-lg transition text-left"
                    >
                      <span className="w-6 text-[var(--text-tertiary)] inline-flex items-center justify-center"><IconBrandWhatsapp size={18} /></span>
                      <span>WhatsApp</span>
                    </button>
                    <div className="border-t border-border/60 my-2"></div>
                    <button
                      onClick={() => handleShare()}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--field-bg-hover)] rounded-lg transition text-left"
                    >
                      <span className="w-6 text-[var(--text-tertiary)] inline-flex items-center justify-center"><IconLink size={18} /></span>
                      <span>Copiar enlace</span>
                    </button>
                  </div>
                )}
              </div>

              <CircleButton
                aria-label="Reportar"
                variant="default"
                className="hover:bg-[var(--color-danger-subtle-bg)] hover:text-[var(--color-danger)]"
                title="Reportar"
                onClick={openReport}
              >
                <IconFlag size={20} />
              </CircleButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Barra de navegación por secciones (full width, sin scroll horizontal) */}
        <nav aria-label="Secciones del vehículo" className="card-surface shadow-card rounded-2xl px-4 py-3 mb-6">
          {/* Mobile: dropdown */}
          <div className="md:hidden">
            <Select
              value={activeSection}
              onChange={(val) => {
                const next = String(val);
                setActiveSection(next);
                const el = document.getElementById(next);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                try {
                  window.history.replaceState(null, '', `#${next}`);
                } catch {
                  // ignore
                }
              }}
              options={sectionOptions}
              placeholder="Sección"
              appearance="filled"
              className="w-full"
            />
          </div>

          {/* Desktop: tabs */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <a
              className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                activeSection === 'informacion-general'
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
              } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
              href="#informacion-general"
              onClick={() => setActiveSection('informacion-general')}
              aria-current={activeSection === 'informacion-general' ? 'location' : undefined}
              data-section="informacion-general"
            >
              <IconInfoCircle size={18} />
              <span>Información General</span>
            </a>
            <a
              className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                activeSection === 'descripcion'
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
              } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
              href="#descripcion"
              onClick={() => setActiveSection('descripcion')}
              aria-current={activeSection === 'descripcion' ? 'location' : undefined}
              data-section="descripcion"
            >
              <IconNotes size={18} />
              <span>Descripción</span>
            </a>
            <a
              className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                activeSection === 'especificaciones'
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
              } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
              href="#especificaciones"
              onClick={() => setActiveSection('especificaciones')}
              aria-current={activeSection === 'especificaciones' ? 'location' : undefined}
              data-section="especificaciones"
            >
              <IconListDetails size={18} />
              <span>Especificaciones</span>
            </a>
            <a
              className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                activeSection === 'equipamiento'
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
              } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
              href="#equipamiento"
              onClick={() => setActiveSection('equipamiento')}
              aria-current={activeSection === 'equipamiento' ? 'location' : undefined}
              data-section="equipamiento"
            >
              <IconSettings size={18} />
              <span>Equipamiento</span>
            </a>
            {hasMoreInfo ? (
              <a
                className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap ${
                  activeSection === 'mas-informacion'
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
                } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
                href="#mas-informacion"
                onClick={() => setActiveSection('mas-informacion')}
                aria-current={activeSection === 'mas-informacion' ? 'location' : undefined}
                data-section="mas-informacion"
              >
                Más información
              </a>
            ) : null}
            {hasVideo ? (
              <a
                className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                  activeSection === 'video'
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
                } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
                href="#video"
                onClick={() => setActiveSection('video')}
                aria-current={activeSection === 'video' ? 'location' : undefined}
                data-section="video"
              >
                <IconPlayerPlay size={18} />
                <span>Video</span>
              </a>
            ) : null}
            {hasDocs ? (
              <a
                className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                  activeSection === 'documentacion'
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
                } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
                href="#documentacion"
                onClick={() => setActiveSection('documentacion')}
                aria-current={activeSection === 'documentacion' ? 'location' : undefined}
                data-section="documentacion"
              >
                <IconFileText size={18} />
                <span>Documentación</span>
              </a>
            ) : null}
            <a
              className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap inline-flex items-center gap-2 ${
                activeSection === 'condiciones'
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--field-bg-hover)] text-[var(--text-secondary)]'
              } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
              href="#condiciones"
              onClick={() => setActiveSection('condiciones')}
              aria-current={activeSection === 'condiciones' ? 'location' : undefined}
              data-section="condiciones"
            >
              <IconShieldCheck size={18} />
              <span>Condiciones</span>
            </a>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Imágenes y detalles */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Galería de imágenes mejorada */}
            <div className="card-surface rounded-3xl overflow-hidden shadow-card">
              <div className="md:flex md:gap-4 md:p-4">
                {/* Miniaturas en columna (desktop) */}
                {images.length > 1 && (
                  <div className="hidden md:block w-24">
                    <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                      {images.map((img, idx) => (
                              <button
                                type="button"
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative aspect-square w-full rounded-xl overflow-hidden border-3 transition-all ${
                            idx === currentImageIndex
                              ? "border-primary shadow-card"
                              : "border-transparent hover:border-border/60"
                                } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
                                title={`Imagen ${idx + 1}`}
                                aria-label={`Ver imagen ${idx + 1}`}
                        >
                          <img src={img} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Imagen principal */}
                <div className="relative aspect-[16/9] bg-[var(--surface-2)] group md:flex-1 md:rounded-2xl md:overflow-hidden">
                  <img
                    src={currentImage}
                    alt={vehicle.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Controles de navegación */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full card-surface shadow-card flex items-center justify-center hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Imagen anterior"
                      >
                        <IconChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full card-surface shadow-card flex items-center justify-center hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Imagen siguiente"
                      >
                        <IconChevronRight size={24} />
                      </button>
                    </>
                  )}
                  
                  {/* Contador de imágenes */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 right-4 px-4 py-2 bg-[var(--overlay-scrim-80)] text-[var(--color-on-primary)] text-sm rounded-full backdrop-blur-sm font-medium">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Badge de destacado */}
                  {vehicle.is_featured && (
                    <div className="absolute top-4 left-4 px-4 py-2 bg-[var(--color-warn)] text-[var(--color-on-primary)] text-sm font-bold rounded-full shadow-card flex items-center gap-2">
                      <span>⭐</span>
                      <span>Destacado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid de miniaturas (mobile) */}
              {images.length > 1 && (
                <div className="p-4 card-surface/80 md:hidden">
                  <div className="grid grid-cols-6 gap-2">
                    {images.slice(0, 6).map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-3 transition-all ${
                          idx === currentImageIndex
                            ? "border-primary scale-105 shadow-card"
                            : "border-transparent hover:border-border/60 hover:scale-105"
                        } focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark`}
                        aria-label={`Ver imagen ${idx + 1}`}
                      >
                        <img src={img} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 5 && images.length > 6 && (
                          <div className="absolute inset-0 bg-[var(--overlay-scrim-70)] flex items-center justify-center text-[var(--color-on-primary)] font-bold">
                            +{images.length - 6}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Información General (Tipo + Básico) */}
            <section id="informacion-general" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconInfoCircle size={24} />
                Información General
              </h2>
              {(() => {
                const rows: DetailRow[] = [];
                const usedIcons = new Set<IconCmp>();

                if (vehicle.brands?.name) {
                  const label = 'Marca';
                  rows.push({ label, value: vehicle.brands.name, iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (vehicle.models?.name) {
                  const label = 'Modelo';
                  rows.push({ label, value: vehicle.models.name, iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (vehicleTypeLabel) {
                  const label = 'Tipo';
                  rows.push({ label, value: vehicleTypeLabel, iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (bodyTypeLabel) {
                  const label = 'Carrocería';
                  rows.push({ label, value: bodyTypeLabel, iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (vehicle.year) {
                  const label = 'Año';
                  rows.push({ label, value: String(vehicle.year), iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (vehicle.mileage != null) {
                  const label = 'Kilometraje';
                  rows.push({ label, value: `${vehicle.mileage.toLocaleString('es-CL')} km`, iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (condition) {
                  const label = 'Condición';
                  rows.push({ label, value: capitalize(toSpanish(conditionMap, condition) || condition), iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }
                if (vehicle.color) {
                  const label = 'Color';
                  rows.push({ label, value: capitalize(vehicle.color), iconCmp: pickUniqueIcon(getGeneralInfoCandidates(label), usedIcons, GENERAL_FALLBACK_POOL) });
                }

                if (rows.length === 0) {
                  return <p className="text-[var(--text-tertiary)]">Sin información.</p>;
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    {rows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-4 py-3 border-b border-border/60"
                      >
                        <span className="text-sm text-[var(--text-tertiary)] inline-flex items-center gap-2">
                          {row.iconCmp ? <span className="inline-flex">{rowIcon(row.iconCmp)}</span> : null}
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--text-primary)] text-right">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            {/* Descripción */}
            <section id="descripcion" className="card-surface shadow-card rounded-3xl p-6 md:p-8 scroll-mt-24">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconNotes size={24} />
                Descripción
              </h2>
              {vehicle.description ? (
                <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {vehicle.description}
                </p>
              ) : (
                <p className="text-[var(--text-tertiary)]">Sin descripción.</p>
              )}
            </section>

            {/* Especificaciones (Paso 3) */}
            <section id="especificaciones" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconListDetails size={24} />
                Especificaciones
              </h2>
              {(() => {
                const fields = (specCategory?.fields || []).filter((f) => f.id !== 'body_type');

                const rows: DetailRow[] = [];
                const usedIcons = new Set<IconCmp>();
                for (const field of fields) {
                  const raw = (extraSpecs as any)?.[field.id];
                  if (raw == null) continue;
                  if (typeof raw === 'string' && raw.trim().length === 0) continue;

                  if (field.type === 'select') {
                    const opt = field.options?.find((o) => o.value === raw);
                    rows.push({
                      label: field.label,
                      value: String(opt?.label ?? raw),
                      iconCmp: pickUniqueIcon(getSpecCandidates(field.id, field.label), usedIcons, SPECS_FALLBACK_POOL),
                    });
                    continue;
                  }

                  if (field.type === 'boolean') {
                    rows.push({
                      label: field.label,
                      value: raw ? 'Sí' : 'No',
                      iconCmp: pickUniqueIcon(getSpecCandidates(field.id, field.label), usedIcons, SPECS_FALLBACK_POOL),
                    });
                    continue;
                  }

                  if (field.type === 'number') {
                    const n = typeof raw === 'number' ? raw : Number(raw);
                    if (!Number.isFinite(n)) continue;
                    const suffix = field.unit ? ` ${field.unit}` : '';
                    rows.push({
                      label: field.label,
                      value: `${n.toLocaleString('es-CL')}${suffix}`,
                      iconCmp: pickUniqueIcon(getSpecCandidates(field.id, field.label), usedIcons, SPECS_FALLBACK_POOL),
                    });
                    continue;
                  }

                  rows.push({
                    label: field.label,
                    value: String(raw),
                    iconCmp: pickUniqueIcon(getSpecCandidates(field.id, field.label), usedIcons, SPECS_FALLBACK_POOL),
                  });
                }

                // Algunas implementaciones antiguas guardan parte del Paso 3 en columnas top-level.
                if (!rows.some((r) => r.label === 'Combustible') && fuelType) {
                  const label = 'Combustible';
                  rows.push({
                    label,
                    value: capitalize(toSpanish(fuelTypeMap, fuelType) || fuelType),
                    iconCmp: pickUniqueIcon(getSpecCandidates('fuel_type', label), usedIcons, SPECS_FALLBACK_POOL),
                  });
                }
                if (!rows.some((r) => r.label === 'Transmisión') && transmission) {
                  const label = 'Transmisión';
                  rows.push({
                    label,
                    value: capitalize(toSpanish(transmissionMap, transmission) || transmission),
                    iconCmp: pickUniqueIcon(getSpecCandidates('transmission', label), usedIcons, SPECS_FALLBACK_POOL),
                  });
                }
                if (!rows.some((r) => r.label === 'Tracción') && traction) {
                  const label = 'Tracción';
                  rows.push({
                    label,
                    value: capitalize(String(traction)),
                    iconCmp: pickUniqueIcon(getSpecCandidates('traction', label), usedIcons, SPECS_FALLBACK_POOL),
                  });
                }

                if (rows.length === 0) {
                  return <p className="text-[var(--text-tertiary)]">Sin especificaciones.</p>;
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    {rows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-4 py-3 border-b border-border/60"
                      >
                        <span className="text-sm text-[var(--text-tertiary)] inline-flex items-center gap-2">
                          {row.iconCmp ? <span className="inline-flex">{rowIcon(row.iconCmp)}</span> : null}
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--text-primary)] text-right">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            {/* Equipamiento */}
            {(() => {
              const equipmentItems = Array.isArray(extraSpecs.equipment_items) ? extraSpecs.equipment_items : null;
              const equipmentLabels = Array.isArray(extraSpecs.equipment) ? extraSpecs.equipment : null;

              if (equipmentItems && equipmentItems.length > 0 && typeof equipmentItems[0] === 'object') {
                const groups = new Map<string, any[]>();
                for (const it of equipmentItems) {
                  const label = (it as any)?.label;
                  if (!label) continue;
                  const category = String((it as any)?.category || 'General');
                  const arr = groups.get(category);
                  if (arr) arr.push(it);
                  else groups.set(category, [it]);
                }
                const orderedGroups = Array.from(groups.entries());

                if (orderedGroups.length === 0) return null;

                return (
                  <section id="equipamiento" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <IconSettings size={24} />
                      Equipamiento
                    </h2>
                    <div className="space-y-6">
                      {orderedGroups.map(([category, items]) => (
                        <div key={category}>
                          <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">{category}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {items.map((it: any, idx: number) => (
                              <div
                                key={(it.code || it.label || 'item') + String(idx)}
                                className="inline-flex items-center justify-center rounded-full border border-border/60 bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                                title={it.label}
                              >
                                <span className="truncate">{it.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (equipmentLabels && equipmentLabels.length > 0) {
                return (
                  <section id="equipamiento" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <IconSettings size={24} />
                      Equipamiento
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {equipmentLabels.map((item: string, idx: number) => (
                        <div
                          key={idx}
                          className="inline-flex items-center justify-center rounded-full border border-border/60 bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                          title={item}
                        >
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              return null;
            })()}

            {/* Más información */}
            {hasMoreInfo ? (
              <section id="mas-informacion" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconShieldCheck size={24} />
                  Más información
                </h2>
                <div className="space-y-3">
                  {moreInfoTags.map((tag: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[var(--surface-2)] rounded-xl">
                      <IconInfoCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{tag}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Video */}
            {vehicle.video_url ? (
              <section id="video" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <IconPlayerPlay size={24} />
                    Video
                  </h2>
                  <a
                    href={String(vehicle.video_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark"
                    aria-label="Abrir video en nueva pestaña"
                    title="Abrir en nueva pestaña"
                  >
                    <IconExternalLink size={18} />
                  </a>
                </div>
                {(() => {
                  const url = String(vehicle.video_url || '').trim();
                  if (!url) return null;

                  const lower = url.toLowerCase();
                  const isDirectVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
                  if (isDirectVideo) {
                    return (
                      <div className="space-y-3">
                        <video controls className="w-full rounded-2xl overflow-hidden bg-[var(--surface-2)]">
                          <source src={url} />
                        </video>
                      </div>
                    );
                  }

                  const buildEmbedUrl = (input: string): string | null => {
                    try {
                      const u = new URL(input);
                      const host = u.hostname.replace(/^www\./, '');

                      // YouTube
                      if (host === 'youtube.com' || host === 'm.youtube.com') {
                        const vidFromQuery = u.searchParams.get('v');
                        if (vidFromQuery) return `https://www.youtube.com/embed/${vidFromQuery}`;

                        const parts = u.pathname.split('/').filter(Boolean);
                        // /embed/{id}
                        if (parts[0] === 'embed' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
                        // /shorts/{id}
                        if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
                        return null;
                      }
                      if (host === 'youtu.be') {
                        const vid = u.pathname.split('/').filter(Boolean)[0];
                        if (!vid) return null;
                        return `https://www.youtube.com/embed/${vid}`;
                      }

                      // Vimeo
                      if (host === 'vimeo.com') {
                        const parts = u.pathname.split('/').filter(Boolean);
                        const vid = parts.find((p) => /^\d+$/.test(p));
                        if (!vid) return null;

                        // Videos no listados suelen traer un token `h` (query) o como segmento siguiente.
                        const hFromQuery = u.searchParams.get('h');
                        const idx = parts.indexOf(vid);
                        const hFromPath = idx >= 0 && parts[idx + 1] && /^[a-z0-9]+$/i.test(parts[idx + 1]) ? parts[idx + 1] : null;
                        const h = hFromQuery || hFromPath;

                        return `https://player.vimeo.com/video/${vid}${h ? `?h=${encodeURIComponent(h)}` : ''}`;
                      }

                      if (host === 'player.vimeo.com') {
                        const parts = u.pathname.split('/').filter(Boolean);
                        const vidIdx = parts.indexOf('video');
                        const vid = vidIdx >= 0 ? parts[vidIdx + 1] : parts.find((p) => /^\d+$/.test(p));
                        if (!vid) return null;

                        const h = u.searchParams.get('h');
                        return `https://player.vimeo.com/video/${vid}${h ? `?h=${encodeURIComponent(h)}` : ''}`;
                      }

                      return null;
                    } catch {
                      return null;
                    }
                  };

                  const embedUrl = buildEmbedUrl(url);

                  // Si no podemos construir un embed seguro, evitamos iframe (muchos sitios lo bloquean).
                  if (!embedUrl) {
                    return (
                      <div className="p-4 bg-[var(--surface-2)] rounded-2xl">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Este video está disponible como enlace externo.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[var(--surface-2)]">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={embedUrl}
                          title="Video del vehículo"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  );
                })()}
              </section>
            ) : null}

            {/* Documentación */}
            {(() => {
              const publicDocs =
                (vehicle as any).public_documents && Array.isArray((vehicle as any).public_documents)
                  ? ((vehicle as any).public_documents as any[])
                  : null;
              const urls = Array.isArray((vehicle as any).document_urls) ? ((vehicle as any).document_urls as string[]) : null;
              const legacyDocs = extraSpecs.documentation && Array.isArray(extraSpecs.documentation) ? (extraSpecs.documentation as string[]) : null;

              const mode: 'public' | 'urls' | 'legacy' | null =
                publicDocs && publicDocs.length > 0
                  ? 'public'
                  : urls && urls.length > 0
                  ? 'urls'
                  : legacyDocs && legacyDocs.length > 0
                  ? 'legacy'
                  : null;

              if (!mode) return null;

              return (
                <section id="documentacion" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <IconFileText size={24} />
                    Documentación
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mode === 'public'
                      ? publicDocs!.map((doc: any) => (
                          (() => {
                            const docId = String(doc?.id || '').trim();
                            if (!docId) return null;
                            const openUrl = `/api/documents/open?id=${encodeURIComponent(docId)}`;
                            return (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-2xl border border-border/60 hover:bg-[var(--field-bg-hover)] transition"
                          >
                            <IconFileText size={20} className="text-primary flex-shrink-0" />
                            <a
                              href={openUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium hover:underline truncate min-w-0"
                              title={String(doc?.name || '')}
                            >
                              {doc.name}
                            </a>
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                              {(() => {
                                const type = String(doc?.file_type || '').toLowerCase();
                                const name = String(doc?.name || '').toLowerCase();
                                const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
                                const isImage = type.startsWith('image/');
                                const label = isPdf ? 'PDF' : isImage ? 'Imagen' : null;
                                if (!label) return null;
                                return (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {label}
                                  </span>
                                );
                              })()}
                              <a
                                href={openUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark"
                                aria-label="Abrir documento en nueva pestaña"
                                title="Abrir en nueva pestaña"
                              >
                                <IconExternalLink size={18} />
                              </a>
                            </div>
                          </div>
                            );
                          })()
                        ))
                      : mode === 'urls'
                      ? urls!.map((url, idx) => (
                          (() => {
                            const raw = String(url || '').trim();
                            if (!raw) return null;
                            const openUrl = `/api/documents/open?path=${encodeURIComponent(raw)}`;
                            return (
                          <div
                            key={url + String(idx)}
                            className="flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-2xl border border-border/60 hover:bg-[var(--field-bg-hover)] transition"
                          >
                            <IconFileText size={20} className="text-primary flex-shrink-0" />
                            <a href={openUrl} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline truncate min-w-0">
                              Documento {idx + 1}
                            </a>
                            <a
                              href={openUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:shadow-focus dark:focus-visible:shadow-focus-dark"
                              aria-label="Abrir documento en nueva pestaña"
                              title="Abrir en nueva pestaña"
                            >
                              <IconExternalLink size={18} />
                            </a>
                          </div>
                            );
                          })()
                        ))
                      : legacyDocs!.map((doc, idx) => (
                          <div
                            key={String(doc) + String(idx)}
                            className="flex items-center gap-3 p-3 bg-[var(--color-success-subtle-bg)] rounded-xl border border-[var(--color-success-subtle-border)]"
                          >
                            <IconCheck size={20} className="text-[var(--color-success)] flex-shrink-0" />
                            <span className="text-sm font-medium">{doc}</span>
                          </div>
                        ))}
                  </div>
                </section>
              );
            })()}

            {/* Condiciones Comerciales */}
            {(() => {
              // Los flags/notas vienen del wizard (metadata.commercial_conditions). Fallback a specs solo para compat.
              const commercialFlags = ((vehicle.metadata as any)?.commercial_conditions?.flags ?? (extraSpecs as any)?.commercial_conditions?.flags ?? (extraSpecs as any)?.legacy?.commercial_conditions?.flags ?? null) as string[] | null;
              const commercialNotes = ((vehicle.metadata as any)?.commercial_conditions?.notas ?? (extraSpecs as any)?.commercial_conditions?.notas ?? (extraSpecs as any)?.legacy?.commercial_conditions?.notas ?? null) as string | null;

              const advanced =
                ((vehicle.metadata as any)?.advanced_conditions ??
                  (extraSpecs as any)?.advanced_conditions ??
                  (extraSpecs as any)?.legacy?.advanced_conditions ??
                  null) as any;

              const tradeIn =
                ((vehicle.metadata as any)?.trade_in ??
                  (extraSpecs as any)?.trade_in ??
                  (extraSpecs as any)?.legacy?.trade_in ??
                  null) as any;

              const hasFinancingDetails = Array.isArray(advanced?.financing) && advanced.financing.length > 0;
              const hasWarrantyOffer = !!advanced?.warranty_offer;
              const hasAdditional = typeof advanced?.additional_conditions === 'string' && advanced.additional_conditions.trim().length > 0;
              const hasTradeInDetails = !!tradeIn && (tradeIn.accepts || tradeIn.balance);

              const hasAdvanced = hasFinancingDetails || hasWarrantyOffer || hasAdditional;
              const shouldShow =
                vehicle.allow_financing ||
                vehicle.allow_exchange ||
                (commercialFlags && commercialFlags.length > 0) ||
                commercialNotes ||
                hasAdvanced ||
                hasTradeInDetails;
              if (!shouldShow) return null;

              return (
              <section id="condiciones" className="card-surface shadow-card rounded-3xl p-6 scroll-mt-24">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconShieldCheck size={24} />
                  Condiciones
                </h2>
                <div className="space-y-3">
                  {/* Etiquetas primero */}
                  {(() => {
                    const isRent = vehicle.listing_type === 'rent';
                    const labels: Record<string, string> = {
                      precio_negociable: isRent ? 'Precio de arriendo negociable' : 'Precio negociable',
                      garantia_vendedor: 'Garantía del vendedor',
                      garantia_extendida: 'Garantía extendida',
                      entrega_inmediata: 'Entrega inmediata',
                      entrega_domicilio: 'Entrega a domicilio',
                      pago_tarjeta: 'Acepta pago con tarjeta',
                      pago_transferencia: 'Acepta transferencia',
                      financiamiento_directo: 'Financiamiento directo',
                    };

                    const flags: Array<{ code: string; label: string }> = (commercialFlags as string[] | null)
                      ? (commercialFlags as string[])
                          .filter((flag: string) => {
                            const forbidden = new Set(['acepta_permuta', 'financiamiento_disponible']);
                            return typeof flag === 'string' && flag.trim().length > 0 && !forbidden.has(flag);
                          })
                          .map((flag: string) => ({ code: flag, label: labels[flag] ?? flag }))
                      : [];

                    const hasAny = flags.length > 0;
                    if (!hasAny) return null;

                    return (
                      <div className="flex flex-wrap gap-2">
                        {flags.map((f, idx) => (
                          <span
                            key={`${f.code}-${idx}`}
                            className="text-xs px-3 py-2 rounded-md border text-left flex items-center gap-2 bg-[var(--color-primary-a10)] text-primary border-[var(--color-primary-a20)]"
                          >
                            <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                            {f.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Detalles de financiamiento */}
                  {vehicle.allow_financing ? (
                    <div className="p-4 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Financiamiento</p>
                      {hasFinancingDetails ? (
                        <div className="space-y-3">
                          {advanced.financing.map((opt: any, idx: number) => {
                            const bank = String(opt?.bank || '').trim() || 'Entidad'
                            const rate = typeof opt?.rate === 'number' ? opt.rate : null;
                            const term = typeof opt?.term_months === 'number' ? opt.term_months : null;
                            const down = typeof opt?.down_payment_percent === 'number' ? opt.down_payment_percent : null;

                            const metaParts: string[] = [];
                            if (rate != null) metaParts.push(`Tasa: ${rate.toLocaleString('es-CL')}%`);
                            if (term != null) metaParts.push(`Plazo: ${term.toLocaleString('es-CL')} meses`);
                            if (down != null) metaParts.push(`Pie: ${down.toLocaleString('es-CL')}%`);

                            return (
                              <div key={`${bank}-${idx}`} className="p-3 rounded-xl bg-[var(--surface-1)] border border-border/60">
                                <p className="text-sm font-semibold">{bank}</p>
                                {metaParts.length > 0 ? (
                                  <p className="text-sm text-[var(--text-secondary)]">{metaParts.join(' · ')}</p>
                                ) : (
                                  <p className="text-sm text-[var(--text-secondary)]">Consulta condiciones con el vendedor.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)]">Consulta condiciones de financiamiento con el vendedor.</p>
                      )}
                    </div>
                  ) : null}

                  {/* Detalles de permuta */}
                  {vehicle.allow_exchange ? (
                    <div className="p-4 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Permuta</p>
                      {(() => {
                        const accepts = String(tradeIn?.accepts || '').trim();
                        const balance = String(tradeIn?.balance || '').trim();
                        const acceptsLabel: Record<string, string> = {
                          car_suv_pickup: 'Autos / SUVs / Pickups',
                          motorcycle: 'Motos',
                          commercial_vehicle: 'Vehículo comercial',
                          depends: 'Depende de la oferta',
                        };
                        const balanceLabel: Record<string, string> = {
                          to_seller: 'Saldo a favor del vendedor',
                          to_buyer: 'Saldo a favor del comprador',
                          negotiable: 'Saldo negociable',
                        };

                        const lines: string[] = [];
                        if (accepts) lines.push(`Acepta: ${acceptsLabel[accepts] ?? accepts}`);
                        if (balance) lines.push(`Saldo: ${balanceLabel[balance] ?? balance}`);

                        if (lines.length === 0) {
                          return <p className="text-sm text-[var(--text-secondary)]">Consulta condiciones de permuta con el vendedor.</p>;
                        }
                        return <p className="text-sm text-[var(--text-secondary)]">{lines.join(' · ')}</p>;
                      })()}
                    </div>
                  ) : null}

                  {advanced?.warranty_offer ? (
                    <div className="p-4 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Garantía</p>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {advanced.warranty_offer.kind === 'extended' ? 'Garantía extendida' : 'Garantía del vendedor'}
                        </p>
                        {advanced.warranty_offer.duration_months ? (
                          <p className="text-sm text-[var(--text-secondary)]">Duración: {advanced.warranty_offer.duration_months} meses</p>
                        ) : null}
                        {advanced.warranty_offer.provider ? (
                          <p className="text-sm text-[var(--text-secondary)]">Proveedor: {advanced.warranty_offer.provider}</p>
                        ) : null}
                        {advanced.warranty_offer.details ? (
                          <p className="text-sm text-[var(--text-secondary)]">{advanced.warranty_offer.details}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {hasAdditional ? (
                    <div className="p-4 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Condiciones adicionales</p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{String(advanced.additional_conditions)}</p>
                    </div>
                  ) : null}

                  {commercialNotes && (
                    <div className="p-4 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Notas</p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{commercialNotes}</p>
                    </div>
                  )}
                </div>
              </section>
              );
            })()}
          </div>

          {/* Columna derecha: Vendedor y contacto */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-8 space-y-6">
              {/* Ficha principal (título + meta + precio + CTA) */}
              <div className="card-surface shadow-card rounded-3xl p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getListingTypeColor()}`}>
                    {getListingTypeLabel()}
                  </span>
                  {vehicle.is_featured && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--color-warn-subtle-bg)] text-[var(--color-warn)]">
                      Destacado
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-tight">
                  {vehicle.title}
                </h1>

                {(vehicle.communes?.name || vehicle.regions?.name) && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <IconMapPin size={16} className="text-primary" />
                    <span className="truncate">
                      {vehicle.communes?.name}
                      {vehicle.communes?.name && vehicle.regions?.name && ", "}
                      {vehicle.regions?.name}
                    </span>
                  </div>
                )}

                <div className="mt-5 h-px bg-border/60" />

                <div className="mt-5">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Precio</p>
                  {(() => {
                    const isSale = vehicle.listing_type === 'sale';
                    const isRent = vehicle.listing_type === 'rent';
                    const isAuction = vehicle.listing_type === 'auction';
                    const rentPeriod = (vehicle as any).rent_price_period || (vehicle.metadata as any)?.rent_price_period || null;
                    const rentDaily = typeof (vehicle as any).rent_daily_price === 'number' ? (vehicle as any).rent_daily_price : null;
                    const rentWeekly = typeof (vehicle as any).rent_weekly_price === 'number' ? (vehicle as any).rent_weekly_price : null;
                    const rentMonthly = typeof (vehicle as any).rent_monthly_price === 'number' ? (vehicle as any).rent_monthly_price : null;
                    const rentBase = (() => {
                      if (!isRent) return null;
                      if (rentPeriod === 'daily' && rentDaily != null) return { amount: rentDaily, suffix: 'día' };
                      if (rentPeriod === 'weekly' && rentWeekly != null) return { amount: rentWeekly, suffix: 'semana' };
                      if (rentPeriod === 'monthly' && rentMonthly != null) return { amount: rentMonthly, suffix: 'mes' };
                      if (rentDaily != null) return { amount: rentDaily, suffix: 'día' };
                      if (rentWeekly != null) return { amount: rentWeekly, suffix: 'semana' };
                      if (rentMonthly != null) return { amount: rentMonthly, suffix: 'mes' };
                      return null;
                    })();
                    const basePrice =
                      isSale && typeof vehicle.price === 'number'
                        ? vehicle.price
                        : isAuction
                          ? (typeof vehicle.auction_start_price === 'number' ? vehicle.auction_start_price : (typeof vehicle.price === 'number' ? vehicle.price : null))
                          : (rentBase ? rentBase.amount : null);
                    const advanced = ((vehicle.metadata as any)?.advanced_conditions ?? null) as any;

                    const discountItems = advanced?.discounts && Array.isArray(advanced.discounts) ? (advanced.discounts as any[]) : [];
                    const bonusItems = advanced?.bonuses && Array.isArray(advanced.bonuses) ? (advanced.bonuses as any[]) : [];

                    const percentSum = discountItems
                      .filter((d: any) => String(d?.type || '') === 'percentage' && typeof d?.value === 'number')
                      .reduce((acc: number, d: any) => acc + Number(d.value), 0);
                    const fixedSum = discountItems
                      .filter((d: any) => String(d?.type || '') === 'fixed_amount' && typeof d?.value === 'number')
                      .reduce((acc: number, d: any) => acc + Number(d.value), 0);
                    const clampedPercent = Math.max(0, Math.min(100, percentSum));

                    const afterPercent = basePrice == null ? null : Math.round(basePrice * (1 - clampedPercent / 100));
                    const discountedPrice = afterPercent == null ? null : Math.max(0, afterPercent - fixedSum);
                    const savings = basePrice != null && discountedPrice != null ? basePrice - discountedPrice : null;
                    const showDiscount = (isSale || isRent || isAuction) && basePrice != null && savings != null && savings > 0;

                    const bonusSum = bonusItems
                      .filter((b: any) => typeof b?.value === 'number')
                      .reduce((acc: number, b: any) => acc + Number(b.value), 0);

                    const mainAmount = showDiscount ? discountedPrice : basePrice;
                    const mainSuffix =
                      isRent && rentBase
                        ? `/${rentBase.suffix}`
                        : isAuction
                          ? ' (Precio base)'
                          : '';

                    const baseAmount = basePrice;
                    const baseSuffix =
                      isRent && rentBase
                        ? `/${rentBase.suffix}`
                        : isAuction
                          ? ' (Precio base)'
                          : '';

                    return (
                      <>
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <p className="text-3xl font-bold text-primary">
                            {typeof mainAmount === 'number' ? (
                              <>
                                <span>{formatMoney(mainAmount)}</span>
                                {mainSuffix ? (
                                  <span className="ml-2 text-sm font-semibold text-[var(--text-secondary)]">{mainSuffix}</span>
                                ) : null}
                              </>
                            ) : (
                              getDisplayPrice()
                            )}
                          </p>
                        </div>

                        {showDiscount ? (
                          <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-[var(--text-secondary)]">
                            <span className="line-through">
                              {baseAmount != null ? (
                                <>
                                  <span>{formatMoney(baseAmount)}</span>
                                  {baseSuffix ? <span className="ml-1">{baseSuffix}</span> : null}
                                </>
                              ) : null}
                            </span>
                            <span>Ahorras {formatMoney(savings!)}</span>
                          </div>
                        ) : null}

                        {(showDiscount || bonusSum > 0) ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {showDiscount && clampedPercent > 0 ? (
                              <span className="text-xs px-3 py-2 rounded-md border bg-[var(--color-primary-a10)] text-primary border-[var(--color-primary-a20)]">
                                -{clampedPercent.toLocaleString('es-CL')}%
                              </span>
                            ) : null}
                            {showDiscount && fixedSum > 0 ? (
                              <span className="text-xs px-3 py-2 rounded-md border bg-[var(--color-primary-a10)] text-primary border-[var(--color-primary-a20)]">
                                -{formatMoney(fixedSum)}
                              </span>
                            ) : null}
                            {bonusSum > 0 ? (
                              <span className="text-xs px-3 py-2 rounded-md border bg-[var(--color-primary-a10)] text-primary border-[var(--color-primary-a20)]">
                                Bono {formatMoney(bonusSum)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="mt-5 space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    shape="rounded"
                    className="w-full"
                    onClick={() => setContactModalOpen(true)}
                  >
                    Contactar vendedor
                  </Button>
                </div>

              </div>

              {/* Vendedor */}
              {(canShowPublicSellerCard || vehicle.listing_type === "rent" || vehicle.listing_type === "auction") ? (
                <div className="card-surface shadow-card rounded-3xl p-6">
                {canShowPublicSellerCard ? (
                  <>
                    <div className="text-center mb-6">
                      {/* Avatar clickeable */}
                      <div 
                        className="mx-auto mb-3 flex justify-center cursor-pointer group"
                        onClick={() => sellerSlug && router.push(`/perfil/${sellerSlug}`)}
                      >
                        <div className="relative">
                          <UserAvatar
                            src={
                              vehicle.public_profile?.avatar_url
                                ? (vehicle.public_profile.avatar_url.startsWith('http')
                                  ? vehicle.public_profile.avatar_url
                                  : getAvatarUrl(supabase as any, vehicle.public_profile.avatar_url))
                                : undefined
                            }
                            alt={vehicle.profiles?.public_name || vehicle.public_profile?.public_name || 'Vendedor'}
                            size={96}
                            className="transition-transform group-hover:scale-105"
                          />
                          {vehicle.profiles?.plan === 'premium' && (
                            <span className="absolute -top-1 -right-1 text-2xl" title="Usuario Premium">⭐</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Nombre y username clickeables */}
                      <div 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => sellerSlug && router.push(`/perfil/${sellerSlug}`)}
                      >
                        <h3 className="text-lg font-bold">{vehicle.public_profile?.public_name || vehicle.profiles?.public_name}</h3>
                        <p className="text-sm text-primary">@{sellerSlug}</p>
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="md"
                          shape="rounded"
                          className="w-full"
                          onClick={() => router.push(`/perfil/${sellerSlug}`)}
                        >
                          Ver perfil público
                        </Button>
                      </div>
                      
                      {/* Descripción del vendedor */}
                      {vehicle.profiles?.description && (
                        <p className="text-sm text-[var(--text-secondary)] mt-3 line-clamp-3">
                          {vehicle.profiles.description}
                        </p>
                      )}
                      
                      {/* Información adicional */}
                      <div className="mt-4 space-y-2 text-sm">
                        {vehicle.profiles?.address && (
                          <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)]">
                            <IconMapPin size={16} />
                            <span className="truncate">{vehicle.profiles.address}</span>
                          </div>
                        )}
                        {vehicle.profiles?.website && (
                          <a 
                            href={vehicle.profiles.website.startsWith('http') ? vehicle.profiles.website : `https://${vehicle.profiles.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconShare size={16} />
                            <span className="truncate">Visitar sitio web</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

              {/* Información adicional de arriendo */}
              {vehicle.listing_type === "rent" ? (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <h4 className="font-bold mb-3">Información de arriendo</h4>
                  <div className="space-y-2 text-sm">
                    {vehicle.rent_security_deposit && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Garantía:</span>
                        <span className="font-semibold">${vehicle.rent_security_deposit.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {vehicle.rent_min_days && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Mínimo:</span>
                        <span className="font-semibold">{vehicle.rent_min_days} días</span>
                      </div>
                    )}
                    {vehicle.rent_max_days && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Máximo:</span>
                        <span className="font-semibold">{vehicle.rent_max_days} días</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Información adicional de subasta */}
              {vehicle.listing_type === "auction" && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <h4 className="font-bold mb-3">Información de subasta</h4>
                  <div className="space-y-2 text-sm">
                    {vehicle.auction_current_bid && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Oferta actual:</span>
                        <span className="font-semibold text-primary">${vehicle.auction_current_bid.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {vehicle.auction_bid_count != null && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Ofertas:</span>
                        <span className="font-semibold">{vehicle.auction_bid_count}</span>
                      </div>
                    )}
                    {vehicle.auction_end_at && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Termina:</span>
                        <span className="font-semibold">{new Date(vehicle.auction_end_at).toLocaleDateString("es-CL")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {modalMounted && createPortal(
        <Modal
          open={reportModalOpen}
          onClose={closeReport}
          maxWidth="max-w-md"
          title="Reportar publicación"
          footer={
            <div className="flex gap-3">
              <Button
                variant="neutral"
                size="md"
                shape="rounded"
                className="flex-1"
                onClick={closeReport}
                disabled={reportSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="md"
                shape="rounded"
                className="flex-1"
                onClick={submitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="block text-sm text-[var(--text-secondary)]">Motivo</span>
              <Select
                options={reportReasonOptions}
                value={reportReason}
                onChange={(v) => setReportReason(String(v))}
              />
            </div>
            <div className="space-y-1">
              <span className="block text-sm text-[var(--text-secondary)]">Detalle</span>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe el motivo del reporte..."
                rows={4}
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              Este reporte se envía al equipo de moderación.
            </p>
          </div>
        </Modal>,
        document.body
      )}

      {/* Modal de contacto */}
      {(vehicle.contact_email || vehicle.contact_phone || vehicle.contact_whatsapp || vehicle.profiles || vehicle.public_profile) && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={vehicle.public_profile?.public_name || vehicle.profiles?.public_name || ''}
          contextTitle={vehicle.title}
          email={vehicle.contact_email || undefined}
          phone={vehicle.contact_phone || undefined}
          whatsapp={vehicle.contact_whatsapp || undefined}
          contextType="vehicle"
          onSendMessage={onSendDirectMessage}
          canSendMessage={canSendDirectMessage}
          messageDisabledHint={!user?.id ? 'Inicia sesión para enviar un mensaje.' : isOwnListing ? 'Estás viendo tu propia publicación.' : undefined}
        />
      )}
    </div>
  );
}





