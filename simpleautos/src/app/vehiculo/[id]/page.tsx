"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVehicleById, VehicleDetail } from "@/lib/getVehicleById";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { 
  IconArrowLeft, IconMapPin, IconCalendar, IconGauge, IconPalette, 
  IconEngine, IconManualGearbox, IconHeart, IconShare, IconFlag,
  IconCar, IconSettings, IconShieldCheck, IconFileText, IconClock,
  IconCheck, IconX, IconInfoCircle, IconChevronLeft, IconChevronRight
} from "@tabler/icons-react";
import ContactModal from "@/components/ui/modal/ContactModal";
import { toSpanish, fuelTypeMap, transmissionMap, conditionMap } from "@/lib/vehicleTranslations";
import { capitalize } from "@/lib/format";

export default function VehiculoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getVehicleById(id);
        if (!data) {
          setError("Vehículo no encontrado");
        } else {
          setVehicle(data);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al cargar el vehículo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando vehículo...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error || "Vehículo no encontrado"}</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  const images = vehicle.image_urls || [];
  const currentImage = images[currentImageIndex] || "/hero-cars.jpg";

  // Determinar el precio a mostrar según el tipo de listado
  const getDisplayPrice = () => {
    if (vehicle.listing_type === "rent") {
      const period = vehicle.rent_price_period || "daily";
      const price = period === "daily" 
        ? vehicle.rent_daily_price
        : period === "weekly"
        ? vehicle.rent_weekly_price
        : vehicle.rent_monthly_price;
      
      const periodLabel = period === "daily" ? "/día" : period === "weekly" ? "/semana" : "/mes";
      return price ? `$${price.toLocaleString("es-CL")}${periodLabel}` : "Precio no disponible";
    } else if (vehicle.listing_type === "auction") {
      const price = vehicle.auction_start_price || vehicle.price;
      return price ? `$${price.toLocaleString("es-CL")} (Precio base)` : "Precio no disponible";
    } else {
      return vehicle.price ? `$${vehicle.price.toLocaleString("es-CL")}` : "Precio no disponible";
    }
  };

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
      case "sale": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "rent": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "auction": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      default: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };

  // Extraer specs
  const extraSpecs = vehicle.specs || {};
  const fuelType = extraSpecs.fuel_type || extraSpecs.legacy?.fuel_legacy;
  const transmission = extraSpecs.transmission || extraSpecs.legacy?.transmission_legacy;
  const condition = extraSpecs.condition || extraSpecs.legacy?.condition;

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
      alert('Enlace copiado al portapapeles');
    }
    setShowShareMenu(false);
  };

  const toggleFavorite = () => {
    setFavorite(!favorite);
    // Aquí puedes agregar la lógica para guardar en favoritos
  };

  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg">
      {/* Header con breadcrumbs y acciones */}
      <div className="bg-lightcard dark:bg-darkcard border-b border-lightborder/10 dark:border-darkborder/10 sticky top-0 z-40 backdrop-blur-sm bg-lightcard/80 dark:bg-darkcard/80">
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
              <div className="hidden md:flex items-center gap-2 text-sm text-lighttext/60 dark:text-darktext/60">
                <span className="cursor-pointer hover:text-primary" onClick={() => router.push('/')}>Inicio</span>
                <span>/</span>
                <span className="cursor-pointer hover:text-primary" onClick={() => router.push('/ventas')}>
                  {getListingTypeLabel()}
                </span>
                <span>/</span>
                <span className="text-lighttext dark:text-darktext">{vehicle.brands?.name || 'Vehículo'}</span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleFavorite}
                className={`p-2.5 rounded-full transition-all ${
                  favorite 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600' 
                    : 'bg-lightbg dark:bg-darkbg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                }`}
                title="Guardar en favoritos"
              >
                <IconHeart size={20} fill={favorite ? 'currentColor' : 'none'} />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2.5 rounded-full bg-lightbg dark:bg-darkbg hover:bg-primary/10 transition-all"
                  title="Compartir"
                >
                  <IconShare size={20} />
                </button>
                
                {/* Menú de compartir */}
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-lightcard dark:bg-darkcard rounded-xl shadow-2xl border border-lightborder/10 dark:border-darkborder/10 p-2 min-w-[200px] z-50">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-lightbg dark:hover:bg-darkbg rounded-lg transition text-left"
                    >
                      <span className="text-blue-600">📘</span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-lightbg dark:hover:bg-darkbg rounded-lg transition text-left"
                    >
                      <span className="text-sky-500">🐦</span>
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-lightbg dark:hover:bg-darkbg rounded-lg transition text-left"
                    >
                      <span className="text-green-600">💬</span>
                      <span>WhatsApp</span>
                    </button>
                    <div className="border-t border-lightborder/10 dark:border-darkborder/10 my-2"></div>
                    <button
                      onClick={() => handleShare()}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-lightbg dark:hover:bg-darkbg rounded-lg transition text-left"
                    >
                      <span>🔗</span>
                      <span>Copiar enlace</span>
                    </button>
                  </div>
                )}
              </div>

              <button 
                className="p-2.5 rounded-full bg-lightbg dark:bg-darkbg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                title="Reportar"
              >
                <IconFlag size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Imágenes y detalles */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galería de imágenes mejorada */}
            <div className="bg-lightcard dark:bg-darkcard rounded-3xl overflow-hidden shadow-lg">
              {/* Imagen principal */}
              <div className="relative aspect-[16/9] bg-lightbg dark:bg-darkbg group">
                <img
                  src={currentImage}
                  alt={vehicle.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Controles de navegación */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 dark:bg-black/95 flex items-center justify-center hover:scale-110 transition-all shadow-xl opacity-0 group-hover:opacity-100"
                    >
                      <IconChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 dark:bg-black/95 flex items-center justify-center hover:scale-110 transition-all shadow-xl opacity-0 group-hover:opacity-100"
                    >
                      <IconChevronRight size={24} />
                    </button>
                  </>
                )}
                
                {/* Contador de imágenes */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 right-4 px-4 py-2 bg-black/80 text-white text-sm rounded-full backdrop-blur-sm font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Badge de destacado */}
                {vehicle.featured && (
                  <div className="absolute top-4 left-4 px-4 py-2 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                    <span>⭐</span>
                    <span>Destacado</span>
                  </div>
                )}
              </div>

              {/* Grid de miniaturas mejorado */}
              {images.length > 1 && (
                <div className="p-4 bg-lightbg/50 dark:bg-darkbg/50">
                  <div className="grid grid-cols-6 gap-2">
                    {images.slice(0, 6).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-3 transition-all ${
                          idx === currentImageIndex
                            ? "border-primary scale-105 shadow-lg"
                            : "border-transparent hover:border-lightborder dark:hover:border-darkborder hover:scale-105"
                        }`}
                      >
                        <img src={img} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 5 && images.length > 6 && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-bold">
                            +{images.length - 6}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Información principal mejorada */}
            <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-8 shadow-lg">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getListingTypeColor()}`}>
                    {getListingTypeLabel()}
                  </span>
                  {vehicle.condition && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {capitalize(toSpanish(conditionMap, extraSpecs.condition || extraSpecs.legacy?.condition) || vehicle.condition)}
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-lighttext dark:text-darktext mb-4 leading-tight">
                  {vehicle.title}
                </h1>
                
                <div className="flex items-baseline gap-3 mb-4">
                  <p className="text-3xl md:text-3xl font-bold text-primary">{getDisplayPrice()}</p>
                  {vehicle.listing_type === 'sale' && vehicle.price && (
                    <span className="text-sm text-lighttext/60 dark:text-darktext/60">CLP</span>
                  )}
                </div>

                {/* Ubicación */}
                {(vehicle.communes?.name || vehicle.regions?.name) && (
                  <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                    <IconMapPin size={20} className="text-primary" />
                    <span className="text-lg">
                      {vehicle.communes?.name}
                      {vehicle.communes?.name && vehicle.regions?.name && ", "}
                      {vehicle.regions?.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Specs principales en grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-lightborder/10 dark:border-darkborder/10">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-lightbg dark:bg-darkbg flex items-center justify-center mx-auto mb-3">
                    <IconCalendar size={24} className="text-primary" />
                  </div>
                  <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Año</p>
                  <p className="font-bold text-xl">{vehicle.year || "—"}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-lightbg dark:bg-darkbg flex items-center justify-center mx-auto mb-3">
                    <IconGauge size={24} className="text-primary" />
                  </div>
                  <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Kilometraje</p>
                  <p className="font-bold text-xl">
                    {vehicle.mileage != null ? `${(vehicle.mileage / 1000).toFixed(0)}k` : "—"}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-lightbg dark:bg-darkbg flex items-center justify-center mx-auto mb-3">
                    <IconEngine size={24} className="text-primary" />
                  </div>
                  <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Combustible</p>
                  <p className="font-bold text-xl">{fuelType ? capitalize(toSpanish(fuelTypeMap, fuelType) || fuelType) : "—"}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-lightbg dark:bg-darkbg flex items-center justify-center mx-auto mb-3">
                    <IconManualGearbox size={24} className="text-primary" />
                  </div>
                  <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Transmisión</p>
                  <p className="font-bold text-xl">{transmission ? capitalize(toSpanish(transmissionMap, transmission) || transmission) : "—"}</p>
                </div>
              </div>

              {/* Descripción */}
              {vehicle.description && (
                <div className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Descripción</h2>
                  <p className="text-lighttext/80 dark:text-darktext/80 leading-relaxed whitespace-pre-wrap">
                    {vehicle.description}
                  </p>
                </div>
              )}
            </div>

            {/* Características adicionales */}
            <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconCar size={24} />
                Especificaciones Técnicas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {vehicle.brands?.name && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Marca</p>
                    <p className="font-semibold text-lg">{vehicle.brands.name}</p>
                  </div>
                )}
                {vehicle.models?.name && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Modelo</p>
                    <p className="font-semibold text-lg">{vehicle.models.name}</p>
                  </div>
                )}
                {(vehicle.vehicle_types as any)?.label && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Tipo</p>
                    <p className="font-semibold text-lg">{(vehicle.vehicle_types as any).label}</p>
                  </div>
                )}
                {vehicle.color && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Color</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-lightborder dark:border-darkborder" style={{ backgroundColor: vehicle.color.toLowerCase() }}></div>
                      <p className="font-semibold text-lg">{capitalize(vehicle.color)}</p>
                    </div>
                  </div>
                )}
                {condition && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Estado</p>
                    <p className="font-semibold text-lg">{capitalize(toSpanish(conditionMap, condition) || condition)}</p>
                  </div>
                )}
                {extraSpecs.legacy?.body_type && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Carrocería</p>
                    <p className="font-semibold text-lg">{capitalize(extraSpecs.legacy.body_type)}</p>
                  </div>
                )}
                {extraSpecs.legacy?.doors && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Puertas</p>
                    <p className="font-semibold text-lg">{extraSpecs.legacy.doors}</p>
                  </div>
                )}
                {extraSpecs.legacy?.seats && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Asientos</p>
                    <p className="font-semibold text-lg">{extraSpecs.legacy.seats}</p>
                  </div>
                )}
                {extraSpecs.legacy?.engine && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Motor</p>
                    <p className="font-semibold text-lg">{extraSpecs.legacy.engine}</p>
                  </div>
                )}
                {extraSpecs.legacy?.power_hp && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Potencia</p>
                    <p className="font-semibold text-lg">{extraSpecs.legacy.power_hp} HP</p>
                  </div>
                )}
                {extraSpecs.legacy?.drivetrain && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Tracción</p>
                    <p className="font-semibold text-lg">{capitalize(extraSpecs.legacy.drivetrain)}</p>
                  </div>
                )}
                {extraSpecs.legacy?.consumption && (
                  <div>
                    <p className="text-xs text-lighttext/60 dark:text-darktext/60 mb-1 uppercase tracking-wider">Consumo</p>
                    <p className="font-semibold text-lg">{extraSpecs.legacy.consumption}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipamiento */}
            {extraSpecs.equipment && Array.isArray(extraSpecs.equipment) && extraSpecs.equipment.length > 0 && (
              <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconSettings size={24} />
                  Equipamiento
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extraSpecs.equipment.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-lightbg dark:bg-darkbg rounded-xl">
                      <IconCheck size={20} className="text-green-600 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial y Estado */}
            {extraSpecs.condition_tags && Array.isArray(extraSpecs.condition_tags) && extraSpecs.condition_tags.length > 0 && (
              <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconShieldCheck size={24} />
                  Historial y Estado
                </h2>
                <div className="space-y-3">
                  {extraSpecs.condition_tags.map((tag: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-lightbg dark:bg-darkbg rounded-xl">
                      <IconInfoCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentación */}
            {extraSpecs.documentation && Array.isArray(extraSpecs.documentation) && extraSpecs.documentation.length > 0 && (
              <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconFileText size={24} />
                  Documentación
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extraSpecs.documentation.map((doc: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <IconCheck size={20} className="text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condiciones Comerciales */}
            {(vehicle.allow_financing || vehicle.allow_exchange || extraSpecs.commercial_conditions) && (
              <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <IconShieldCheck size={24} />
                  Condiciones Comerciales
                </h2>
                <div className="space-y-3">
                  {vehicle.allow_financing && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <IconCheck size={24} className="text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Financiamiento Disponible</p>
                        <p className="text-sm text-lighttext/70 dark:text-darktext/70">Consulta las opciones de financiamiento con el vendedor</p>
                      </div>
                    </div>
                  )}
                  {vehicle.allow_exchange && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <IconCheck size={24} className="text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Acepta Permuta</p>
                        <p className="text-sm text-lighttext/70 dark:text-darktext/70">El vendedor está abierto a recibir tu vehículo como parte de pago</p>
                      </div>
                    </div>
                  )}
                  {extraSpecs.commercial_conditions?.flags && Array.isArray(extraSpecs.commercial_conditions.flags) && extraSpecs.commercial_conditions.flags.length > 0 && (
                    <div className="space-y-2">
                      {extraSpecs.commercial_conditions.flags.map((flag: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-lightbg dark:bg-darkbg rounded-xl">
                          <IconCheck size={20} className="text-primary flex-shrink-0" />
                          <span className="text-sm">{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {extraSpecs.commercial_conditions?.notas && (
                    <div className="p-4 bg-lightbg dark:bg-darkbg rounded-xl">
                      <p className="text-sm text-lighttext/80 dark:text-darktext/80">{extraSpecs.commercial_conditions.notas}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información de Publicación */}
            <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconClock size={24} />
                Información de la Publicación
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-lighttext/60 dark:text-darktext/60 mb-1">Publicado</p>
                  <p className="font-semibold">{vehicle.published_at ? new Date(vehicle.published_at).toLocaleDateString("es-CL") : "—"}</p>
                </div>
                <div>
                  <p className="text-lighttext/60 dark:text-darktext/60 mb-1">Última actualización</p>
                  <p className="font-semibold">{vehicle.updated_at ? new Date(vehicle.updated_at).toLocaleDateString("es-CL") : "—"}</p>
                </div>
                <div>
                  <p className="text-lighttext/60 dark:text-darktext/60 mb-1">ID de publicación</p>
                  <p className="font-mono text-xs">{vehicle.id}</p>
                </div>
                {extraSpecs.legacy?.owners && (
                  <div>
                    <p className="text-lighttext/60 dark:text-darktext/60 mb-1">Dueños anteriores</p>
                    <p className="font-semibold">{extraSpecs.legacy.owners}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha: Vendedor y contacto */}
          <div className="lg:col-span-1">
            <div className="bg-lightcard dark:bg-darkcard rounded-3xl p-6 shadow-lg sticky top-8">
              {vehicle.profiles ? (
                <>
                  <div className="text-center mb-6">
                    {/* Avatar clickeable */}
                    <div 
                      className="mx-auto mb-3 flex justify-center cursor-pointer group"
                      onClick={() => vehicle.profiles?.username && router.push(`/perfil/${vehicle.profiles.username}`)}
                    >
                      <div className="relative">
                        <UserAvatar 
                          path={vehicle.profiles.avatar_url} 
                          alt={vehicle.profiles.public_name}
                          size={96}
                          className="transition-transform group-hover:scale-105"
                        />
                        {vehicle.profiles.plan === 'premium' && (
                          <span className="absolute -top-1 -right-1 text-2xl" title="Usuario Premium">⭐</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Nombre y username clickeables */}
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => vehicle.profiles?.username && router.push(`/perfil/${vehicle.profiles.username}`)}
                    >
                      <h3 className="text-lg font-bold">{vehicle.profiles.public_name}</h3>
                      <p className="text-sm text-primary">@{vehicle.profiles.username}</p>
                    </div>
                    
                    {/* Descripción del vendedor */}
                    {vehicle.profiles.description && (
                      <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-3 line-clamp-3">
                        {vehicle.profiles.description}
                      </p>
                    )}
                    
                    {/* Información adicional */}
                    <div className="mt-4 space-y-2 text-sm">
                      {vehicle.profiles.address && (
                        <div className="flex items-center justify-center gap-2 text-lighttext/60 dark:text-darktext/60">
                          <IconMapPin size={16} />
                          <span className="truncate">{vehicle.profiles.address}</span>
                        </div>
                      )}
                      {vehicle.profiles.website && (
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
                  
                  {/* Botones de acción */}
                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      size="lg"
                      shape="rounded"
                      className="w-full"
                      onClick={() => setContactModalOpen(true)}
                    >
                      Contactar vendedor
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      shape="rounded"
                      className="w-full"
                      onClick={() => vehicle.profiles?.username && router.push(`/perfil/${vehicle.profiles.username}`)}
                    >
                      Ver perfil completo
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-lighttext/60 dark:text-darktext/60">
                  <p>Información del vendedor no disponible</p>
                </div>
              )}

              {/* Información adicional de arriendo */}
              {vehicle.listing_type === "rent" && (
                <div className="mt-6 pt-6 border-t border-lightborder/10 dark:border-darkborder/10">
                  <h4 className="font-bold mb-3">Información de arriendo</h4>
                  <div className="space-y-2 text-sm">
                    {vehicle.rent_security_deposit && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Garantía:</span>
                        <span className="font-semibold">${vehicle.rent_security_deposit.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {vehicle.rent_min_days && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Mínimo:</span>
                        <span className="font-semibold">{vehicle.rent_min_days} días</span>
                      </div>
                    )}
                    {vehicle.rent_max_days && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Máximo:</span>
                        <span className="font-semibold">{vehicle.rent_max_days} días</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información adicional de subasta */}
              {vehicle.listing_type === "auction" && (
                <div className="mt-6 pt-6 border-t border-lightborder/10 dark:border-darkborder/10">
                  <h4 className="font-bold mb-3">Información de subasta</h4>
                  <div className="space-y-2 text-sm">
                    {vehicle.auction_current_bid && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Oferta actual:</span>
                        <span className="font-semibold text-green-600">${vehicle.auction_current_bid.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {vehicle.auction_bid_count != null && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Ofertas:</span>
                        <span className="font-semibold">{vehicle.auction_bid_count}</span>
                      </div>
                    )}
                    {vehicle.auction_end_at && (
                      <div className="flex justify-between">
                        <span className="text-lighttext/60 dark:text-darktext/60">Termina:</span>
                        <span className="font-semibold">{new Date(vehicle.auction_end_at).toLocaleDateString("es-CL")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de contacto */}
      {vehicle.profiles && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={vehicle.profiles.public_name}
          contextTitle={vehicle.title}
          email={vehicle.profiles.email || undefined}
          phone={vehicle.profiles.phone || undefined}
          contextType="vehicle"
        />
      )}
    </div>
  );
}
