"use client";
import React from "react";
import { IconStarFilled } from '@tabler/icons-react';

type ChipVariant = 'default' | 'subtle' | 'glass' | 'warning' | 'success';

interface ChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  title?: string;
}

const base = 'inline-flex items-center gap-1 font-medium rounded-full border transition-base select-none';
const sizeMap = {
  sm: 'text-[11px] px-2 py-1',
  md: 'text-xs px-3 py-1.5'
};
const variantMap: Record<ChipVariant,string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 border-transparent hover:bg-gray-200/80 dark:hover:bg-white/15',
  subtle: 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-300 border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10',
  glass: 'bg-white/10 backdrop-blur text-white border-white/20 hover:bg-white/20',
  warning: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/80',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200/80'
};

export function Chip({ children, variant='default', icon, className='', size='sm', onClick, title }: ChipProps) {
  const Tag: any = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${onClick ? 'cursor-pointer active:scale-[0.97]' : ''} ${className}`}
    >
      {icon && <span className="inline-flex items-center justify-center">{icon}</span>}
      {children}
    </Tag>
  );
}

interface RatingChipProps {
  value: number; // 0-5
  total?: number; // número de reseñas
  className?: string;
  onClick?: () => void;
}

export function RatingChip({ value, total, className='', onClick }: RatingChipProps) {
  const display = isNaN(value) ? '0.0' : value.toFixed(1);
  const hasReviews = total != null && total > 0;

  return (
    <Chip
      variant="default"
      size="sm"
      onClick={onClick}
      title={hasReviews ? `${display} estrellas de ${total} reseñas` : `${display} estrellas`}
      className={`bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/50 dark:hover:bg-amber-900/50 ${className}`}
      icon={<IconStarFilled size={12} className="text-amber-500" />}
    >
      <span className="font-semibold">{display}</span>
      {hasReviews && <span className="text-amber-600 dark:text-amber-300 ml-1">({total})</span>}
    </Chip>
  );
}

export default Chip;
