import { Resvg } from '@resvg/resvg-wasm';

// Interfaces para los templates
type OverlayVariant = 
  | 'essential-watermark' 
  | 'professional-centered' 
  | 'signature-complete' 
  | 'property-conversion' 
  | 'property-project';

interface OverlayRequest {
  imageKey: string; // Key en R2 (ej: "listings/abc123/photo1.jpg")
  variant: OverlayVariant;
  data: {
    title?: string;
    price?: string;
    location?: string;
    highlights?: string[];
    badges?: string[];
    brand?: string; // 'simpleautos' | 'simplepropiedades'
  };
  width?: number;
  height?: number;
}

// Paletas de colores (matching templates.ts)
const COLOR_PALETTES = {
  essential: {
    primary: '#111111',
    secondary: '#f5f5f5',
    accent: '#111111',
    textPrimary: '#111111',
    textInverse: '#ffffff',
  },
  professional: {
    primary: '#1a1a1a',
    secondary: '#ffffff',
    accent: '#1a1a1a',
    textPrimary: '#1a1a1a',
    textInverse: '#ffffff',
  },
  signature: {
    primary: '#0a0a0a',
    secondary: '#1a1a1a',
    accent: '#ffffff',
    textPrimary: '#ffffff',
    textInverse: '#0a0a0a',
  },
};

const BRAND_COLORS = {
  simpleautos: '#ff3600',
  simplepropiedades: '#3232FF',
};

export default {
  async fetch(request: Request, env: { R2: R2Bucket }): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body: OverlayRequest = await request.json();
      const { imageKey, variant, data, width = 1080, height = 1080 } = body;

      // 1. Fetch imagen base desde R2
      const imageObject = await env.R2.get(imageKey);
      if (!imageObject) {
        return new Response('Image not found', { status: 404, headers: corsHeaders });
      }

      const imageBuffer = await imageObject.arrayBuffer();

      // 2. Generar SVG overlay según el variant
      const svgOverlay = generateOverlaySvg(variant, data, width, height);

      // 3. Renderizar SVG a PNG usando resvg
      const resvg = new Resvg(svgOverlay, {
        fitTo: { mode: 'width', value: width },
        font: {
          fontFiles: [], // Usamos fuentes del sistema
          loadSystemFonts: true,
        },
      });
      const overlayPng = resvg.render();

      // 4. Componer imagen base + overlay
      // Nota: Para composición real necesitaríamos una librería de composición
      // Como alternativa, devolvemos el overlay como PNG separado
      // y el cliente hace la composición, o usamos Cloudflare Images con overlays

      // Por ahora, devolvemos el overlay como PNG
      // La composición final se hará en el cliente o mediante Cloudflare Images
      
      return new Response(overlayPng.asPng(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000',
        },
      });

    } catch (error) {
      console.error('Error generating overlay:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

function generateOverlaySvg(
  variant: OverlayVariant, 
  data: OverlayRequest['data'], 
  width: number, 
  height: number
): string {
  const palette = variant === 'essential-watermark' 
    ? COLOR_PALETTES.essential 
    : variant === 'signature-complete' 
      ? COLOR_PALETTES.signature 
      : COLOR_PALETTES.professional;

  const brandColor = BRAND_COLORS[data.brand as keyof typeof BRAND_COLORS] || '#ff3600';

  // Base SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Defs para gradientes y filtros
  svg += `
    <defs>
      <linearGradient id="topBand" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${palette.secondary};stop-opacity:0.96" />
        <stop offset="100%" style="stop-color:${palette.secondary};stop-opacity:0.72" />
      </linearGradient>
      <linearGradient id="bottomBand" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" style="stop-color:${palette.secondary};stop-opacity:0.88" />
        <stop offset="100%" style="stop-color:${palette.secondary};stop-opacity:0" />
      </linearGradient>
    </defs>
  `;

  // Brand watermark (esquina superior izquierda)
  svg += `
    <g transform="translate(30, 30)">
      <rect x="0" y="0" width="120" height="40" rx="8" fill="${brandColor}" opacity="0.9"/>
      <text x="60" y="26" font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
            fill="white" text-anchor="middle">${data.brand === 'simplepropiedades' ? 'SimpleProp' : 'SimpleAutos'}</text>
    </g>
  `;

  // Variantes específicas
  switch (variant) {
    case 'professional-centered':
      svg += generateProfessionalOverlay(data, palette, width, height);
      break;
    case 'signature-complete':
      svg += generateSignatureOverlay(data, palette, width, height, brandColor);
      break;
    case 'property-conversion':
      svg += generatePropertyOverlay(data, palette, width, height, brandColor);
      break;
    default:
      // essential-watermark solo tiene el watermark
      break;
  }

  svg += '</svg>';
  return svg;
}

function generateProfessionalOverlay(
  data: OverlayRequest['data'], 
  palette: typeof COLOR_PALETTES.professional,
  width: number, 
  height: number
): string {
  const bottomY = height - 230;
  
  return `
    <!-- Bottom band -->
    <rect x="0" y="${bottomY}" width="${width}" height="230" fill="url(#bottomBand)"/>
    
    <!-- Price -->
    <text x="50" y="${bottomY + 80}" font-family="Arial, sans-serif" font-size="56" 
          font-weight="800" fill="${palette.textPrimary}">${escapeXml(data.price || '')}</text>
    
    <!-- Title -->
    <text x="50" y="${bottomY + 130}" font-family="Arial, sans-serif" font-size="32" 
          font-weight="600" fill="${palette.textPrimary}">${escapeXml(data.title || '').substring(0, 40)}</text>
    
    <!-- Location -->
    <text x="50" y="${bottomY + 175}" font-family="Arial, sans-serif" font-size="24" 
          fill="${palette.textPrimary}">${escapeXml(data.location || '')}</text>
    
    <!-- Highlights -->
    <text x="50" y="${bottomY + 205}" font-family="Arial, sans-serif" font-size="18" 
          fill="${palette.textPrimary}">${escapeXml(data.highlights?.slice(0, 3).join(' · ') || '')}</text>
  `;
}

function generateSignatureOverlay(
  data: OverlayRequest['data'],
  palette: typeof COLOR_PALETTES.signature,
  width: number,
  height: number,
  brandColor: string
): string {
  const bottomY = height - 250;
  
  return `
    <!-- Dark bottom band -->
    <rect x="0" y="${bottomY}" width="${width}" height="250" fill="${palette.secondary}" opacity="0.92"/>
    
    <!-- Price badge -->
    <rect x="${width - 320}" y="${bottomY + 30}" width="270" height="120" rx="20" fill="${brandColor}"/>
    <text x="${width - 185}" y="${bottomY + 75}" font-family="Arial, sans-serif" font-size="20" 
          font-weight="600" fill="white" text-anchor="middle">Desde</text>
    <text x="${width - 185}" y="${bottomY + 120}" font-family="Arial, sans-serif" font-size="48" 
          font-weight="800" fill="white" text-anchor="middle">${escapeXml(data.price || '')}</text>
    
    <!-- Title -->
    <text x="50" y="${bottomY + 70}" font-family="Arial, sans-serif" font-size="36" 
          font-weight="700" fill="${palette.textPrimary}">${escapeXml(data.title || '').substring(0, 35)}</text>
    
    <!-- Location -->
    <text x="50" y="${bottomY + 115}" font-family="Arial, sans-serif" font-size="24" 
          fill="${palette.textPrimary}">${escapeXml(data.location || '')}</text>
    
    <!-- Highlights -->
    <text x="50" y="${bottomY + 155}" font-family="Arial, sans-serif" font-size="20" 
          fill="${palette.textPrimary}">${escapeXml(data.highlights?.slice(0, 4).join(' · ') || '')}</text>
    
    <!-- Badges -->
    ${data.badges?.map((badge, i) => `
      <rect x="${50 + i * 140}" y="${bottomY + 185}" width="130" height="36" rx="18" 
            fill="none" stroke="${palette.textPrimary}" stroke-width="1.5" opacity="0.7"/>
      <text x="${115 + i * 140}" y="${bottomY + 210}" font-family="Arial, sans-serif" font-size="14" 
            fill="${palette.textPrimary}" text-anchor="middle">${escapeXml(badge)}</text>
    `).join('') || ''}
  `;
}

function generatePropertyOverlay(
  data: OverlayRequest['data'],
  palette: typeof COLOR_PALETTES.professional,
  width: number,
  height: number,
  brandColor: string
): string {
  const bottomY = height - 248;
  const cardWidth = width - 48;
  
  return `
    <!-- Card background -->
    <rect x="24" y="${bottomY}" width="${cardWidth}" height="248" rx="28" fill="white" opacity="0.92"/>
    
    <!-- Price in accent -->
    <text x="50" y="${bottomY + 70}" font-family="Arial, sans-serif" font-size="40" 
          font-weight="700" fill="${brandColor}">${escapeXml(data.price || '')}</text>
    
    <!-- Title -->
    <text x="50" y="${bottomY + 115}" font-family="Arial, sans-serif" font-size="32" 
          font-weight="700" fill="${palette.textPrimary}">${escapeXml(data.title || '').substring(0, 40)}</text>
    
    <!-- Location pill -->
    <rect x="50" y="${bottomY + 140}" width="300" height="44" rx="22" fill="${brandColor}" opacity="0.15"/>
    <text x="70" y="${bottomY + 170}" font-family="Arial, sans-serif" font-size="18" 
          font-weight="600" fill="${brandColor}">${escapeXml(data.location || '')}</text>
    
    <!-- Highlights -->
    <text x="50" y="${bottomY + 210}" font-family="Arial, sans-serif" font-size="18" 
          fill="${palette.textPrimary}">${escapeXml(data.highlights?.slice(0, 3).join(' · ') || '')}</text>
  `;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
