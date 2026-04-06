// Usamos any para el listing ya que viene de diferentes fuentes
export interface ListingData {
  id: string;
  vertical: 'autos' | 'propiedades' | 'agenda';
  title: string;
  price?: number;
  brand?: string;
  model?: string;
  year?: number;
  category?: string;
  condition?: string;
  features?: string[];
  images?: Array<{ url: string }>;
  location?: string;
  description?: string;
}

export interface InstagramTemplate {
  id: string;
  name: string;
  category: 'auto' | 'propiedad' | 'agenda';
  style: 'modern' | 'classic' | 'sport' | 'luxury' | 'minimal';
  layout: 'carousel' | 'single' | 'story';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    title: string;
    subtitle: string;
    price: string;
  };
  elements: TemplateElement[];
}

export interface TemplateElement {
  type: 'title' | 'price' | 'features' | 'contact' | 'logo' | 'badge';
  position: { x: number; y: number; width: number; height: number };
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
  };
  content?: string;
}

export interface SmartTemplateConfig {
  template: InstagramTemplate;
  adaptations: {
    colors: boolean;
    layout: boolean;
    content: boolean;
  };
  score: number; // Qué tan bien se adapta este template al listing
}

// Templates base para diferentes categorías
const BASE_TEMPLATES: Partial<InstagramTemplate>[] = [
  // Autos - Deportivo
  {
    id: 'auto-sport-01',
    name: 'Deportivo Dinámico',
    category: 'auto',
    style: 'sport',
    layout: 'carousel',
    colors: {
      primary: '#FF0000',
      secondary: '#000000',
      accent: '#FFFFFF',
      background: '#1A1A1A'
    },
    elements: [
      {
        type: 'title',
        position: { x: 20, y: 50, width: 280, height: 80 },
        style: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' }
      },
      {
        type: 'price',
        position: { x: 20, y: 150, width: 200, height: 60 },
        style: { fontSize: 28, fontWeight: 'bold', color: '#FF0000' }
      },
      {
        type: 'features',
        position: { x: 20, y: 230, width: 280, height: 120 },
        style: { fontSize: 16, color: '#FFFFFF' }
      }
    ]
  },
  // Autos - Lujo
  {
    id: 'auto-luxury-01',
    name: 'Lujo Elegante',
    category: 'auto',
    style: 'luxury',
    layout: 'single',
    colors: {
      primary: '#D4AF37',
      secondary: '#1C1C1C',
      accent: '#FFFFFF',
      background: '#0A0A0A'
    },
    elements: [
      {
        type: 'title',
        position: { x: 30, y: 60, width: 260, height: 100 },
        style: { fontSize: 36, fontWeight: '300', color: '#D4AF37' }
      },
      {
        type: 'badge',
        position: { x: 30, y: 180, width: 120, height: 40 },
        style: { 
          backgroundColor: '#D4AF37', 
          color: '#000000', 
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 'bold'
        },
        content: 'PREMIUM'
      }
    ]
  },
  // Propiedades - Moderno
  {
    id: 'prop-modern-01',
    name: 'Moderno Minimalista',
    category: 'propiedad',
    style: 'modern',
    layout: 'carousel',
    colors: {
      primary: '#2C3E50',
      secondary: '#ECF0F1',
      accent: '#3498DB',
      background: '#FFFFFF'
    },
    elements: [
      {
        type: 'title',
        position: { x: 25, y: 40, width: 270, height: 80 },
        style: { fontSize: 28, fontWeight: '600', color: '#2C3E50' }
      },
      {
        type: 'price',
        position: { x: 25, y: 140, width: 200, height: 50 },
        style: { fontSize: 24, fontWeight: 'bold', color: '#3498DB' }
      }
    ]
  }
];

// Función para analizar el listing y determinar el mejor template
export function analyzeListingForTemplate(listing: ListingData): SmartTemplateConfig[] {
  const configs: SmartTemplateConfig[] = [];
  
  // Analizar características del listing
  const characteristics = extractListingCharacteristics(listing);
  
  for (const baseTemplate of BASE_TEMPLATES) {
    if (baseTemplate.category !== listing.vertical) continue;
    
    const score = calculateTemplateScore(baseTemplate, characteristics);
    
    configs.push({
      template: baseTemplate as InstagramTemplate,
      adaptations: {
        colors: shouldAdaptColors(baseTemplate, characteristics),
        layout: shouldAdaptLayout(baseTemplate, characteristics),
        content: shouldAdaptContent(baseTemplate, characteristics)
      },
      score
    });
  }
  
  return configs.sort((a, b) => b.score - a.score);
}

function extractListingCharacteristics(listing: ListingData) {
  return {
    price: listing.price || 0,
    category: listing.category || '',
    brand: listing.brand || '',
    year: listing.year || 0,
    condition: listing.condition || '',
    features: listing.features || [],
    images: listing.images?.length || 0,
    location: listing.location || '',
    description: listing.description || ''
  };
}

function calculateTemplateScore(template: Partial<InstagramTemplate>, characteristics: ReturnType<typeof extractListingCharacteristics>): number {
  let score = 50; // Base score
  
  // Adaptación por precio
  if (characteristics.price > 50000 && template.style === 'luxury') {
    score += 30;
  } else if (characteristics.price < 20000 && template.style === 'minimal') {
    score += 25;
  } else if (template.style === 'modern') {
    score += 15;
  }
  
  // Adaptación por categoría
  if (template.category === 'auto') {
    if (characteristics.category?.toLowerCase().includes('sport') && template.style === 'sport') {
      score += 20;
    }
    if (characteristics.brand?.toLowerCase().includes('bmw') && template.style === 'luxury') {
      score += 15;
    }
  }
  
  // Adaptación por número de imágenes
  if (characteristics.images > 3 && template.layout === 'carousel') {
    score += 10;
  } else if (characteristics.images <= 2 && template.layout === 'single') {
    score += 10;
  }
  
  return Math.min(score, 100);
}

function shouldAdaptColors(template: Partial<InstagramTemplate>, characteristics: ReturnType<typeof extractListingCharacteristics>): boolean {
  // Adaptar colores basados en marca o características especiales
  if (template.category === 'auto') {
    const brandColors: Record<string, string> = {
      'bmw': '#0066B1',
      'mercedes': '#C0C0C0',
      'audi': '#D0021B',
      'tesla': '#E82127'
    };
    
    return brandColors[characteristics.brand?.toLowerCase()] !== undefined;
  }
  
  return false;
}

function shouldAdaptLayout(template: Partial<InstagramTemplate>, characteristics: ReturnType<typeof extractListingCharacteristics>): boolean {
  // Adaptar layout basado en cantidad de contenido
  if (characteristics.features?.length > 5) {
    return template.layout !== 'carousel'; // Necesitamos más espacio
  }
  
  return false;
}

function shouldAdaptContent(template: Partial<InstagramTemplate>, characteristics: ReturnType<typeof extractListingCharacteristics>): boolean {
  // Adaptar contenido basado en tipo de propiedad
  return characteristics.description?.length > 200;
}

// Función para generar el template final con adaptaciones
export function generateFinalTemplate(config: SmartTemplateConfig, listing: ListingData): InstagramTemplate {
  const template = { ...config.template };
  
  if (config.adaptations.colors) {
    template.colors = adaptColors(template.colors, listing);
  }
  
  if (config.adaptations.content) {
    template.elements = adaptContent(template.elements, listing);
  }
  
  return template;
}

function adaptColors(colors: InstagramTemplate['colors'], listing: ListingData): InstagramTemplate['colors'] {
  const brandColors: Record<string, string> = {
    'bmw': '#0066B1',
    'mercedes': '#C0C0C0',
    'audi': '#D0021B',
    'tesla': '#E82127',
    'ferrari': '#FF0000',
    'porsche': '#E00E00'
  };
  
  const brandColor = listing.brand?.toLowerCase() ? brandColors[listing.brand.toLowerCase()] : undefined;
  if (brandColor) {
    return {
      ...colors,
      primary: brandColor,
      accent: brandColor
    };
  }
  
  return colors;
}

function adaptContent(elements: TemplateElement[], listing: ListingData): TemplateElement[] {
  return elements.map(element => {
    if (element.type === 'title') {
      return {
        ...element,
        content: generateSmartTitle(listing)
      };
    }
    
    if (element.type === 'features') {
      return {
        ...element,
        content: generateSmartFeatures(listing)
      };
    }
    
    return element;
  });
}

function generateSmartTitle(listing: ListingData): string {
  const brand = listing.brand || '';
  const model = listing.model || '';
  const year = listing.year || '';
  const price = listing.price ? `$${listing.price.toLocaleString()}` : '';
  
  if (brand && model && year) {
    return `${brand} ${model} ${year}\n${price}`;
  }
  
  return listing.title || 'Increíble oportunidad';
}

function generateSmartFeatures(listing: ListingData): string {
  const features = listing.features || [];
  const topFeatures = features.slice(0, 4);
  
  return topFeatures.map((feature: string, index: number) => 
    `✓ ${feature}`
  ).join('\n');
}

// Exportar templates disponibles por categoría
export function getAvailableTemplates(category: 'auto' | 'propiedad' | 'agenda'): InstagramTemplate[] {
  return BASE_TEMPLATES
    .filter(template => template.category === category)
    .map(template => template as InstagramTemplate);
}
