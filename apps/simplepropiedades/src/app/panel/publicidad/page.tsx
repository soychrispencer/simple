'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconCopy,
  IconLayoutBoard,
  IconPencil,
  IconPlayerPause,
  IconPhoto,
  IconPlayerPlay,
  IconRectangle,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import BoostManager from '@/components/panel/boost-manager';
import { ModernSelect } from '@simple/ui';
import { fetchMyPanelListings } from '@/lib/panel-listings';
import {
  AD_UPDATE_EVENT,
  MAX_ACTIVE_HERO_CAMPAIGNS,
  MAX_CAMPAIGNS_TOTAL,
  createAdCampaign,
  deleteAdCampaign,
  emitCampaignsUpdated,
  fetchMyAdCampaigns,
  getCampaignCounters,
  getCampaignDestinationHref,
  isValidHttpUrl,
  normalizeCampaigns,
  updateAdCampaignContent,
  updateAdCampaignLifecycle,
  type AdCampaign,
  type AdDestinationType,
  type AdFormat,
  type AdOverlayAlign,
  type AdPlacementSection,
} from '@/lib/advertising';
import { confirmCheckout, startAdvertisingCheckout } from '@/lib/payments';
import { PanelActions, PanelBlockHeader, PanelButton, PanelCard, PanelChoiceCard, PanelNotice, PanelPillNav, PanelSegmentedToggle, PanelStatusBadge, PanelStepNav, PanelSummaryCard, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui';

type Duration = 7 | 15 | 30;
type Step = 0 | 1 | 2;
type Device = 'desktop' | 'mobile';
type Asset = { dataUrl: string; width: number; height: number; name: string };
type ListingOption = { label: string; href: string };

type FormatConfig = {
  id: AdFormat;
  label: string;
  description: string;
  desktop: [number, number];
  mobile: [number, number];
  price: Record<Duration, number>;
};

const FORMATS: FormatConfig[] = [
  {
    id: 'hero',
    label: 'Hero principal',
    description: 'Portada superior del home.',
    desktop: [1920, 600],
    mobile: [1080, 1500],
    price: { 7: 29990, 15: 49990, 30: 79990 },
  },
  {
    id: 'card',
    label: 'Card destacada',
    description: 'Card patrocinada en destacados.',
    desktop: [1200, 900],
    mobile: [900, 1200],
    price: { 7: 9990, 15: 14990, 30: 24990 },
  },
  {
    id: 'inline',
    label: 'Banner inline',
    description: 'Banner entre resultados.',
    desktop: [1440, 180],
    mobile: [1080, 270],
    price: { 7: 4990, 15: 9990, 30: 14990 },
  },
];

const DESTINATIONS: Array<{ id: AdDestinationType; label: string; hint: string; badge?: string }> = [
  {
    id: 'none',
    label: 'Sin link',
    hint: 'Solo exposición de marca. No redirige al hacer clic.',
  },
  {
    id: 'custom_url',
    label: 'Link personalizado',
    hint: 'Envía a tu sitio, landing o campaña externa.',
    badge: 'Recomendado',
  },
  {
    id: 'listing',
    label: 'Publicación interna',
    hint: 'Abre una publicación dentro de SimplePropiedades.',
  },
  {
    id: 'profile',
    label: 'Perfil público',
    hint: 'Dirige al mini-sitio del anunciante.',
  },
];

const INLINE_SECTION_OPTIONS: Array<{ id: AdPlacementSection; label: string }> = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'arriendos', label: 'Arriendos' },
  { id: 'proyectos', label: 'Proyectos' },
];

function toIsoDateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleDateString('es-CL');
}

function statusLabel(status: AdCampaign['status']) {
  if (status === 'active') return 'Activa';
  if (status === 'scheduled') return 'Programada';
  if (status === 'paused') return 'Pausada';
  return 'Finalizada';
}

function campaignStatusTone(status: AdCampaign['status']): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'active') return 'success';
  if (status === 'scheduled') return 'info';
  if (status === 'paused') return 'warning';
  return 'neutral';
}

function paymentStatusLabel(status: AdCampaign['paymentStatus']) {
  if (status === 'paid') return 'Pagada';
  if (status === 'failed') return 'Pago rechazado';
  if (status === 'cancelled') return 'Pago cancelado';
  return 'Pago pendiente';
}

function paymentStatusTone(status: AdCampaign['paymentStatus']): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'paid') return 'success';
  if (status === 'failed') return 'warning';
  if (status === 'cancelled') return 'neutral';
  return 'info';
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('error'));
    reader.readAsDataURL(file);
  });
}

async function readSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error('error'));
    image.src = dataUrl;
  });
}

function toDuration(value: number): Duration {
  if (value === 15) return 15;
  if (value === 30) return 30;
  return 7;
}

function toDateInputValue(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return toIsoDateToday();
  const withOffset = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return withOffset.toISOString().slice(0, 10);
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Math.ceil((payload.length * 3) / 4);
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('error'));
    image.src = dataUrl;
  });
}

function renderImageToDataUrl(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function optimizeImageForStorage(params: {
  sourceDataUrl: string;
  maxWidth: number;
  maxHeight: number;
  targetBytes: number;
}): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = await loadImage(params.sourceDataUrl);
  let width = image.width;
  let height = image.height;

  const initialScale = Math.min(1, params.maxWidth / width, params.maxHeight / height);
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));

  let quality = 0.84;
  let currentDataUrl = renderImageToDataUrl(image, width, height, quality);
  if (!currentDataUrl) return { dataUrl: params.sourceDataUrl, width: image.width, height: image.height };

  while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && quality > 0.56) {
    quality -= 0.07;
    currentDataUrl = renderImageToDataUrl(image, width, height, quality);
    if (!currentDataUrl) break;
  }

  while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && width > 480 && height > 240) {
    width = Math.max(320, Math.round(width * 0.9));
    height = Math.max(180, Math.round(height * 0.9));
    currentDataUrl = renderImageToDataUrl(image, width, height, quality);
    if (!currentDataUrl) break;
  }

  if (!currentDataUrl) return { dataUrl: params.sourceDataUrl, width: image.width, height: image.height };
  return { dataUrl: currentDataUrl, width, height };
}

export default function PublicidadPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [listingOptions, setListingOptions] = useState<ListingOption[]>([]);
  const [step, setStep] = useState<Step>(0);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [format, setFormat] = useState<AdFormat>('hero');
  const [duration, setDuration] = useState<Duration>(7);
  const [campaignName, setCampaignName] = useState('Campaña portada');
  const [startDate, setStartDate] = useState(toIsoDateToday());
  const [destinationType, setDestinationType] = useState<AdDestinationType>('none');
  const [customUrl, setCustomUrl] = useState('');
  const [listingHref, setListingHref] = useState('');
  const [profileSlug, setProfileSlug] = useState('');
  const [inlinePlacementSection, setInlinePlacementSection] = useState<AdPlacementSection>('ventas');
  const [desktopAsset, setDesktopAsset] = useState<Asset | null>(null);
  const [mobileAsset, setMobileAsset] = useState<Asset | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayAlign, setOverlayAlign] = useState<AdOverlayAlign>('left');
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlaySubtitle, setOverlaySubtitle] = useState('');
  const [overlayCta, setOverlayCta] = useState('');
  const [previewDevice, setPreviewDevice] = useState<Device>('desktop');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);

  const selected = useMemo(() => FORMATS.find((item) => item.id === format) ?? FORMATS[0], [format]);
  const editingCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === editingCampaignId) ?? null,
    [campaigns, editingCampaignId]
  );
  const isEditing = editingCampaignId !== null;
  const lockCommercialFields = isEditing;
  const selectedDestination = useMemo(
    () => DESTINATIONS.find((option) => option.id === destinationType) ?? DESTINATIONS[0],
    [destinationType]
  );
  const counters = useMemo(() => getCampaignCounters(campaigns), [campaigns]);
  const activeTab = searchParams.get('tab') === 'boost' ? 'boost' : 'campaigns';

  const setActiveTab = (tab: 'campaigns' | 'boost') => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const loadCampaigns = async () => {
    const result = await fetchMyAdCampaigns();
    if (result.unauthorized) {
      setCampaigns([]);
      setError(result.error ?? 'Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }

    setCampaigns(normalizeCampaigns(result.items));
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    void (async () => {
      const result = await fetchMyPanelListings();
      const options = result.items
        .filter((item) => item.href)
        .map((item) => ({
          label: item.title,
          href: item.href,
        }));
      setListingOptions(options);
      setListingHref((current) => current || options[0]?.href || '');
    })();
  }, []);

  useEffect(() => {
    const sync = () => void loadCampaigns();
    window.addEventListener(AD_UPDATE_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener(AD_UPDATE_EVENT, sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const purchaseId = searchParams.get('purchaseId');
    if (!purchaseId || handledPurchaseId === purchaseId) return;

    setHandledPurchaseId(purchaseId);
    setError('');

    void (async () => {
      const result = await confirmCheckout({
        orderId: purchaseId,
        paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id'),
      });

      if (!result.ok) {
        setError(result.error ?? 'No pudimos validar el pago de la campaña.');
        return;
      }

      if (result.status === 'approved' || result.status === 'authorized') {
        await loadCampaigns();
        emitCampaignsUpdated();
        setMessage('Campaña activada correctamente con Mercado Pago.');
        return;
      }

      if (result.status === 'pending') {
        await loadCampaigns();
        setMessage('Tu pago quedó pendiente de confirmación en Mercado Pago.');
        return;
      }

      await loadCampaigns();
      setError('El pago de la campaña no fue aprobado.');
    })();
  }, [handledPurchaseId, searchParams]);

  const resetBuilder = () => {
    setStep(0);
    setEditingCampaignId(null);
    setFormat('hero');
    setDuration(7);
    setCampaignName('Campaña portada');
    setStartDate(toIsoDateToday());
    setDestinationType('none');
    setCustomUrl('');
    setListingHref(listingOptions[0]?.href ?? '');
    setProfileSlug('');
    setInlinePlacementSection('ventas');
    setDesktopAsset(null);
    setMobileAsset(null);
    setOverlayEnabled(false);
    setOverlayAlign('left');
    setOverlayTitle('');
    setOverlaySubtitle('');
    setOverlayCta('');
  };

  const fillFormFromCampaign = (campaign: AdCampaign, mode: 'edit' | 'duplicate') => {
    const config = FORMATS.find((item) => item.id === campaign.format) ?? FORMATS[0];
    const startDateValue = mode === 'edit' ? toDateInputValue(campaign.startAt) : toIsoDateToday();

    setStep(0);
    setFormat(campaign.format);
    setDuration(toDuration(campaign.durationDays));
    setCampaignName(mode === 'duplicate' ? `${campaign.name} (copia)` : campaign.name);
    setStartDate(startDateValue);
    setDestinationType(campaign.destinationType);
    setCustomUrl(campaign.destinationUrl ?? '');
    setListingHref(campaign.listingHref ?? listingOptions[0]?.href ?? '');
    setProfileSlug(campaign.profileSlug ?? '');
    setInlinePlacementSection(campaign.placementSection ?? 'ventas');
    setDesktopAsset({
      dataUrl: campaign.desktopImageDataUrl,
      width: config.desktop[0],
      height: config.desktop[1],
      name: mode === 'duplicate' ? 'desktop-copia.jpg' : 'desktop-actual.jpg',
    });
    setMobileAsset(
      campaign.mobileImageDataUrl
        ? {
            dataUrl: campaign.mobileImageDataUrl,
            width: config.mobile[0],
            height: config.mobile[1],
            name: mode === 'duplicate' ? 'mobile-copia.jpg' : 'mobile-actual.jpg',
          }
        : null
    );
    setOverlayEnabled(campaign.overlayEnabled);
    setOverlayAlign(campaign.overlayAlign);
    setOverlayTitle(campaign.overlayTitle ?? '');
    setOverlaySubtitle(campaign.overlaySubtitle ?? '');
    setOverlayCta(campaign.overlayCta ?? '');
  };

  const validateStep = (target: Step): string | null => {
    if (target === 0) {
      if (format === 'inline' && !inlinePlacementSection) {
        return 'Selecciona la sección objetivo para el banner inline.';
      }
      if (destinationType === 'custom_url') {
        if (!customUrl.trim()) return 'Ingresa un link o cambia a Sin link.';
        if (!isValidHttpUrl(customUrl.trim())) return 'El link personalizado no es válido.';
      }
      if (destinationType === 'listing' && !listingHref.trim()) return 'No tienes publicaciones disponibles para usar como destino.';
      if (destinationType === 'profile' && !profileSlug.trim()) return 'Ingresa el slug del perfil.';
    }
    if (target === 1 && !desktopAsset) return 'Debes subir una imagen desktop.';
    return null;
  };

  const nextStep = () => {
    const issue = validateStep(step);
    if (issue) return setError(issue);
    setError('');
    setMessage('');
    setStep((value) => Math.min(2, value + 1) as Step);
  };

  const prevStep = () => {
    setError('');
    setMessage('');
    setStep((value) => Math.max(0, value - 1) as Step);
  };

  const onUpload = async (device: Device, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setError('');
      if (!file.type.startsWith('image/')) return setError('Solo imágenes (JPG, PNG o WebP).');
      if (file.size > 8 * 1024 * 1024) return setError('La imagen supera el límite de 8MB.');
      const rawDataUrl = await fileToDataUrl(file);
      const size = await readSize(rawDataUrl);
      const expected = device === 'desktop' ? selected.desktop : selected.mobile;
      if (size.width < expected[0] * 0.6 || size.height < expected[1] * 0.6) {
        return setError(`Resolución baja para ${device}. Recomendado: ${expected[0]}x${expected[1]}.`);
      }

      const targetBytes =
        device === 'desktop'
          ? format === 'hero'
            ? 220_000
            : 180_000
          : 160_000;

      const optimized = await optimizeImageForStorage({
        sourceDataUrl: rawDataUrl,
        maxWidth: expected[0],
        maxHeight: expected[1],
        targetBytes,
      });

      const payload: Asset = {
        dataUrl: optimized.dataUrl,
        width: optimized.width,
        height: optimized.height,
        name: file.name,
      };
      if (device === 'desktop') setDesktopAsset(payload);
      else setMobileAsset(payload);
    } catch {
      setError('No se pudo procesar la imagen.');
    }
  };

  const createCampaign = async () => {
    const step0Issue = validateStep(0);
    if (step0Issue) return setError(step0Issue);
    const step1Issue = validateStep(1);
    if (step1Issue) return setError(step1Issue);

    const base = normalizeCampaigns(campaigns);
    if (isEditing && editingCampaign) {
      if (editingCampaign.status === 'ended') {
        return setError('La campaña finalizada no se puede editar. Duplícala para reutilizarla.');
      }

      const result = await updateAdCampaignContent(editingCampaign.id, {
        name: campaignName.trim() || editingCampaign.name,
        destinationType,
        destinationUrl: destinationType === 'custom_url' ? customUrl.trim() : null,
        listingHref: destinationType === 'listing' ? listingHref : null,
        profileSlug: destinationType === 'profile' ? profileSlug.trim() : null,
        desktopImageDataUrl: desktopAsset?.dataUrl ?? editingCampaign.desktopImageDataUrl,
        mobileImageDataUrl: mobileAsset?.dataUrl ?? editingCampaign.mobileImageDataUrl ?? null,
        overlayEnabled,
        overlayTitle: overlayEnabled && overlayTitle.trim() ? overlayTitle.trim() : null,
        overlaySubtitle: overlayEnabled && overlaySubtitle.trim() ? overlaySubtitle.trim() : null,
        overlayCta: overlayEnabled && overlayCta.trim() ? overlayCta.trim() : null,
        overlayAlign,
      });
      if (!result.ok) {
        return setError(result.error ?? 'No pudimos guardar la campaña.');
      }

      await loadCampaigns();
      emitCampaignsUpdated();
      setMessage('Cambios guardados. Se mantuvieron fecha, duración y slot original.');
      setError('');
      setEditingCampaignId(null);
    } else {
      if (base.filter((item) => item.status !== 'ended').length >= MAX_CAMPAIGNS_TOTAL) {
        return setError(`Máximo ${MAX_CAMPAIGNS_TOTAL} campañas vigentes.`);
      }

      const start = new Date(`${startDate}T09:00:00`);
      const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
      const startsActive = safeStart.getTime() <= Date.now();

      const activeHeroes = base.filter(
        (item) => item.paymentStatus === 'paid' && item.format === 'hero' && item.status === 'active'
      ).length;
      if (format === 'hero' && startsActive && activeHeroes >= MAX_ACTIVE_HERO_CAMPAIGNS) {
        return setError(`Solo ${MAX_ACTIVE_HERO_CAMPAIGNS} hero activas al mismo tiempo.`);
      }

      const created = await createAdCampaign({
        name: campaignName.trim() || `Campaña ${new Date().toLocaleDateString('es-CL')}`,
        format,
        destinationType,
        destinationUrl: destinationType === 'custom_url' ? customUrl.trim() : null,
        listingHref: destinationType === 'listing' ? listingHref : null,
        profileSlug: destinationType === 'profile' ? profileSlug.trim() : null,
        desktopImageDataUrl: desktopAsset!.dataUrl,
        mobileImageDataUrl: mobileAsset?.dataUrl ?? null,
        overlayEnabled,
        overlayTitle: overlayEnabled && overlayTitle.trim() ? overlayTitle.trim() : null,
        overlaySubtitle: overlayEnabled && overlaySubtitle.trim() ? overlaySubtitle.trim() : null,
        overlayCta: overlayEnabled && overlayCta.trim() ? overlayCta.trim() : null,
        overlayAlign,
        placementSection: format === 'inline' ? inlinePlacementSection : null,
        startAt: safeStart.toISOString(),
        durationDays: duration,
      });
      if (!created.ok || !created.item) {
        return setError(created.error ?? 'No pudimos guardar la campaña.');
      }

      await loadCampaigns();
      emitCampaignsUpdated();

      const checkout = await startAdvertisingCheckout({
        returnUrl: `${window.location.origin}/panel/publicidad?tab=campaigns`,
        campaignId: created.item.id,
      });
      if (!checkout.ok || !checkout.checkoutUrl) {
        setError(checkout.error ?? 'No pudimos iniciar el pago de la campaña.');
        setMessage('La campaña quedó guardada. Puedes reintentar el pago desde la lista.');
        return;
      }

      window.location.assign(checkout.checkoutUrl);
      return;
    }

    resetBuilder();
  };

  const startCampaignCheckout = async (campaignId: string) => {
    setError('');
    setMessage('');
    const checkout = await startAdvertisingCheckout({
      returnUrl: `${window.location.origin}/panel/publicidad?tab=campaigns`,
      campaignId,
    });
    if (!checkout.ok || !checkout.checkoutUrl) {
      setError(checkout.error ?? 'No pudimos iniciar el pago de la campaña.');
      return;
    }
    window.location.assign(checkout.checkoutUrl);
  };

  const beginEditCampaign = (id: string) => {
    const target = campaigns.find((item) => item.id === id);
    if (!target) return;
    if (target.status === 'ended') {
      setError('La campaña finalizada no se puede editar. Duplícala para reutilizarla.');
      return;
    }

    setEditingCampaignId(target.id);
    fillFormFromCampaign(target, 'edit');
    setError('');
    setMessage('Editando campaña: fecha, duración y formato quedan bloqueados.');
  };

  const duplicateCampaign = (id: string) => {
    const target = campaigns.find((item) => item.id === id);
    if (!target) return;

    setEditingCampaignId(null);
    fillFormFromCampaign(target, 'duplicate');
    setError('');
    setMessage('Campaña duplicada. Ajusta lo necesario y actívala como nueva.');
  };

  const cancelEditing = () => {
    if (!isEditing) return;
    resetBuilder();
    setError('');
    setMessage('Edición cancelada.');
  };

  const togglePause = (id: string) => {
    const target = campaigns.find((item) => item.id === id);
    if (!target) return;

    const now = Date.now();
    if (target.status === 'paused' && target.format === 'hero') {
      const shouldBeActive = new Date(target.startAt).getTime() <= now && new Date(target.endAt).getTime() > now;
      if (shouldBeActive) {
        const activeHeroes = campaigns.filter(
          (item) => item.id !== id && item.paymentStatus === 'paid' && item.format === 'hero' && item.status === 'active'
        ).length;
        if (activeHeroes >= MAX_ACTIVE_HERO_CAMPAIGNS) {
          return setError(`No puedes reactivar: ya hay ${MAX_ACTIVE_HERO_CAMPAIGNS} hero activas.`);
        }
      }
    }

    void (async () => {
      const result = await updateAdCampaignLifecycle(
        id,
        target.status === 'paused' && new Date(target.startAt).getTime() <= now && new Date(target.endAt).getTime() > now
          ? 'active'
          : target.status === 'paused'
            ? 'scheduled'
            : 'paused'
      );
      if (!result.ok) {
        setError(result.error ?? 'No pudimos actualizar la campaña.');
        return;
      }
      await loadCampaigns();
      emitCampaignsUpdated();
      setMessage('Estado actualizado.');
      setError('');
    })();
  };

  const removeCampaign = (id: string) => {
    void (async () => {
      const result = await deleteAdCampaign(id);
      if (!result.ok) {
        setError(result.error ?? 'No pudimos eliminar la campaña.');
        return;
      }
      await loadCampaigns();
      emitCampaignsUpdated();
      setMessage('Campaña eliminada.');
      setError('');
    })();
  };

  const previewImage =
    previewDevice === 'desktop'
      ? desktopAsset?.dataUrl ?? mobileAsset?.dataUrl
      : mobileAsset?.dataUrl ?? desktopAsset?.dataUrl;

  const previewSpec = previewDevice === 'desktop' ? selected.desktop : selected.mobile;
  const showOverlay = overlayEnabled && (overlayTitle || overlaySubtitle || overlayCta);
  const alignClass = overlayAlign === 'center' ? 'items-center text-center' : overlayAlign === 'right' ? 'items-end text-right' : 'items-start text-left';

  return (
    <div className="container-app panel-page max-w-6xl py-4 lg:py-8">
      <PanelSectionHeader
        title="Publicidad"
        description="Gestiona campañas promocionales y boosts de publicaciones desde una sola sección."
      />

      <div className="mb-6">
        <PanelPillNav
          items={[
            { key: 'campaigns', label: 'Campañas' },
            { key: 'boost', label: 'Boost de avisos' },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'campaigns' | 'boost')}
          breakpoint="md"
          size="sm"
          mobileLabel="Sección publicitaria"
          ariaLabel="Secciones de publicidad"
        />
      </div>

      {activeTab === 'boost' ? (
        <BoostManager />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="type-caption" style={{ color: 'var(--fg-muted)' }}>Vigentes</p><p className="text-xl font-semibold">{counters.totalNotEnded}/{MAX_CAMPAIGNS_TOTAL}</p></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="type-caption" style={{ color: 'var(--fg-muted)' }}>Hero activas</p><p className="text-xl font-semibold">{counters.activeHero}/{MAX_ACTIVE_HERO_CAMPAIGNS}</p></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="type-caption" style={{ color: 'var(--fg-muted)' }}>Programadas</p><p className="text-xl font-semibold">{counters.scheduled}</p></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="type-caption" style={{ color: 'var(--fg-muted)' }}>Costo referencial</p><p className="text-xl font-semibold">${selected.price[duration].toLocaleString('es-CL')}</p></div>
          </div>

          {error ? <PanelNotice tone="error" className="mb-3">{error}</PanelNotice> : null}
          {message ? <PanelNotice tone="success" className="mb-3">{message}</PanelNotice> : null}
          {isEditing && editingCampaign ? (
            <div className="mb-4 rounded-lg border px-3 py-2 flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                Editando: <span className="font-medium" style={{ color: 'var(--fg)' }}>{editingCampaign.name}</span>
              </p>
              <PanelButton onClick={cancelEditing} variant="secondary" size="sm">
                <IconX size={14} /> Cancelar
              </PanelButton>
            </div>
          ) : null}

          <div className="mb-6">
            <PanelStepNav
              items={['Formato', 'Creatividad', 'Activar'].map((label, index) => ({
                key: String(index),
                label,
                done: step > index,
                disabled: index > step,
              }))}
              activeKey={String(step)}
              onChange={(key) => setStep(Number(key) as Step)}
              ariaLabel="Pasos de publicidad"
              labelBreakpoint="always"
            />
          </div>

          <PanelCard className="mb-8" size="md">
        {step === 0 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FORMATS.map((item) => (
                <PanelChoiceCard key={item.id} onClick={() => { if (!lockCommercialFields) setFormat(item.id); }} disabled={lockCommercialFields} selected={format === item.id}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>{item.id === 'hero' ? <IconLayoutBoard size={18} /> : item.id === 'card' ? <IconPhoto size={18} /> : <IconRectangle size={18} />}</div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="type-caption mt-1" style={{ color: 'var(--fg-muted)' }}>{item.description}</p>
                  <p className="type-caption mt-2" style={{ color: 'var(--fg-secondary)' }}>Desktop {item.desktop[0]}x{item.desktop[1]} · Móvil {item.mobile[0]}x{item.mobile[1]}</p>
                </PanelChoiceCard>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div><label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>Nombre campaña</label><input className="form-input" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></div>
              <div><label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>Duración</label><div className="grid grid-cols-3 gap-2">{([7, 15, 30] as Duration[]).map((days) => <button key={days} onClick={() => { if (!lockCommercialFields) setDuration(days); }} disabled={lockCommercialFields} className="rounded-lg border py-2 text-sm disabled:cursor-not-allowed" style={{ borderColor: duration === days ? 'var(--fg)' : 'var(--border)', background: duration === days ? 'var(--bg-subtle)' : 'var(--surface)', opacity: lockCommercialFields && duration !== days ? 0.6 : 1 }}>{days} días</button>)}</div></div>
            </div>

            {lockCommercialFields ? (
              <p className="type-caption -mt-1" style={{ color: 'var(--fg-muted)' }}>
                Fecha, duración, formato y sección quedan bloqueados durante la edición.
              </p>
            ) : null}

            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium">Destino (opcional)</p>
              <p className="type-caption mt-1 mb-3" style={{ color: 'var(--fg-muted)' }}>
                Define qué ocurre cuando alguien hace clic en tu publicidad.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DESTINATIONS.map((option) => {
                  const active = destinationType === option.id;
                  return (
                    <PanelChoiceCard
                      key={option.id}
                      onClick={() => setDestinationType(option.id)}
                      selected={active}
                      className="rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 w-4 h-4 rounded-full border inline-flex items-center justify-center"
                          style={{ borderColor: active ? 'var(--fg)' : 'var(--border-strong)' }}
                          aria-hidden
                        >
                          {active ? (
                            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--fg)' }} />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="text-sm font-medium block" style={{ color: 'var(--fg)' }}>
                            {option.label}
                          </span>
                          <span className="type-caption block mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            {option.hint}
                          </span>
                        </span>
                      </div>
                      {option.badge ? (
                        <span className="inline-flex mt-2 rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                          {option.badge}
                        </span>
                      ) : null}
                    </PanelChoiceCard>
                  );
                })}
              </div>

              <div className="mt-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <p className="type-caption" style={{ color: 'var(--fg-muted)' }}>Seleccionado</p>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{selectedDestination.label}</p>
                <p className="type-caption" style={{ color: 'var(--fg-secondary)' }}>{selectedDestination.hint}</p>
              </div>

              {destinationType === 'custom_url' ? (
                <div className="mt-3">
                  <label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>
                    URL destino
                  </label>
                  <input
                    className="form-input"
                    placeholder="https://tumarca.cl/campana"
                    value={customUrl}
                    onChange={(event) => setCustomUrl(event.target.value)}
                  />
                </div>
              ) : null}

              {destinationType === 'listing' ? (
                <div className="mt-3">
                  <label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>
                    Elige la publicación
                  </label>
                  <ModernSelect
                    value={listingHref}
                    onChange={setListingHref}
                    options={listingOptions.map((item) => ({ value: item.href, label: item.label }))}
                    ariaLabel="Seleccionar publicación"
                    placeholder={listingOptions.length > 0 ? 'Seleccionar publicación' : 'Sin publicaciones disponibles'}
                  />
                </div>
              ) : null}

              {destinationType === 'profile' ? (
                <div className="mt-3">
                  <label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>
                    Slug del perfil
                  </label>
                  <input
                    className="form-input"
                    placeholder="broker-demo"
                    value={profileSlug}
                    onChange={(event) => setProfileSlug(event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {format === 'inline' ? (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                  Sección objetivo del inline
                </p>
                <p className="type-caption mt-1 mb-3" style={{ color: 'var(--fg-muted)' }}>
                  El banner inline solo se mostrará en la sección seleccionada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {INLINE_SECTION_OPTIONS.map((sectionOption) => {
                    const active = inlinePlacementSection === sectionOption.id;
                    return (
                      <button
                        key={sectionOption.id}
                        onClick={() => { if (!lockCommercialFields) setInlinePlacementSection(sectionOption.id); }}
                        disabled={lockCommercialFields}
                        className="rounded-lg border p-2 text-sm disabled:cursor-not-allowed"
                        style={{
                          borderColor: active ? 'var(--fg)' : 'var(--border)',
                          background: active ? 'var(--bg-subtle)' : 'var(--surface)',
                          color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                          opacity: lockCommercialFields && !active ? 0.6 : 1,
                        }}
                      >
                        {sectionOption.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-medium mb-2">Imagen desktop ({selected.desktop[0]}x{selected.desktop[1]})</p><input type="file" accept="image/*" onChange={(event) => void onUpload('desktop', event)} className="form-input h-auto py-2" />{desktopAsset ? <p className="type-caption mt-2" style={{ color: 'var(--fg-muted)' }}>{desktopAsset.name} · {desktopAsset.width}x{desktopAsset.height}</p> : null}</div>
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-medium mb-2">Imagen móvil opcional ({selected.mobile[0]}x{selected.mobile[1]})</p><input type="file" accept="image/*" onChange={(event) => void onUpload('mobile', event)} className="form-input h-auto py-2" />{mobileAsset ? <p className="type-caption mt-2" style={{ color: 'var(--fg-muted)' }}>{mobileAsset.name} · {mobileAsset.width}x{mobileAsset.height}</p> : null}</div>
            </div>

            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <p className="text-sm font-medium">Overlay opcional</p>
                <PanelSegmentedToggle
                  size="sm"
                  items={[
                    { key: 'off', label: 'Desactivado' },
                    { key: 'on', label: 'Activado' },
                  ]}
                  activeKey={overlayEnabled ? 'on' : 'off'}
                  onChange={(key) => setOverlayEnabled(key === 'on')}
                />
              </div>
              {overlayEnabled ? (
                <div className="space-y-2">
                  <PanelSegmentedToggle
                    className="w-full flex-wrap"
                    size="md"
                    items={[
                      { key: 'left', label: 'Izquierda' },
                      { key: 'center', label: 'Centro' },
                      { key: 'right', label: 'Derecha' },
                    ]}
                    activeKey={overlayAlign}
                    onChange={(key) => setOverlayAlign(key as AdOverlayAlign)}
                  />
                  <input className="form-input" placeholder="Título opcional" value={overlayTitle} onChange={(event) => setOverlayTitle(event.target.value)} />
                  <input className="form-input" placeholder="Subtítulo opcional" value={overlaySubtitle} onChange={(event) => setOverlaySubtitle(event.target.value)} />
                  <input className="form-input" placeholder="Texto botón opcional" value={overlayCta} onChange={(event) => setOverlayCta(event.target.value)} />
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <p className="text-sm font-medium">Preview visual</p>
                <PanelSegmentedToggle
                  size="sm"
                  items={[
                    { key: 'desktop', label: 'Desktop' },
                    { key: 'mobile', label: 'Móvil' },
                  ]}
                  activeKey={previewDevice}
                  onChange={(key) => setPreviewDevice(key as Device)}
                />
              </div>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', aspectRatio: `${previewSpec[0]} / ${previewSpec[1]}`, background: previewImage ? `linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.2)), url(${previewImage}) center / cover no-repeat` : 'var(--bg-muted)' }}>
                <div className={`h-full w-full p-4 md:p-6 flex flex-col justify-end ${alignClass}`}>
                  {showOverlay ? <div className="max-w-xl">{overlayTitle ? <h3 className="text-xl md:text-2xl font-semibold text-white">{overlayTitle}</h3> : null}{overlaySubtitle ? <p className="text-sm text-white/85 mt-1">{overlaySubtitle}</p> : null}{overlayCta ? <span className="inline-flex mt-3 rounded-md border border-white/50 px-3 py-1 text-xs text-white">{overlayCta}</span> : null}</div> : <span className="text-xs text-white/70">Preview sin texto overlay.</span>}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><label className="type-caption font-medium mb-1 block" style={{ color: 'var(--fg-secondary)' }}>Fecha inicio</label><div className="flex items-center gap-2"><IconCalendar size={14} style={{ color: 'var(--fg-muted)' }} /><input type="date" className="form-input max-w-[220px] disabled:cursor-not-allowed" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={lockCommercialFields} /></div></div>
            <PanelSummaryCard
              eyebrow="Resumen"
              title={campaignName || 'Campaña sin nombre'}
              rows={[
                { label: 'Formato', value: selected.label },
                { label: 'Duración', value: `${duration} días` },
                { label: 'Destino', value: destinationType === 'none' ? 'Sin link' : destinationType === 'custom_url' ? customUrl : destinationType === 'listing' ? 'Publicación interna' : `Perfil /${profileSlug}` },
                { label: 'Overlay', value: overlayEnabled ? 'Activo (opcional)' : 'No usado' },
                { label: 'Costo referencial', value: `$${selected.price[duration].toLocaleString('es-CL')}`, valueClassName: 'font-semibold' },
              ]}
            >
              <PanelButton onClick={createCampaign} variant="primary" className="w-full">
                {isEditing ? 'Guardar cambios' : 'Pagar con Mercado Pago'} <IconArrowRight size={14} />
              </PanelButton>
              <Link href="/" className={getPanelButtonClassName({ className: 'mt-2 w-full' })} style={getPanelButtonStyle('secondary')}>Ver portada en inicio</Link>
            </PanelSummaryCard>
          </div>
        ) : null}

        <PanelActions
          className="mt-6"
          left={<PanelButton onClick={prevStep} variant="secondary" className={step === 0 ? 'invisible' : ''}>Atrás</PanelButton>}
          right={step < 2 ? <PanelButton onClick={nextStep} variant="primary">Siguiente <IconArrowRight size={14} /></PanelButton> : null}
        />
          </PanelCard>

          <PanelCard size="md">
            <PanelBlockHeader title="Campañas creadas" description="Pausa, reanuda o elimina campañas desde aquí." />

        {campaigns.length === 0 ? (
          <PanelNotice tone="neutral">Aún no tienes campañas cargadas.</PanelNotice>
        ) : (
          <div className="space-y-3">
            {[...campaigns]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((campaign) => {
                const href = getCampaignDestinationHref(campaign);
                const isExternal = href.startsWith('http://') || href.startsWith('https://');
                return (
                  <div key={campaign.id} className="rounded-xl border p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{campaign.name}</p>
                        <PanelStatusBadge label={statusLabel(campaign.status)} tone={campaignStatusTone(campaign.status)} />
                        {campaign.paymentStatus !== 'paid' ? (
                          <PanelStatusBadge label={paymentStatusLabel(campaign.paymentStatus)} tone={paymentStatusTone(campaign.paymentStatus)} />
                        ) : null}
                      </div>
                      <p className="type-caption mt-1" style={{ color: 'var(--fg-secondary)' }}>
                        {campaign.format.toUpperCase()} · {campaign.durationDays} días · {formatDate(campaign.startAt)} - {formatDate(campaign.endAt)}
                      </p>
                      {campaign.paymentStatus !== 'paid' ? (
                        <p className="type-caption mt-1" style={{ color: 'var(--fg-muted)' }}>
                          Esta campaña aún no queda visible públicamente hasta confirmar el pago.
                        </p>
                      ) : null}
                      <p className="type-caption mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Destino: {campaign.destinationType === 'none' ? 'Sin link' : campaign.destinationType === 'listing' ? campaign.listingHref : campaign.destinationType === 'profile' ? `/perfil/${campaign.profileSlug ?? ''}` : campaign.destinationUrl}
                      </p>
                      {href !== '#' ? (
                        <Link href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} className="inline-flex mt-2 text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
                          Abrir destino
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {campaign.paymentStatus !== 'paid' && campaign.status !== 'ended' ? (
                        <PanelButton onClick={() => void startCampaignCheckout(campaign.id)} variant="primary" size="sm">
                          <IconCheck size={14} /> Pagar
                        </PanelButton>
                      ) : null}
                      {campaign.status !== 'ended' ? (
                        <PanelButton onClick={() => beginEditCampaign(campaign.id)} variant="secondary" size="sm">
                          <IconPencil size={14} /> Editar
                        </PanelButton>
                      ) : null}
                      <PanelButton onClick={() => duplicateCampaign(campaign.id)} variant="secondary" size="sm">
                        <IconCopy size={14} /> Duplicar
                      </PanelButton>
                      {campaign.status !== 'ended' ? (
                        <PanelButton onClick={() => togglePause(campaign.id)} variant="secondary" size="sm">
                          {campaign.status === 'paused' ? <><IconPlayerPlay size={14} /> Reanudar</> : <><IconPlayerPause size={14} /> Pausar</>}
                        </PanelButton>
                      ) : null}
                      <PanelButton onClick={() => removeCampaign(campaign.id)} variant="danger" size="sm">
                        <IconTrash size={14} /> Eliminar
                      </PanelButton>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
          </PanelCard>
        </>
      )}
    </div>
  );
}
