"use client";

import React, { RefObject } from "react";
import { UserAvatar, Chip, RatingChip, CircleButton, Button } from "@simple/ui";
import InfoBlock from "@/components/perfil/InfoBlock";
import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTiktok, IconBrandWhatsapp, IconBrandYoutube, IconWorld, IconMapPin, IconClock, IconShare3, IconPencil, IconPhone } from '@tabler/icons-react';

interface HeroProfileCardProps {
  profile: any;
  name: string;
  onContact?: () => void;
  onShare?: () => void;
  // Informaci�n extendida
  // Información extendida
  locationLabel?: string;
  onOpenMaps?: () => void;
  hasSchedule?: boolean;
  onOpenSchedule?: () => void;
  websiteLabel?: string | null;
  onOpenWebsite?: () => void;
  ratingValue?: number;
  ratingTotal?: number;
  onOpenReviews?: () => void;
  onAddReview?: () => void;
  redes?: Record<string, any>;
  online?: boolean;
  abierto?: boolean;
  shareButtonRef?: RefObject<HTMLDivElement | null>;
}

/**
 * HeroProfileCard
 * Tarjeta flotante sobre la portada del perfil público.
 * Contiene: Avatar, nombre, descripción, chips (plan / visitas / región) y acciones Contactar / Compartir.
 * Nota: Se mantiene tipado laxo mientras se estabiliza el modelo de profile.
 */
export function HeroProfileCard({
  profile,
  name,
  onContact,
  onShare,
  locationLabel,
  onOpenMaps,
  hasSchedule,
  onOpenSchedule,
  websiteLabel,
  onOpenWebsite,
  ratingValue = 0,
  ratingTotal,
  onOpenReviews,
  onAddReview,
  redes = {},
  online,
  abierto,
  shareButtonRef,
}: HeroProfileCardProps) {
  const descriptionText =
    (profile?.description as string | undefined)
    || (profile?.bio as string | undefined)
    || (profile?.headline as string | undefined)
    || "";

  const websiteText = websiteLabel ? websiteLabel.replace(/^https?:\/\//, '') : null;
  const locationText = locationLabel || null;
  const hasAnyRedes = Boolean(
    redes?.facebook
      || redes?.instagram
      || redes?.linkedin
      || redes?.tiktok
      || redes?.whatsapp
      || redes?.youtube
  );

  return (
    <div className="card-surface shadow-card animate-fade-scale-in p-6 md:p-8 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-6 md:gap-8 items-start">
        {/* Avatar */}
        <div className="relative flex justify-center md:justify-start shrink-0">
          <UserAvatar
            src={profile.avatar_url}
            size={164}
            className="shadow-token-lg w-40 h-40 ring-2 ring-border/80 bg-[var(--overlay-highlight-80)] dark:bg-[var(--overlay-highlight-5)] backdrop-blur rounded-full"
          />
          {online && (
            <span
              className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-[var(--color-success)] ring-2 ring-border/80"
              title="Usuario activo"
            />
          )}
        </div>

        {/* Texto + info */}
        <div className="min-w-0 flex flex-col items-center md:items-start text-center md:text-left gap-3">
          <div className="w-full flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-[clamp(1.65rem,2.4vw,2.4rem)] font-semibold tracking-tight text-lighttext dark:text-darktext leading-snug break-words min-w-0">
              {name}
            </h1>
            <div className="flex items-center gap-2">
              {typeof abierto === 'boolean' && (
                <Chip
                  variant="subtle"
                  size="sm"
                  className={
                    `h-8 ${abierto
                      ? 'bg-[var(--color-primary-a10)] border border-[var(--color-primary-a30)] text-primary'
                      : 'bg-[var(--field-bg)] border border-[var(--field-border)] text-lighttext/70 dark:text-darktext/70'
                    }`
                  }
                >
                  {abierto ? 'Abierto' : 'Cerrado'}
                </Chip>
              )}

              <RatingChip
                value={ratingValue || 0}
                total={ratingTotal || 0}
                onClick={onOpenReviews}
                className={onOpenReviews ? 'cursor-pointer focus-ring active:scale-[0.99]' : ''}
              />

              {onAddReview && (
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  shape="pill"
                  onClick={onAddReview}
                  leftIcon={<IconPencil size={14} />}
                  className="h-8"
                >
                  Opinar
                </Button>
              )}
            </div>
          </div>

          {descriptionText && (
            <p className="text-sm md:text-base text-lighttext/80 dark:text-darktext/80 max-w-2xl leading-relaxed">
              {descriptionText}
            </p>
          )}

          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-1 items-center w-full">
            {profile.plan && (
              <Chip
                variant="subtle"
                size="sm"
                className="h-8 bg-[var(--color-primary-a10)] border border-[var(--color-primary-a30)] text-primary"
              >
                {profile.plan}
              </Chip>
            )}
            {profile.visitas != null && (
              <Chip variant="subtle" size="sm" className="h-8">
                {profile.visitas} visitas
              </Chip>
            )}
          </div>

          <div className="w-full flex flex-wrap items-stretch justify-center md:justify-start gap-2 pt-1">
            <InfoBlock
              icon={<IconMapPin size={16} stroke={1.3} />}
              label="Ubicación"
              value={locationText ? 'Ver ubicación' : 'No configurado'}
              hint={locationText || undefined}
              onClick={locationText ? onOpenMaps : undefined}
              className="min-w-0"
            />
            <InfoBlock
              icon={<IconClock size={16} stroke={1.3} />}
              label="Horarios"
              value={hasSchedule ? 'Ver horarios' : 'No configurado'}
              hint={hasSchedule ? 'Ver horarios' : undefined}
              onClick={hasSchedule ? onOpenSchedule : undefined}
              className="min-w-0"
            />
            <InfoBlock
              icon={<IconWorld size={16} stroke={1.3} />}
              label="Sitio Web"
              value={websiteText ? 'Ver sitio web' : 'No configurado'}
              hint={websiteText || undefined}
              onClick={websiteText ? onOpenWebsite : undefined}
              className="min-w-0"
            />

            <div className="inline-flex max-w-full items-center gap-2 card-inset radius-md px-4 py-2.5">
              <span className="sr-only">Redes sociales</span>
              {hasAnyRedes ? (
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {redes?.facebook && (
                    <CircleButton
                      aria-label="Facebook"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://facebook.com/${redes.facebook}`, '_blank')}
                    >
                      <IconBrandFacebook size={16} stroke={1} />
                    </CircleButton>
                  )}
                  {redes?.instagram && (
                    <CircleButton
                      aria-label="Instagram"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://instagram.com/${redes.instagram}`, '_blank')}
                    >
                      <IconBrandInstagram size={16} stroke={1} />
                    </CircleButton>
                  )}
                  {redes?.linkedin && (
                    <CircleButton
                      aria-label="LinkedIn"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://linkedin.com/in/${redes.linkedin}`, '_blank')}
                    >
                      <IconBrandLinkedin size={16} stroke={1} />
                    </CircleButton>
                  )}
                  {redes?.tiktok && (
                    <CircleButton
                      aria-label="TikTok"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://tiktok.com/@${redes.tiktok}`, '_blank')}
                    >
                      <IconBrandTiktok size={16} stroke={1} />
                    </CircleButton>
                  )}
                  {redes?.whatsapp && (
                    <CircleButton
                      aria-label="WhatsApp"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://wa.me/${redes.whatsapp}`, '_blank')}
                    >
                      <IconBrandWhatsapp size={16} stroke={1} />
                    </CircleButton>
                  )}
                  {redes?.youtube && (
                    <CircleButton
                      aria-label="YouTube"
                      size={32}
                      variant="default"
                      className="active:scale-[0.97] shrink-0"
                      onClick={() => window.open(`https://youtube.com/${redes.youtube.startsWith('@') ? redes.youtube : '@' + redes.youtube}`, '_blank')}
                    >
                      <IconBrandYoutube size={16} stroke={1} />
                    </CircleButton>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-lighttext/80 dark:text-darktext/80 truncate min-w-0">No configurado</span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-row md:flex-col gap-3 items-center self-center md:self-start">
          <Button variant="primary" size="md" shape="rounded" onClick={onContact}>
            <div className="flex items-center gap-2">
              <IconPhone size={16} />
              <span>Contactar</span>
            </div>
          </Button>
          <div className="relative inline-block" ref={shareButtonRef}>
            <Button variant="neutral" size="md" shape="rounded" onClick={onShare}>
              <div className="flex items-center gap-2">
                <IconShare3 size={16} />
                <span>Compartir</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroProfileCard;







