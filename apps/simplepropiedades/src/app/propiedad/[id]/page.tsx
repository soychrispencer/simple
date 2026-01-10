"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from '@/lib/supabase/supabase';
import type { Property } from '@/types/property';
import { Button } from "@simple/ui";
import {
  IconArrowLeft, IconMapPin, IconBed, IconBath, IconRuler2,
  IconCar, IconBookmark, IconShare, IconChevronLeft, IconChevronRight
} from "@tabler/icons-react";
import { LeadContactModal } from "@simple/ui";

const VERTICAL_KEY = 'properties';

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

  const supabase = getSupabaseClient();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        // Obtener el ID del vertical de propiedades
        const { data: verticalData, error: verticalError } = await supabase
          .from('verticals')
          .select('id')
          .eq('key', VERTICAL_KEY)
          .single();

        if (verticalError || !verticalData) {
          throw new Error('Error getting vertical');
        }

        const { data, error } = await supabase
          .from("listings")
          .select(`
            id,
            title,
            description,
            listing_type,
            price,
            currency,
            status,
            published_at,
            is_featured,
            contact_phone,
            contact_email,
            location,
            region_id,
            commune_id,
            created_at,
            user_id,
            views,
            listings_properties(
              property_type,
              operation_type,
              bedrooms,
              bathrooms,
              parking_spaces,
              total_area,
              built_area,
              land_area,
              floor,
              building_floors,
              year_built,
              furnished,
              pet_friendly,
              features,
              amenities
            ),
            regions(name),
            communes(name),
            images!inner(url, is_primary, position),
            profiles:user_id (
              id,
              username,
              first_name,
              last_name,
              public_name,
              email,
              phone,
              whatsapp
            )
          `)
          .eq('vertical_id', verticalData.id)
          .eq('id', id)
          .eq('status', 'published')
          .single();

        if (error) throw error;

        if (!data) {
          setError("Propiedad no encontrada");
        } else {
          // Map to Property interface
          const listing = data;
          const props = listing.listings_properties[0];
          const region = listing.regions?.[0]?.name || '';
          const commune = listing.communes?.[0]?.name || '';

          // Sort images by position and primary
          const sortedImages = listing.images
            ?.sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return a.position - b.position;
            })
            .map((img: any) => img.url) || [];

          const mappedProperty: Property = {
            id: listing.id,
            title: listing.title,
            description: listing.description || '',
            property_type: props.property_type as Property['property_type'],
            listing_type: listing.listing_type as Property['listing_type'],
            status: 'available' as Property['status'],
            price: listing.price || 0,
            currency: listing.currency || 'CLP',
            country: 'Chile',
            region: region,
            city: commune,
            bedrooms: props.bedrooms || 0,
            bathrooms: props.bathrooms || 0,
            area_m2: props.total_area || 0,
            area_built_m2: props.built_area || null,
            parking_spaces: props.parking_spaces || 0,
            floor: props.floor || null,
            total_floors: props.building_floors || null,
            has_pool: props.features?.includes('pool') || false,
            has_garden: props.features?.includes('garden') || false,
            has_elevator: props.amenities?.includes('elevator') || false,
            has_balcony: props.features?.includes('balcony') || false,
            has_terrace: props.features?.includes('terrace') || false,
            has_gym: props.amenities?.includes('gym') || false,
            has_security: props.amenities?.includes('security') || false,
            is_furnished: props.furnished || false,
            allows_pets: props.pet_friendly || false,
            image_urls: sortedImages,
            owner_id: listing.user_id,
            views_count: listing.views || 0,
            featured: listing.is_featured || false,
            created_at: listing.created_at,
            updated_at: listing.created_at,
            // Add profile info
            profiles: listing.profiles ? {
              id: listing.profiles[0].id,
              full_name: listing.profiles[0].public_name || `${listing.profiles[0].first_name} ${listing.profiles[0].last_name}`,
              email: listing.profiles[0].email,
              phone: listing.profiles[0].phone,
              whatsapp: listing.profiles[0].whatsapp
            } : undefined
          };

          setProperty(mappedProperty);
        }
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
      <LeadContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactName={property.profiles?.full_name || 'Propietario'}
        email={property.profiles?.email}
        phone={property.profiles?.phone}
        whatsapp={property.profiles?.whatsapp}
        contextType="property"
        itemId={property.id}
        itemType="property"
        itemTitle={property.title}
        supabaseClient={supabase}
      />
    </div>
  );
}