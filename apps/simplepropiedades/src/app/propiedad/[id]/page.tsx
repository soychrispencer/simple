"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Property } from '@/types/property';
import { Button } from "@simple/ui";
import { isSimpleApiListingsEnabled } from "@simple/config";
import { getListingById, getListingMedia, type SdkListingSummary } from "@simple/sdk";
import {
  IconArrowLeft, IconMapPin, IconBed, IconBath, IconRuler2,
  IconCar, IconBookmark, IconShare, IconChevronLeft, IconChevronRight
} from "@tabler/icons-react";
import { ContactModal } from "@simple/ui";

function normalizePropertyType(value: unknown, title = ''): Property['property_type'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'house' || normalized === 'casa') return 'house';
  if (
    normalized === 'apartment' ||
    normalized === 'departamento' ||
    normalized === 'depto' ||
    normalized === 'apartamento'
  ) {
    return 'apartment';
  }
  if (normalized === 'commercial' || normalized === 'comercial' || normalized === 'local') {
    return 'commercial';
  }
  if (normalized === 'land' || normalized === 'terreno') return 'land';
  if (normalized === 'office' || normalized === 'oficina') return 'office';
  if (normalized === 'warehouse' || normalized === 'bodega') return 'warehouse';

  const lowerTitle = String(title || '').toLowerCase();
  if (lowerTitle.includes('casa')) return 'house';
  if (lowerTitle.includes('terreno')) return 'land';
  if (lowerTitle.includes('oficina')) return 'office';
  if (lowerTitle.includes('bodega')) return 'warehouse';
  if (lowerTitle.includes('local') || lowerTitle.includes('comercial')) return 'commercial';
  return 'apartment';
}

function mapSimpleApiItemToProperty(item: SdkListingSummary, imageUrls: string[]): Property {
  const features = Array.isArray(item.features) ? item.features : [];
  const amenities = Array.isArray(item.amenities) ? item.amenities : [];

  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    property_type: normalizePropertyType(item.propertyType, item.title),
    listing_type: item.type as Property['listing_type'],
    status: 'available',
    price: Number(item.price || 0),
    currency: item.currency || 'CLP',
    country: 'Chile',
    region: item.region || '',
    city: item.city || '',
    bedrooms: Number(item.bedrooms || 0),
    bathrooms: Number(item.bathrooms || 0),
    area_m2: Number(item.areaM2 || 0),
    area_built_m2: Number(item.areaBuiltM2 || 0) || null,
    parking_spaces: Number(item.parkingSpaces || 0),
    floor: Number.isFinite(Number(item.floor)) ? Number(item.floor) : null,
    total_floors: Number.isFinite(Number(item.totalFloors)) ? Number(item.totalFloors) : null,
    has_pool: features.includes('pool'),
    has_garden: features.includes('garden'),
    has_elevator: amenities.includes('elevator'),
    has_balcony: features.includes('balcony'),
    has_terrace: features.includes('terrace'),
    has_gym: amenities.includes('gym'),
    has_security: amenities.includes('security'),
    is_furnished: Boolean(item.isFurnished),
    allows_pets: Boolean(item.allowsPets),
    image_urls: imageUrls,
    owner_id: item.ownerId || '',
    views_count: 0,
    featured: Boolean(item.featured),
    created_at: item.createdAt || item.publishedAt || new Date().toISOString(),
    updated_at: item.createdAt || item.publishedAt || new Date().toISOString()
  };
}

export default function PropiedadDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        if (!isSimpleApiListingsEnabled()) {
          setError("Detalle no disponible: simple-api listings deshabilitado.");
          return;
        }

        const { item } = await getListingById(id);
        if (!item || item.vertical !== 'properties') {
          setError("Propiedad no encontrada");
          return;
        }

        const mediaPayload = await getListingMedia(id).catch(() => ({ items: [] as any[] }));
        const mediaImageUrls = Array.isArray(mediaPayload.items)
          ? mediaPayload.items
              .filter((entry: any) => entry?.kind === 'image' && typeof entry?.url === 'string')
              .sort((a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
              .map((entry: any) => String(entry.url))
          : [];

        const imageUrls = mediaImageUrls.length
          ? mediaImageUrls
          : item.imageUrl
            ? [item.imageUrl]
            : [];

        setProperty(mapSimpleApiItemToProperty(item, imageUrls));
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al cargar la propiedad");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-lighttext dark:text-darktext mb-4">
            {error || "Propiedad no encontrada"}
          </h1>
          <Button onClick={() => router.back()}>
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === property.image_urls.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? property.image_urls.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con botón volver */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Galería de imágenes */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video card-surface ring-1 ring-border/60 rounded-lg overflow-hidden mb-4">
              {property.image_urls.length > 0 ? (
                <>
                  <img
                    src={property.image_urls[currentImageIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {property.image_urls.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--overlay-scrim-60)] text-[var(--color-on-primary)] p-2 rounded-full hover:bg-[var(--overlay-scrim-70)]"
                      >
                        <IconChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--overlay-scrim-60)] text-[var(--color-on-primary)] p-2 rounded-full hover:bg-[var(--overlay-scrim-70)]"
                      >
                        <IconChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[var(--text-tertiary)]">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {property.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {property.image_urls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      index === currentImageIndex ? 'border-primary' : 'border-border/60'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información y acciones */}
          <div className="space-y-6">
            {/* Precio y título */}
            <div>
              <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-2">
                {property.title}
              </h1>
              <div className="text-2xl font-bold text-primary mb-4">
                {property.currency} {property.price.toLocaleString()}
              </div>
            </div>

            {/* Características principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <IconBed className="w-5 h-5 text-lighttext/70 dark:text-darktext/70" />
                <span>{property.bedrooms} dorm.</span>
              </div>
              <div className="flex items-center gap-2">
                <IconBath className="w-5 h-5 text-lighttext/70 dark:text-darktext/70" />
                <span>{property.bathrooms} baños</span>
              </div>
              <div className="flex items-center gap-2">
                <IconRuler2 className="w-5 h-5 text-lighttext/70 dark:text-darktext/70" />
                <span>{property.area_m2} m²</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCar className="w-5 h-5 text-lighttext/70 dark:text-darktext/70" />
                <span>{property.parking_spaces || 0} est.</span>
              </div>
            </div>

            {/* Ubicación */}
            <div className="flex items-center gap-2 text-lighttext/80 dark:text-darktext/80">
              <IconMapPin className="w-5 h-5" />
              <span>{property.city}, {property.region}</span>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <Button
                onClick={() => setContactModalOpen(true)}
                className="flex-1"
              >
                Contactar
              </Button>
              <Button
                variant="outline"
                onClick={() => setFavorite(!favorite)}
              >
                <IconBookmark className={`w-5 h-5 ${favorite ? 'fill-current text-primary' : ''}`} />
              </Button>
              <Button variant="outline">
                <IconShare className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-lighttext dark:text-darktext mb-4">
            Descripción
          </h2>
          <p className="text-lighttext/80 dark:text-darktext/80 leading-relaxed">
            {property.description || "Sin descripción disponible."}
          </p>
        </div>
      </div>

      {/* Modal de contacto */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactName={property.profiles?.full_name || 'Propietario'}
        email={property.profiles?.email}
        phone={property.profiles?.phone}
        whatsapp={property.profiles?.whatsapp}
        contextTitle={property.title}
        contextType="profile"
      />
    </div>
  );
}
