import { AIGeneratedContent, AIPromptConfig } from './ai.js';
import { ListingData } from './templates.js';

export interface ABTestVariant {
  id: string;
  name: string;
  content: AIGeneratedContent;
  config: Partial<AIPromptConfig>;
  testWeight: number; // 0-1, probability of being selected
}

export interface ABTestCampaign {
  id: string;
  listingId: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  targetSampleSize: number;
  currentSampleSize: number;
  confidenceLevel: number; // 0.95 for 95% confidence
  winner?: {
    variantId: string;
    confidence: number;
    improvement: number;
  };
}

export interface ABTestResult {
  variantId: string;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicksToWebsite: number;
  leadsGenerated: number;
  conversionRate: number;
  engagementRate: number;
  statisticalSignificance: boolean;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ABTestInsights {
  winner: ABTestVariant;
  winningMetrics: {
    engagement: number;
    leads: number;
    clicks: number;
  };
  recommendations: string[];
  learnings: string[];
  nextTestSuggestions: string[];
}

// Clase para manejar A/B testing de Instagram
export class InstagramABTestingService {
  
  // Crear una campaña de A/B testing
  static createTestCampaign(
    listingId: string,
    baseContent: AIGeneratedContent,
    variations: Partial<AIPromptConfig>[]
  ): ABTestCampaign {
    
    const variants: ABTestVariant[] = [];
    
    // Variante control (original)
    variants.push({
      id: 'control',
      name: 'Control - Original',
      content: baseContent,
      config: {},
      testWeight: 0.4 // 40% para control
    });
    
    // Crear variantes de prueba
    variations.forEach((config, index) => {
      variants.push({
        id: `variant-${index + 1}`,
        name: `Variante ${index + 1}`,
        content: { ...baseContent }, // Will be updated with AI generation
        config,
        testWeight: 0.6 / variations.length // Distribuir 60% entre variantes
      });
    });
    
    return {
      id: `test-${Date.now()}`,
      listingId,
      name: `A/B Test - ${new Date().toISOString()}`,
      status: 'draft',
      variants,
      startDate: new Date(),
      targetSampleSize: 1000, // 1000 impresiones por variante
      currentSampleSize: 0,
      confidenceLevel: 0.95
    };
  }
  
  // Generar contenido para todas las variantes
  static async generateVariantContent(
    campaign: ABTestCampaign,
    listing: ListingData,
    userHistory?: any[]
  ): Promise<ABTestCampaign> {
    
    const updatedCampaign = { ...campaign };
    
    for (const variant of updatedCampaign.variants) {
      if (variant.id !== 'control') {
        // Generar nuevo contenido con la configuración de la variante
        const { InstagramAIService } = await import('./ai.js');
        variant.content = await InstagramAIService.generateOptimizedCaption(
          listing,
          variant.config,
          userHistory
        );
      }
    }
    
    return updatedCampaign;
  }
  
  // Seleccionar variante para publicación (basado en pesos)
  static selectVariantForPublication(campaign: ABTestCampaign): ABTestVariant {
    if (campaign.status !== 'active') {
      throw new Error('Campaign must be active to select variants');
    }
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const variant of campaign.variants) {
      cumulativeWeight += variant.testWeight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }
    
    // Fallback a la primera variante
    return campaign.variants[0];
  }
  
  // Registrar resultado de una variante
  static recordVariantResult(
    campaign: ABTestCampaign,
    variantId: string,
    result: Partial<ABTestResult>
  ): ABTestCampaign {
    
    const updatedCampaign = { ...campaign };
    
    // En producción, esto se guardaría en base de datos
    // Por ahora, actualizamos el sample size
    updatedCampaign.currentSampleSize += (result.impressions || 0);
    
    return updatedCampaign;
  }
  
  // Analizar resultados y determinar ganador
  static analyzeTestResults(
    campaign: ABTestCampaign,
    results: ABTestResult[]
  ): ABTestInsights {
    
    if (results.length < 2) {
      throw new Error('Need at least 2 variants to analyze results');
    }
    
    // Calcular métricas principales
    const control = results.find(r => r.variantId === 'control');
    const variants = results.filter(r => r.variantId !== 'control');
    
    if (!control) {
      throw new Error('Control variant not found');
    }
    
    // Encontrar mejor variante
    let bestVariant = variants[0];
    let bestScore = this.calculateVariantScore(bestVariant);
    
    for (const variant of variants.slice(1)) {
      const score = this.calculateVariantScore(variant);
      if (score > bestScore) {
        bestVariant = variant;
        bestScore = score;
      }
    }
    
    // Calcular significancia estadística
    const significance = this.calculateStatisticalSignificance(control, bestVariant);
    
    // Generar insights
    const insights = this.generateInsights(control, bestVariant, campaign);
    
    return {
      winner: campaign.variants.find(v => v.id === bestVariant.variantId)!,
      winningMetrics: {
        engagement: bestVariant.engagementRate,
        leads: bestVariant.leadsGenerated,
        clicks: bestVariant.clicksToWebsite
      },
      recommendations: insights.recommendations,
      learnings: insights.learnings,
      nextTestSuggestions: insights.nextTestSuggestions
    };
  }
  
  // Calcular score de variante
  private static calculateVariantScore(result: ABTestResult): number {
    // Ponderación de métricas
    const weights = {
      engagement: 0.3,
      leads: 0.4,
      clicks: 0.2,
      conversion: 0.1
    };
    
    const normalizedEngagement = Math.min(result.engagementRate / 10, 1); // 10% engagement = 100%
    const normalizedLeads = Math.min(result.leadsGenerated / 10, 1); // 10 leads = 100%
    const normalizedClicks = Math.min(result.clicksToWebsite / 100, 1); // 100 clicks = 100%
    const normalizedConversion = Math.min(result.conversionRate / 5, 1); // 5% conversion = 100%
    
    return (
      normalizedEngagement * weights.engagement +
      normalizedLeads * weights.leads +
      normalizedClicks * weights.clicks +
      normalizedConversion * weights.conversion
    ) * 100;
  }
  
  // Calcular significancia estadística
  private static calculateStatisticalSignificance(
    control: ABTestResult,
    variant: ABTestResult
  ): boolean {
    
    // Test chi-cuadrado simplificado para tasas de conversión
    const controlRate = control.conversionRate;
    const variantRate = variant.conversionRate;
    
    const pooledRate = (control.leadsGenerated + variant.leadsGenerated) / 
                     (control.impressions + variant.impressions);
    
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * 
      (1/control.impressions + 1/variant.impressions)
    );
    
    const zScore = Math.abs(variantRate - controlRate) / standardError;
    
    // Z-score > 1.96 para 95% confidence
    return zScore > 1.96;
  }
  
  // Generar insights y recomendaciones
  private static generateInsights(
    control: ABTestResult,
    variant: ABTestResult,
    campaign: ABTestCampaign
  ): {
    recommendations: string[];
    learnings: string[];
    nextTestSuggestions: string[];
  } {
    
    const recommendations: string[] = [];
    const learnings: string[] = [];
    const nextTestSuggestions: string[] = [];
    
    // Análisis de engagement
    const engagementImprovement = ((variant.engagementRate - control.engagementRate) / control.engagementRate) * 100;
    
    if (engagementImprovement > 20) {
      recommendations.push(`La variante ganadora mejora el engagement en ${engagementImprovement.toFixed(1)}%. Adoptar este estilo.`);
      learnings.push('El tono y estilo de la variante resuenan mejor con la audiencia.');
    } else if (engagementImprovement < -10) {
      recommendations.push('Evitar este estilo de contenido para futuras publicaciones.');
      learnings.push('Este enfoque no funciona bien con nuestra audiencia.');
    }
    
    // Análisis de leads
    const leadsImprovement = ((variant.leadsGenerated - control.leadsGenerated) / Math.max(control.leadsGenerated, 1)) * 100;
    
    if (leadsImprovement > 30) {
      recommendations.push(`Incremento de ${leadsImprovement.toFixed(1)}% en leads generados. Priorizar este llamado a la acción.`);
      learnings.push('El llamado a la acción es más efectivo para generar conversiones.');
    }
    
    // Análisis de clicks
    const clicksImprovement = ((variant.clicksToWebsite - control.clicksToWebsite) / Math.max(control.clicksToWebsite, 1)) * 100;
    
    if (clicksImprovement > 25) {
      recommendations.push(`Mejora del ${clicksImprovement.toFixed(1)}% en clics al sitio web.`);
      learnings.push('El contenido motiva mejor a los usuarios a visitar el sitio.');
    }
    
    // Sugerencias para siguientes tests
    const variantConfig = campaign.variants.find(v => v.id === variant.variantId)?.config;
    
    if (variantConfig?.tone) {
      nextTestSuggestions.push(`Probar diferentes tonos similares a "${variantConfig.tone}"`);
    }
    
    if (variantConfig?.includeEmojis !== undefined) {
      nextTestSuggestions.push(`Testar cantidad y tipo de emojis (actual: ${variantConfig.includeEmojis})`);
    }
    
    if (variantConfig?.maxLength) {
      nextTestSuggestions.push(`Experimentar con longitud de caption alrededor de ${variantConfig.maxLength} caracteres`);
    }
    
    nextTestSuggestions.push('Testar diferentes combinaciones de hashtags');
    nextTestSuggestions.push('Provar distintos llamados a la acción');
    nextTestSuggestions.push('Experimentar con horarios de publicación');
    
    return {
      recommendations,
      learnings,
      nextTestSuggestions
    };
  }
  
  // Crear tests automáticos basados en mejores prácticas
  static createRecommendedTests(baseContent: AIGeneratedContent): Partial<AIPromptConfig>[] {
    
    const tests: Partial<AIPromptConfig>[] = [];
    
    // Test 1: Diferente tono
    if (baseContent.tone === 'professional') {
      tests.push({ tone: 'casual' });
      tests.push({ tone: 'excited' });
    } else if (baseContent.tone === 'casual') {
      tests.push({ tone: 'professional' });
      tests.push({ tone: 'luxury' });
    }
    
    // Test 2: Con/sin emojis
    tests.push({ includeEmojis: !baseContent.emojiSet || baseContent.emojiSet.length === 0 });
    
    // Test 3: Diferente longitud
    const currentLength = baseContent.caption.length;
    if (currentLength < 500) {
      tests.push({ maxLength: 1000 });
    } else if (currentLength > 1500) {
      tests.push({ maxLength: 800 });
    }
    
    // Test 4: Diferente enfoque
    tests.push({ focusOn: 'value' });
    tests.push({ focusOn: 'luxury' });
    
    return tests.slice(0, 3); // Limitar a 3 tests para no abrumar
  }
  
  // Simular resultados (para desarrollo/pruebas)
  static simulateTestResults(campaign: ABTestCampaign): ABTestResult[] {
    
    return campaign.variants.map(variant => {
      const baseImpressions = Math.floor(Math.random() * 500) + 500;
      const baseEngagement = Math.random() * 5 + 1; // 1-6%
      
      // Control tiene rendimiento base
      const multiplier = variant.id === 'control' ? 1 : (Math.random() * 0.4 + 0.8); // 0.8-1.2x
      
      return {
        variantId: variant.id,
        impressions: baseImpressions,
        engagement: Math.floor(baseImpressions * baseEngagement * multiplier),
        likes: Math.floor(baseImpressions * 0.02 * multiplier),
        comments: Math.floor(baseImpressions * 0.005 * multiplier),
        shares: Math.floor(baseImpressions * 0.003 * multiplier),
        saves: Math.floor(baseImpressions * 0.008 * multiplier),
        clicksToWebsite: Math.floor(baseImpressions * 0.015 * multiplier),
        leadsGenerated: Math.floor(baseImpressions * 0.002 * multiplier),
        conversionRate: (baseImpressions * 0.002 * multiplier) / baseImpressions * 100,
        engagementRate: baseEngagement * multiplier,
        statisticalSignificance: false,
        confidenceInterval: {
          lower: baseEngagement * multiplier * 0.8,
          upper: baseEngagement * multiplier * 1.2
        }
      };
    });
  }
  
  // Obtener estado actual del test
  static getTestStatus(campaign: ABTestCampaign): {
    progress: number; // 0-100
    estimatedCompletion: Date;
    isStatisticallySignificant: boolean;
    currentWinner?: string;
  } {
    
    const progress = Math.min((campaign.currentSampleSize / (campaign.targetSampleSize * campaign.variants.length)) * 100, 100);
    
    const estimatedDaysRemaining = Math.ceil(
      ((campaign.targetSampleSize * campaign.variants.length) - campaign.currentSampleSize) / 100 // 100 impresiones por día estimadas
    );
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDaysRemaining);
    
    // Simular significancia (en producción sería cálculo real)
    const isStatisticallySignificant = progress > 60; // Significativo después de 60%
    
    let currentWinner: string | undefined;
    if (isStatisticallySignificant) {
      // Simular winner (en producción basado en resultados reales)
      currentWinner = campaign.variants[Math.floor(Math.random() * campaign.variants.length)].id;
    }
    
    return {
      progress,
      estimatedCompletion,
      isStatisticallySignificant,
      currentWinner
    };
  }
}
