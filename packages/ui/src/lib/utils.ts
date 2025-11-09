import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind CSS de forma inteligente
 * Usa clsx para manejar condicionales y twMerge para evitar conflictos
 * 
 * @example
 * cn('px-2 py-1', 'bg-red-500', { 'bg-blue-500': isBlue })
 * // => 'px-2 py-1 bg-blue-500' (si isBlue es true)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
