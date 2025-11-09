"use client";

import React from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Chip, RatingChip } from "@/components/ui/Chip";
import InfoBlock from "@/components/perfil/InfoBlock";
import { CircleButton } from "@/components/ui/CircleButton";
import Button from "@/components/ui/Button";
import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTiktok, IconBrandWhatsapp, IconBrandYoutube, IconWorld, IconMapPin, IconClock, IconShare3, IconPencil, IconPhone } from '@tabler/icons-react';

interface HeroProfileCardProps {
  profile: any;
  name: string;
  onContact?: () => void;
  onShare?: () => void;
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
  abierto
}: HeroProfileCardProps) {
  return (
  <div className="rounded-2xl bg-white dark:bg-white/[0.05] shadow-token-lg animate-fade-scale-in px-6 md:px-8 py-6 flex flex-col gap-6 border border-gray-200/70 dark:border-white/10 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Avatar */}
  <div className="relative flex justify-center md:justify-start shrink-0">
          <UserAvatar
            path={profile.avatar_url}
            size={164}
            className="shadow-token-lg w-40 h-40 ring-2 ring-white/80 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur rounded-full"
          />
          {online && (
            <span className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-green-500 ring-2 ring-white/80 dark:ring-white/10" title="Usuario activo" />
          )}
        </div>
        {/* Texto principal */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
          <h1 className="text-[clamp(1.65rem,2.4vw,2.4rem)] font-semibold tracking-tight text-gray-900 dark:text-white leading-snug break-words">{name}</h1>
          {profile.description && (
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-200/90 max-w-2xl leading-relaxed">
              {profile.description}
            </p>
          )}
          <div className="flex justify-between gap-2 mt-1 items-center w-full">
            {profile.plan && (<Chip variant="subtle" size="sm" className="bg-primary/10 text-primary dark:bg-primary/15">{profile.plan}</Chip>)}
            <div className="flex items-center gap-1">
              {typeof abierto === 'boolean' && (
                <Chip variant={abierto ? 'success' : 'warning'} size="sm">{abierto ? 'Abierto' : 'Cerrado'}</Chip>
              )}
              <RatingChip
                value={ratingValue || 0}
                total={ratingTotal}
                onClick={onOpenReviews}
                className="cursor-pointer focus-ring active:scale-[0.97]" />
              {onAddReview && (
                <button
                  onClick={onAddReview}
                  className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-colors focus-ring active:scale-[0.97]"
                  title="Agregar opinión"
                  aria-label="Agregar opinión"
                >
                  <IconPencil size={12} className="text-primary" />
                </button>
              )}
            </div>
            {profile.visitas != null && (<Chip variant="subtle" size="sm">{profile.visitas} visitas</Chip>)}
          </div>
        </div>
        {/* Acciones primarias */}
        <div className="flex flex-row md:flex-col gap-3 items-center md:items-end self-center md:self-start">
          <Button
            variant="primary"
            size="md"
            shape="rounded"
            onClick={onContact}
          >
            <div className="flex items-center gap-2">
              <IconPhone size={16} />
              <span>Contactar</span>
            </div>
          </Button>
          <div className="relative inline-block" ref={profile._shareBtnRef}>
            <Button
              variant="neutral"
              size="md"
              shape="rounded"
              onClick={onShare}
            >
              <div className="flex items-center gap-2">
                <IconShare3 size={16} />
                <span>Compartir</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
      {/* Línea horizontal unificada: info + redes */}
  <div className="flex flex-row flex-wrap gap-4 items-stretch w-full rounded-xl bg-gray-50/90 dark:bg-white/5 p-3 md:p-4 overflow-x-auto scrollbar-thin border border-gray-200/70 dark:border-white/10">
        {locationLabel && (
          <InfoBlock
            icon={<IconMapPin size={16} stroke={1.3} />}
            label="Ubicación"
            value={locationLabel}
            hint="Ver en Google Maps"
            onClick={onOpenMaps}
            compact
            className="min-w-[180px]"
          />
        )}
        <InfoBlock
          icon={<IconClock size={16} stroke={1.3} />}
          label="Horarios"
          value={hasSchedule ? 'Ver detalle' : 'No configurado'}
          hint="Ver horarios"
          onClick={hasSchedule ? onOpenSchedule : undefined}
          compact
          className="min-w-[150px]"
        />
        {websiteLabel && (
          <InfoBlock
            icon={<IconWorld size={16} stroke={1.3} />}
            label="Sitio Web"
            value={websiteLabel.replace(/^https?:\/\//,'')}
            hint="Abrir sitio"
            onClick={onOpenWebsite}
            compact
            className="min-w-[170px]"
          />
        )}
        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-white/20 dark:border-white/10 ml-auto flex-wrap">
          {redes?.facebook && (
            <CircleButton aria-label="Facebook" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://facebook.com/${redes.facebook}`, '_blank') }>
              <IconBrandFacebook size={18} stroke={1} />
            </CircleButton>
          )}
          {redes?.instagram && (
            <CircleButton aria-label="Instagram" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://instagram.com/${redes.instagram}`, '_blank') }>
              <IconBrandInstagram size={18} stroke={1} />
            </CircleButton>
          )}
          {redes?.linkedin && (
            <CircleButton aria-label="LinkedIn" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://linkedin.com/in/${redes.linkedin}`, '_blank') }>
              <IconBrandLinkedin size={18} stroke={1} />
            </CircleButton>
          )}
          {redes?.tiktok && (
            <CircleButton aria-label="TikTok" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://tiktok.com/@${redes.tiktok}`, '_blank') }>
              <IconBrandTiktok size={18} stroke={1} />
            </CircleButton>
          )}
          {redes?.whatsapp && (
            <CircleButton aria-label="WhatsApp" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://wa.me/${redes.whatsapp}`, '_blank') }>
              <IconBrandWhatsapp size={18} stroke={1} />
            </CircleButton>
          )}
          {redes?.youtube && (
            <CircleButton aria-label="YouTube" size={38} variant="default" className="active:scale-[0.97]" onClick={() => window.open(`https://youtube.com/${redes.youtube.startsWith('@') ? redes.youtube : '@' + redes.youtube}`, '_blank') }>
              <IconBrandYoutube size={18} stroke={1} />
            </CircleButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroProfileCard;
