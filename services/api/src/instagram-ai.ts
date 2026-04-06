import { ListingData } from './instagram-templates.js';

export interface AIGeneratedContent {
  caption: string;
  hashtags: string[];
  callToAction: string;
  emojiSet: string[];
  tone: 'professional' | 'casual' | 'excited' | 'luxury' | 'urgent';
  targetAudience: string;
  predictedEngagement: number; // 0-100
}

export interface AIPromptConfig {
  tone: 'professional' | 'casual' | 'excited' | 'luxury' | 'urgent';
  targetAudience: 'young' | 'professional' | 'investors' | 'families' | 'general';
  includeFeatures: boolean;
  includePrice: boolean;
  includeLocation: boolean;
  maxLength: number;
  includeEmojis: boolean;
  focusOn: 'speed' | 'luxury' | 'value' | 'reliability' | 'innovation';
}

// Clase principal para generación de contenido con IA
export class InstagramAIService {
  
  // Generar caption completo con IA
  static async generateOptimizedCaption(
    listing: ListingData, 
    config: Partial<AIPromptConfig> = {},
    userHistory?: any[]
  ): Promise<AIGeneratedContent> {
    
    const finalConfig = this.buildOptimalConfig(listing, config, userHistory);
    const baseCaption = this.generateBaseCaption(listing, finalConfig);
    const optimizedCaption = this.optimizeCaption(baseCaption, finalConfig);
    const hashtags = this.generateSmartHashtags(listing, userHistory);
    const callToAction = this.generateCallToAction(listing, finalConfig);
    const emojis = this.selectEmojis(finalConfig.tone, listing.vertical);
    
    const fullCaption = this.assembleFullCaption(optimizedCaption, hashtags, callToAction, emojis, finalConfig);
    
    return {
      caption: fullCaption,
      hashtags,
      callToAction,
      emojiSet: emojis,
      tone: finalConfig.tone,
      targetAudience: finalConfig.targetAudience,
      predictedEngagement: this.predictEngagement(fullCaption, hashtags, finalConfig)
    };
  }
  
  // Construir configuración óptima
  private static buildOptimalConfig(
    listing: ListingData, 
    userConfig: Partial<AIPromptConfig>,
    userHistory?: any[]
  ): AIPromptConfig {
    
    let baseConfig: AIPromptConfig = {
      tone: 'professional',
      targetAudience: 'general',
      includeFeatures: true,
      includePrice: true,
      includeLocation: true,
      maxLength: 2200,
      includeEmojis: true,
      focusOn: 'value'
    };
    
    // Adaptar según precio
    if (listing.price && listing.price > 50000) {
      baseConfig.tone = 'luxury';
      baseConfig.targetAudience = 'investors';
      baseConfig.focusOn = 'luxury';
    } else if (listing.price && listing.price < 20000) {
      baseConfig.tone = 'excited';
      baseConfig.targetAudience = 'young';
      baseConfig.focusOn = 'value';
    }
    
    // Adaptar según categoría
    if (listing.vertical === 'autos') {
      if (listing.category?.toLowerCase().includes('sport')) {
        baseConfig.tone = 'excited';
        baseConfig.focusOn = 'speed';
      } else if (listing.brand?.toLowerCase().includes('bmw') || listing.brand?.toLowerCase().includes('mercedes')) {
        baseConfig.tone = 'luxury';
        baseConfig.focusOn = 'luxury';
      }
    } else if (listing.vertical === 'propiedades') {
      if (listing.price && listing.price > 200000) {
        baseConfig.tone = 'luxury';
        baseConfig.targetAudience = 'investors';
      } else {
        baseConfig.targetAudience = 'families';
      }
    }
    
    return { ...baseConfig, ...userConfig };
  }
  
  // Generar caption base
  private static generateBaseCaption(listing: ListingData, config: AIPromptConfig): string {
    const parts: string[] = [];
    
    // Opening hook
    parts.push(this.generateOpeningHook(listing, config));
    
    // Descripción principal
    parts.push(this.generateMainDescription(listing, config));
    
    // Características
    if (config.includeFeatures && listing.features && listing.features.length > 0) {
      parts.push(this.generateFeaturesSection(listing.features, config));
    }
    
    // Precio
    if (config.includePrice && listing.price) {
      parts.push(this.generatePriceSection(listing.price, config));
    }
    
    // Ubicación
    if (config.includeLocation && listing.location) {
      parts.push(this.generateLocationSection(listing.location, config));
    }
    
    return parts.join('\n\n');
  }
  
  // Generar opening hook
  private static generateOpeningHook(listing: ListingData, config: AIPromptConfig): string {
    const hooks: Record<string, Record<string, string>> = {
      professional: {
        auto: `🚗 ${listing.brand || 'Excelente'} ${listing.model || 'vehículo'} en excelentes condiciones`,
        propiedad: `🏠 Oportunidad única en el mercado inmobiliario`,
        agenda: `📅 Servicio profesional de alta calidad`
      },
      casual: {
        auto: `🔥 ¿Buscando tu próximo auto? ¡Mira esta joya!`,
        propiedad: `✨ Tu hogar ideal está aquí`,
        agenda: `💪 Listo para llevar tu proyecto al siguiente nivel`
      },
      excited: {
        auto: `🚀 ¡NO TE PIERDAS ESTA OPORTUNIDAD! Auto increíble`,
        propiedad: `🎯 ¡LA PROPIEDAD QUE ESTABAS ESPERANDO!`,
        agenda: `⚡ ¡SERVICIO QUE CAMBIARÁ TODO!`
      },
      luxury: {
        auto: `✨ Exclusividad y elegancia se encuentran en esta pieza única`,
        propiedad: `🏰 Lujo y sofisticación en cada detalle`,
        agenda: `🎭 Experiencia premium para clientes exigentes`
      },
      urgent: {
        auto: `⏰ ¡ÚLTIMA OPORTUNIDAD! No durará mucho`,
        propiedad: `🔥 ¡SE VENDE RÁPIDO! Actúa ahora`,
        agenda: `📢 ¡CUPOS LIMITADOS! Reserva ya`
      }
    };
    
    return hooks[config.tone]?.[listing.vertical] || hooks.professional.auto;
  }
  
  // Generar descripción principal
  private static generateMainDescription(listing: ListingData, config: AIPromptConfig): string {
    if (listing.vertical === 'autos') {
      return this.generateAutoDescription(listing, config);
    } else if (listing.vertical === 'propiedades') {
      return this.generatePropiedadDescription(listing, config);
    } else {
      return this.generateAgendaDescription(listing, config);
    }
  }
  
  private static generateAutoDescription(listing: ListingData, config: AIPromptConfig): string {
    const parts: string[] = [];
    
    if (listing.year) {
      parts.push(`Modelo ${listing.year}`);
    }
    
    if (listing.condition) {
      parts.push(`Condición: ${listing.condition}`);
    }
    
    if (listing.description) {
      parts.push(listing.description);
    }
    
    const benefits: Record<string, string> = {
      speed: 'Experimenta la adrenalina de una potencia excepcional',
      luxury: 'Disfruta del estatus y confort que mereces',
      value: 'La mejor relación calidad-precio del mercado',
      reliability: 'Tranquilidad y seguridad en cada kilómetro',
      innovation: 'Tecnología de vanguardia a tu disposición'
    };
    
    parts.push(benefits[config.focusOn]);
    
    return parts.join(' • ');
  }
  
  private static generatePropiedadDescription(listing: ListingData, config: AIPromptConfig): string {
    const parts: string[] = [];
    
    if (listing.description) {
      parts.push(listing.description);
    }
    
    const benefits: Record<string, string> = {
      families: 'Espacio perfecto para crear recuerdos inolvidables',
      investors: 'Excelente oportunidad de inversión con alto potencial',
      young: 'Tu primer hogar o una inversion inteligente',
      professional: 'Ubicación privilegiada para profesionales',
      general: 'Propiedad versátil que se adapta a tus necesidades'
    };
    
    parts.push(benefits[config.targetAudience]);
    
    return parts.join(' • ');
  }
  
  private static generateAgendaDescription(listing: ListingData, config: AIPromptConfig): string {
    const parts: string[] = [];
    
    if (listing.description) {
      parts.push(listing.description);
    }
    
    parts.push('Servicio profesional con resultados garantizados');
    
    return parts.join(' • ');
  }
  
  // Generar sección de características
  private static generateFeaturesSection(features: string[], config: AIPromptConfig): string {
    const topFeatures = features.slice(0, 5);
    const featureIcons: Record<string, string> = {
      professional: '✓',
      casual: '👉',
      excited: '🔥',
      luxury: '✨',
      urgent: '⚡'
    };
    
    const icon = featureIcons[config.tone];
    
    return `Características destacadas:\n${topFeatures.map(f => `${icon} ${f}`).join('\n')}`;
  }
  
  // Generar sección de precio
  private static generatePriceSection(price: number, config: AIPromptConfig): string {
    const formattedPrice = `$${price.toLocaleString()}`;
    
    const priceMessages: Record<string, string> = {
      professional: `Precio: ${formattedPrice}`,
      casual: `¡Solo ${formattedPrice}!`,
      excited: `🎯 PREMIO ESPECIAL: ${formattedPrice}`,
      luxury: `Valor exclusivo: ${formattedPrice}`,
      urgent: `⚠️ ÚLTIMO PRECIO: ${formattedPrice}`
    };
    
    return priceMessages[config.tone];
  }
  
  // Generar sección de ubicación
  private static generateLocationSection(location: string, config: AIPromptConfig): string {
    const locationMessages: Record<string, string> = {
      professional: `Ubicación: ${location}`,
      casual: `📍 ${location}`,
      excited: `🔥 EN ${location.toUpperCase()}!`,
      luxury: `🌟 Zona exclusiva: ${location}`,
      urgent: `⏰ ¡EN ${location}!`
    };
    
    return locationMessages[config.tone];
  }
  
  // Optimizar caption
  private static optimizeCaption(caption: string, config: AIPromptConfig): string {
    let optimized = caption;
    
    // Ajustar longitud
    if (optimized.length > config.maxLength) {
      optimized = optimized.substring(0, config.maxLength - 3) + '...';
    }
    
    return optimized;
  }
  
  // Generar hashtags inteligentes
  private static generateSmartHashtags(listing: ListingData, userHistory?: any[]): string[] {
    const baseHashtags = this.getBaseHashtags(listing);
    const trendingHashtags = this.getTrendingHashtags(listing.vertical);
    
    const allHashtags = [...baseHashtags, ...trendingHashtags];
    
    return [...new Set(allHashtags)].slice(0, 30);
  }
  
  private static getBaseHashtags(listing: ListingData): string[] {
    const hashtags: string[] = [];
    
    if (listing.vertical === 'autos') {
      hashtags.push(
        '#autos', '#carros', '#vehiculos', '#motor',
        `#${listing.brand?.toLowerCase() || 'carro'}`,
        listing.year ? `#${listing.year}` : '',
        '#venta', '#oportunidad'
      );
    } else if (listing.vertical === 'propiedades') {
      hashtags.push(
        '#inmobiliaria', '#propiedades', '#casas', '#departamentos',
        '#realestate', '#hogar', '#venta',
        listing.location ? `#${listing.location.toLowerCase().replace(/\s+/g, '')}` : ''
      );
    } else if (listing.vertical === 'agenda') {
      hashtags.push(
        '#servicios', '#profesionales', '#negocios', '#consultoria',
        '#citas', '#agenda', '#clientes'
      );
    }
    
    return hashtags.filter(h => h !== '');
  }
  
  private static getTrendingHashtags(vertical: string): string[] {
    const trending: Record<string, string[]> = {
      autos: ['#carrosusados', '#seminuevos', '#luxury', '#sportcars', '#tuning'],
      propiedades: ['#inversion', '#propiedadesenventa', '#casadream', '#inmobiliariamoderna'],
      agenda: ['#citas', '#servicios', '#profesionales', '#negocios', '#consultoria']
    };
    
    return trending[vertical] || [];
  }
  
  // Generar llamado a la acción
  private static generateCallToAction(listing: ListingData, config: AIPromptConfig): string {
    const ctas: Record<string, Record<string, string>> = {
      professional: {
        auto: 'Contáctanos para más información o agendar una prueba de manejo.',
        propiedad: 'Agenda una visita y descubre tu próximo hogar.',
        agenda: 'Reserva tu cita ahora y transforma tus proyectos.'
      },
      casual: {
        auto: '¿Te gusta? ¡Escríbenos y coordinamos!',
        propiedad: '¡Ven a conocerla! Estamos para recibiros.',
        agenda: '¡Hablemos! Deja un mensaje y te contactamos.'
      },
      excited: {
        auto: '¡NO ESPERES MÁS! Este auto puede ser tuyo hoy.',
        propiedad: '¡ACTÚA AHORA! Esta oportunidad no se repetirá.',
        agenda: '¡RESERVA YA! Transforma tu futuro hoy mismo.'
      },
      luxury: {
        auto: 'Experimenta la exclusividad. Solicita una cita privada.',
        propiedad: 'Descubre el lujo hecho hogar. Visita exclusiva disponible.',
        agenda: 'Servicio premium para clientes excepcionales. Contáctanos.'
      },
      urgent: {
        auto: '¡ÚLTIMAS UNIDADES! Llama ahora antes de que se venda.',
        propiedad: '¡SE VENDE RÁPIDO! No te quedes sin visitar.',
        agenda: '¡CUPOS CERRÁNDOSE! Reserva tu lugar inmediatamente.'
      }
    };
    
    return ctas[config.tone]?.[listing.vertical] || ctas.professional.auto;
  }
  
  // Seleccionar emojis
  private static selectEmojis(tone: AIPromptConfig['tone'], vertical: string): string[] {
    const emojiSets: Record<string, Record<string, string[]>> = {
      professional: {
        auto: ['🚗', '✓', '📞', '📍'],
        propiedad: ['🏠', '✓', '📞', '📍'],
        agenda: ['📅', '✓', '📞', '💼']
      },
      casual: {
        auto: ['👍', '😊', '🔥', '✨'],
        propiedad: ['👍', '😊', '🔥', '✨'],
        agenda: ['👍', '😊', '🔥', '✨']
      },
      excited: {
        auto: ['🚀', '🔥', '⚡', '🎯'],
        propiedad: ['🚀', '🔥', '⚡', '🎯'],
        agenda: ['🚀', '🔥', '⚡', '🎯']
      },
      luxury: {
        auto: ['✨', '🏆', '💎', '🌟'],
        propiedad: ['✨', '🏆', '💎', '🌟'],
        agenda: ['✨', '🏆', '💎', '🌟']
      },
      urgent: {
        auto: ['⏰', '⚠️', '🔥', '📢'],
        propiedad: ['⏰', '⚠️', '🔥', '📢'],
        agenda: ['⏰', '⚠️', '🔥', '📢']
      }
    };
    
    return emojiSets[tone]?.[vertical] || emojiSets.professional.auto;
  }
  
  // Ensamblar caption completo
  private static assembleFullCaption(
    caption: string,
    hashtags: string[],
    callToAction: string,
    emojis: string[],
    config: AIPromptConfig
  ): string {
    const parts: string[] = [];
    
    parts.push(caption);
    parts.push('');
    parts.push(callToAction);
    parts.push('');
    parts.push(hashtags.join(' '));
    
    return parts.join('\n');
  }
  
  // Predecir engagement
  private static predictEngagement(caption: string, hashtags: string[], config: AIPromptConfig): number {
    let score = 50;
    
    if (caption.length > 100 && caption.length < 2000) {
      score += 10;
    }
    
    if (hashtags.length >= 15 && hashtags.length <= 30) {
      score += 10;
    }
    
    if (config.includeEmojis && caption.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu)) {
      score += 5;
    }
    
    if (caption.toLowerCase().includes('contáctanos') || caption.toLowerCase().includes('agenda')) {
      score += 10;
    }
    
    if (config.tone === 'excited' || config.tone === 'luxury') {
      score += 5;
    }
    
    return Math.min(100, score);
  }
}
