export interface InstagramAnalytics {
  id: string;
  publicationId: string;
  listingId: string;
  userId: string;
  vertical: 'autos' | 'propiedades' | 'agenda';
  
  // Métricas de Instagram
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  
  // Métricas de negocio
  clicksToWebsite: number;
  leadsGenerated: number;
  inquiries: number;
  
  // Timing data
  publishedAt: Date;
  lastAnalyzedAt: Date;
  
  // Hashtag performance
  hashtagPerformance: Record<string, {
    reach: number;
    engagement: number;
    clicks: number;
  }>;
  
  // Content performance
  contentType: 'carousel' | 'single' | 'reel' | 'story';
  captionLength: number;
  hasCallToAction: boolean;
  bestPostingTime?: Date;
  
  // Comparative data
  avgPerformanceForSimilar: number;
  performanceScore: number; // 0-100
}

export interface InstagramAnalyticsSummary {
  totalPublications: number;
  avgEngagement: number;
  avgReach: number;
  totalLeads: number;
  bestPerformingPost: {
    publicationId: string;
    engagement: number;
    listingTitle: string;
  };
  worstPerformingPost: {
    publicationId: string;
    engagement: number;
    listingTitle: string;
  };
  topHashtags: Array<{
    hashtag: string;
    avgReach: number;
    usageCount: number;
  }>;
  bestPostingTimes: Array<{
    hour: number;
    day: string;
    avgEngagement: number;
  }>;
  trends: {
    engagementTrend: 'up' | 'down' | 'stable';
    leadTrend: 'up' | 'down' | 'stable';
    reachTrend: 'up' | 'down' | 'stable';
  };
}

export interface InstagramInsights {
  recommendations: string[];
  optimizations: Array<{
    type: 'hashtag' | 'timing' | 'content' | 'caption';
    suggestion: string;
    potentialImpact: 'high' | 'medium' | 'low';
    implementation: string;
  }>;
  competitorInsights?: {
    avgEngagement: number;
    topHashtags: string[];
    postingFrequency: number;
  };
}

// Clase para manejar analytics de Instagram
export class InstagramAnalyticsService {
  
  // Calcular métricas de engagement
  static calculateEngagement(analytics: InstagramAnalytics): number {
    const totalInteractions = analytics.likes + analytics.comments + analytics.shares + analytics.saves;
    return analytics.reach > 0 ? (totalInteractions / analytics.reach) * 100 : 0;
  }
  
  // Calcular score de performance (0-100)
  static calculatePerformanceScore(analytics: InstagramAnalytics, similarPosts: InstagramAnalytics[]): number {
    const engagement = this.calculateEngagement(analytics);
    const avgEngagement = similarPosts.reduce((sum, post) => sum + this.calculateEngagement(post), 0) / similarPosts.length;
    
    let score = 50; // Base score
    
    // Engagement vs average
    if (engagement > avgEngagement * 1.5) score += 30;
    else if (engagement > avgEngagement) score += 15;
    else if (engagement < avgEngagement * 0.5) score -= 20;
    
    // Lead generation
    if (analytics.leadsGenerated > 0) score += 20;
    
    // Clicks to website
    if (analytics.clicksToWebsite > analytics.reach * 0.02) score += 10; // 2% CTR is good
    
    // Content type bonus
    if (analytics.contentType === 'carousel' && analytics.impressions > 1000) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Analizar hashtags performance
  static analyzeHashtagPerformance(publications: InstagramAnalytics[]): Record<string, any> {
    const hashtagStats: Record<string, {
      totalReach: number;
      totalEngagement: number;
      totalClicks: number;
      usageCount: number;
      avgEngagement: number;
      avgReach: number;
    }> = {};
    
    publications.forEach(pub => {
      Object.entries(pub.hashtagPerformance).forEach(([hashtag, stats]) => {
        if (!hashtagStats[hashtag]) {
          hashtagStats[hashtag] = {
            totalReach: 0,
            totalEngagement: 0,
            totalClicks: 0,
            usageCount: 0,
            avgEngagement: 0,
            avgReach: 0
          };
        }
        
        hashtagStats[hashtag].totalReach += stats.reach;
        hashtagStats[hashtag].totalEngagement += stats.engagement;
        hashtagStats[hashtag].totalClicks += stats.clicks;
        hashtagStats[hashtag].usageCount++;
      });
    });
    
    // Calculate averages
    Object.keys(hashtagStats).forEach(hashtag => {
      const stats = hashtagStats[hashtag];
      stats.avgEngagement = stats.totalEngagement / stats.usageCount;
      stats.avgReach = stats.totalReach / stats.usageCount;
    });
    
    return hashtagStats;
  }
  
  // Encontrar mejores momentos para publicar
  static findBestPostingTimes(publications: InstagramAnalytics[]): Array<{hour: number; day: string; avgEngagement: number}> {
    const timeStats: Record<string, { totalEngagement: number; count: number }> = {};
    
    publications.forEach(pub => {
      const date = new Date(pub.publishedAt);
      const hour = date.getHours();
      const day = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const key = `${hour}-${day}`;
      
      if (!timeStats[key]) {
        timeStats[key] = { totalEngagement: 0, count: 0 };
      }
      
      timeStats[key].totalEngagement += this.calculateEngagement(pub);
      timeStats[key].count++;
    });
    
    // Convert to array and calculate averages
    const results = Object.entries(timeStats).map(([key, stats]) => {
      const [hour, day] = key.split('-');
      return {
        hour: parseInt(hour),
        day,
        avgEngagement: stats.totalEngagement / stats.count
      };
    });
    
    return results.sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 5);
  }
  
  // Generar resumen analytics
  static generateSummary(publications: InstagramAnalytics[]): InstagramAnalyticsSummary {
    if (publications.length === 0) {
      throw new Error('No publications to analyze');
    }
    
    const totalPublications = publications.length;
    const avgEngagement = publications.reduce((sum, pub) => sum + this.calculateEngagement(pub), 0) / totalPublications;
    const avgReach = publications.reduce((sum, pub) => sum + pub.reach, 0) / totalPublications;
    const totalLeads = publications.reduce((sum, pub) => sum + pub.leadsGenerated, 0);
    
    // Best and worst performing posts
    const sortedByEngagement = publications.sort((a, b) => this.calculateEngagement(b) - this.calculateEngagement(a));
    const bestPost = sortedByEngagement[0];
    const worstPost = sortedByEngagement[sortedByEngagement.length - 1];
    
    // Top hashtags
    const hashtagStats = this.analyzeHashtagPerformance(publications);
    const topHashtags = Object.entries(hashtagStats)
      .map(([hashtag, stats]) => ({
        hashtag,
        avgReach: stats.avgReach,
        usageCount: stats.usageCount
      }))
      .sort((a, b) => b.avgReach - a.avgReach)
      .slice(0, 10);
    
    // Best posting times
    const bestPostingTimes = this.findBestPostingTimes(publications);
    
    // Calculate trends (simplified)
    const recent = publications.slice(-10);
    const older = publications.slice(0, 10);
    
    const recentAvgEngagement = recent.reduce((sum, pub) => sum + this.calculateEngagement(pub), 0) / recent.length;
    const olderAvgEngagement = older.reduce((sum, pub) => sum + this.calculateEngagement(pub), 0) / older.length;
    
    const engagementTrend = recentAvgEngagement > olderAvgEngagement * 1.1 ? 'up' : 
                           recentAvgEngagement < olderAvgEngagement * 0.9 ? 'down' : 'stable';
    
    return {
      totalPublications,
      avgEngagement,
      avgReach,
      totalLeads,
      bestPerformingPost: {
        publicationId: bestPost.id,
        engagement: this.calculateEngagement(bestPost),
        listingTitle: `Listing ${bestPost.listingId}` // Would need to fetch actual title
      },
      worstPerformingPost: {
        publicationId: worstPost.id,
        engagement: this.calculateEngagement(worstPost),
        listingTitle: `Listing ${worstPost.listingId}`
      },
      topHashtags,
      bestPostingTimes,
      trends: {
        engagementTrend,
        leadTrend: 'stable', // Would need more complex analysis
        reachTrend: 'stable'
      }
    };
  }
  
  // Generar insights y recomendaciones
  static generateInsights(publications: InstagramAnalytics[], summary: InstagramAnalyticsSummary): InstagramInsights {
    const recommendations: string[] = [];
    const optimizations: InstagramInsights['optimizations'] = [];
    
    // Análisis de engagement
    if (summary.avgEngagement < 2) {
      recommendations.push('Tu engagement está por debajo del promedio. Considera usar más hashtags y llamados a la acción claros.');
      optimizations.push({
        type: 'hashtag',
        suggestion: 'Usa hashtags de nicho con menos competencia pero más alcance',
        potentialImpact: 'high',
        implementation: 'Investiga hashtags usados por competidores exitosos y combina populares con específicos'
      });
    }
    
    // Análisis de timing
    if (summary.bestPostingTimes.length > 0) {
      const bestTime = summary.bestPostingTimes[0];
      recommendations.push(`Publica principalmente los ${bestTime.day} a las ${bestTime.hour}:00 para mayor alcance.`);
      optimizations.push({
        type: 'timing',
        suggestion: `Programa publicaciones para ${bestTime.day} ${bestTime.hour}:00`,
        potentialImpact: 'medium',
        implementation: 'Usa el scheduler automático para publicar en los horarios óptimos'
      });
    }
    
    // Análisis de contenido
    const carouselPosts = publications.filter(p => p.contentType === 'carousel');
    const carouselAvgEngagement = carouselPosts.length > 0 ? 
      carouselPosts.reduce((sum, p) => sum + this.calculateEngagement(p), 0) / carouselPosts.length : 0;
    
    if (carouselAvgEngagement > summary.avgEngagement * 1.2) {
      recommendations.push('Tus carruseles tienen mejor rendimiento. Úsalos cuando tengas múltiples fotos.');
      optimizations.push({
        type: 'content',
        suggestion: 'Prioriza carruseles sobre publicaciones individuales',
        potentialImpact: 'medium',
        implementation: 'Crea carruseles con 3-5 imágenes mostrando diferentes ángulos'
      });
    }
    
    // Análisis de hashtags
    if (summary.topHashtags.length > 0) {
      const topHashtag = summary.topHashtags[0];
      if (topHashtag.usageCount < publications.length * 0.3) {
        recommendations.push(`El hashtag #${topHashtag.hashtag} funciona bien pero lo usas poco. Considéralo más frecuentemente.`);
        optimizations.push({
          type: 'hashtag',
          suggestion: `Usar más frecuentemente #${topHashtag.hashtag}`,
          potentialImpact: 'medium',
          implementation: 'Incluir este hashtag en el 80% de tus publicaciones'
        });
      }
    }
    
    // Análisis de captions
    const longCaptions = publications.filter(p => p.captionLength > 200);
    const longCaptionAvgEngagement = longCaptions.length > 0 ?
      longCaptions.reduce((sum, p) => sum + this.calculateEngagement(p), 0) / longCaptions.length : 0;
    
    if (longCaptionAvgEngagement > summary.avgEngagement * 1.3) {
      recommendations.push('Tus captions largos funcionan mejor. Crea historias más detalladas.');
      optimizations.push({
        type: 'caption',
        suggestion: 'Escribir captions más largos y descriptivos',
        potentialImpact: 'medium',
        implementation: 'Incluye más detalles sobre características, beneficios y llamados a la acción'
      });
    }
    
    return {
      recommendations,
      optimizations
    };
  }
  
  // Predecir mejor momento para publicar
  static predictBestPostingTime(userPublications: InstagramAnalytics[], similarUsersPublications: InstagramAnalytics[]): Date {
    const allPublications = [...userPublications, ...similarUsersPublications];
    const bestTimes = this.findBestPostingTimes(allPublications);
    
    if (bestTimes.length === 0) {
      // Default to next business day at 6 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      return tomorrow;
    }
    
    const bestTime = bestTimes[0];
    const now = new Date();
    
    // Find next occurrence of this day/time
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const targetDayIndex = daysOfWeek.indexOf(bestTime.day.toLowerCase());
    
    const nextDate = new Date(now);
    const currentDayIndex = now.getDay();
    
    let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
    if (daysToAdd === 0 && now.getHours() > bestTime.hour) {
      daysToAdd = 7; // Next week if time has passed
    }
    
    nextDate.setDate(now.getDate() + daysToAdd);
    nextDate.setHours(bestTime.hour, 0, 0, 0);
    
    return nextDate;
  }
  
  // Sugerir hashtags optimizados
  static suggestOptimalHashtags(listing: any, userHistory: InstagramAnalytics[], topPerforming: InstagramAnalytics[]): string[] {
    const baseHashtags = this.getBaseHashtags(listing);
    const trendingHashtags = this.getTrendingHashtags(listing.vertical);
    const userBestHashtags = this.getUserBestHashtags(userHistory);
    
    // Combinar y priorizar
    const allHashtags = [...baseHashtags, ...trendingHashtags, ...userBestHashtags];
    
    // Eliminar duplicados y limitar a 30
    return [...new Set(allHashtags)].slice(0, 30);
  }
  
  private static getBaseHashtags(listing: any): string[] {
    const hashtags: string[] = [];
    
    if (listing.vertical === 'autos') {
      const autoHashtags = [
        '#autos', '#carros', '#vehiculos', '#motor',
        `#${listing.brand?.toLowerCase() || 'carro'}`,
        listing.year ? `#${listing.year}` : '',
        '#venta', '#oportunidad'
      ];
      hashtags.push(...autoHashtags.filter(h => h !== ''));
    } else if (listing.vertical === 'propiedades') {
      const propHashtags = [
        '#inmobiliaria', '#propiedades', '#casas', '#departamentos',
        '#realestate', '#hogar', '#venta',
        listing.location ? `#${listing.location.toLowerCase().replace(/\s+/g, '')}` : ''
      ];
      hashtags.push(...propHashtags.filter(h => h !== ''));
    }
    
    return hashtags;
  }
  
  private static getTrendingHashtags(vertical: string): string[] {
    const trending: Record<string, string[]> = {
      autos: ['#carrosusados', '#seminuevos', '#luxury', '#sportcars', '#tuning'],
      propiedades: ['#inversion', '#propiedadesenventa', '#casadream', '#inmobiliariamoderna'],
      agenda: ['#citas', '#servicios', '#profesionales', '#negocios']
    };
    
    return trending[vertical] || [];
  }
  
  private static getUserBestHashtags(userHistory: InstagramAnalytics[]): string[] {
    const hashtagStats = this.analyzeHashtagPerformance(userHistory);
    
    return Object.entries(hashtagStats)
      .sort(([, a], [, b]) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10)
      .map(([hashtag]) => hashtag);
  }
}
