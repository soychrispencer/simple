import { ListingData } from './instagram-templates.js';
import { InstagramAnalytics } from './instagram-analytics.js';

export interface ScheduledPost {
  id: string;
  listingId: string;
  content: {
    caption: string;
    hashtags: string[];
    images: string[];
  };
  scheduledTime: Date;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timezone: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  publishedAt?: Date;
  errorMessage?: string;
}

export interface SchedulingInsights {
  bestTimes: Array<{
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
    avgReach: number;
    confidence: number;
  }>;
  worstTimes: Array<{
    dayOfWeek: string;
    hour: number;
    avgEngagement: number;
    reason: string;
  }>;
  recommendations: string[];
  seasonalPatterns: Array<{
    month: string;
    performanceMultiplier: number;
    notes: string;
  }>;
}

export interface SchedulingOptions {
  preferredTimes?: Array<{
    dayOfWeek: number; // 0-6, Sunday = 0
    hour: number; // 0-23
    minute: number; // 0-59
  }>;
  avoidTimes?: Array<{
    dayOfWeek: number;
    hour: number;
    reason: string;
  }>;
  timezone: string;
  maxPostsPerDay: number;
  minIntervalBetweenPosts: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  publishImmediately?: boolean;
}

// Clase para manejar scheduling inteligente
export class InstagramSchedulerService {
  
  // Programar publicación automáticamente
  static async scheduleOptimalPost(
    listing: ListingData,
    content: {
      caption: string;
      hashtags: string[];
      images: string[];
    },
    options: Partial<SchedulingOptions> = {},
    userHistory?: InstagramAnalytics[],
    similarUsersData?: InstagramAnalytics[]
  ): Promise<ScheduledPost> {
    
    const schedulingOptions = this.buildSchedulingOptions(options);
    
    let scheduledTime: Date;
    
    if (schedulingOptions.publishImmediately) {
      scheduledTime = new Date();
    } else {
      scheduledTime = await this.calculateOptimalTime(
        listing,
        schedulingOptions,
        userHistory,
        similarUsersData
      );
    }
    
    const scheduledPost: ScheduledPost = {
      id: `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      listingId: listing.id,
      content,
      scheduledTime,
      status: 'scheduled',
      priority: schedulingOptions.priority,
      timezone: schedulingOptions.timezone,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    };
    
    return scheduledPost;
  }
  
  // Construir opciones de scheduling
  private static buildSchedulingOptions(options: Partial<SchedulingOptions>): SchedulingOptions {
    return {
      preferredTimes: options.preferredTimes || this.getDefaultPreferredTimes(),
      avoidTimes: options.avoidTimes || this.getDefaultAvoidTimes(),
      timezone: options.timezone || 'America/Mexico_City',
      maxPostsPerDay: options.maxPostsPerDay || 3,
      minIntervalBetweenPosts: options.minIntervalBetweenPosts || 120, // 2 hours
      priority: options.priority || 'medium',
      publishImmediately: options.publishImmediately || false
    };
  }
  
  // Calcular tiempo óptimo de publicación
  private static async calculateOptimalTime(
    listing: ListingData,
    options: SchedulingOptions,
    userHistory?: InstagramAnalytics[],
    similarUsersData?: InstagramAnalytics[]
  ): Promise<Date> {
    
    // Obtener insights de scheduling
    const insights = this.generateSchedulingInsights(userHistory || [], similarUsersData || []);
    
    // Encontrar el mejor tiempo disponible
    const bestTime = this.findBestAvailableTime(insights.bestTimes, options);
    
    // Si no hay tiempo preferido disponible, usar el siguiente mejor
    if (!bestTime) {
      return this.getNextAvailableTime(options);
    }
    
    // Convertir a fecha específica
    return this.convertTimeSlotToDate(bestTime, options.timezone);
  }
  
  // Generar insights de scheduling
  static generateSchedulingInsights(
    userHistory: InstagramAnalytics[],
    similarUsersData: InstagramAnalytics[]
  ): SchedulingInsights {
    
    const allData = [...userHistory, ...similarUsersData];
    
    // Analizar mejores tiempos
    const timeSlotPerformance = this.analyzeTimeSlotPerformance(allData);
    
    // Ordenar por performance
    const bestTimes = Object.entries(timeSlotPerformance)
      .map(([timeSlot, performance]) => ({
        dayOfWeek: this.getDayName(parseInt(timeSlot.split('-')[0])),
        hour: parseInt(timeSlot.split('-')[1]),
        avgEngagement: performance.avgEngagement,
        avgReach: performance.avgReach,
        confidence: performance.confidence
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);
    
    // Encontrar peores tiempos
    const worstTimes = bestTimes
      .slice(-5)
      .map(time => ({
        ...time,
        reason: this.getWorstTimeReason(time.dayOfWeek, time.hour)
      }));
    
    // Patrones estacionales
    const seasonalPatterns = this.analyzeSeasonalPatterns(allData);
    
    // Generar recomendaciones
    const recommendations = this.generateSchedulingRecommendations(bestTimes, worstTimes);
    
    return {
      bestTimes,
      worstTimes,
      recommendations,
      seasonalPatterns
    };
  }
  
  // Analizar performance por time slot
  private static analyzeTimeSlotPerformance(data: InstagramAnalytics[]): Record<string, any> {
    const timeSlots: Record<string, {
      totalEngagement: number;
      totalReach: number;
      count: number;
      avgEngagement: number;
      avgReach: number;
      confidence: number;
    }> = {};
    
    data.forEach(post => {
      const date = new Date(post.publishedAt);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const timeSlot = `${dayOfWeek}-${hour}`;
      
      if (!timeSlots[timeSlot]) {
        timeSlots[timeSlot] = {
          totalEngagement: 0,
          totalReach: 0,
          count: 0,
          avgEngagement: 0,
          avgReach: 0,
          confidence: 0
        };
      }
      
      const engagement = this.calculateEngagementRate(post);
      timeSlots[timeSlot].totalEngagement += engagement;
      timeSlots[timeSlot].totalReach += post.reach;
      timeSlots[timeSlot].count++;
    });
    
    // Calcular promedios y confianza
    Object.keys(timeSlots).forEach(slot => {
      const data = timeSlots[slot];
      data.avgEngagement = data.totalEngagement / data.count;
      data.avgReach = data.totalReach / data.count;
      
      // Confidence basado en el tamaño de muestra
      data.confidence = Math.min(data.count / 10, 1); // 10 posts = 100% confidence
    });
    
    return timeSlots;
  }
  
  // Calcular tasa de engagement
  private static calculateEngagementRate(post: InstagramAnalytics): number {
    const totalInteractions = post.likes + post.comments + post.shares + post.saves;
    return post.reach > 0 ? (totalInteractions / post.reach) * 100 : 0;
  }
  
  // Obtener nombre del día
  private static getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }
  
  // Obtener razón para peor tiempo
  private static getWorstTimeReason(dayOfWeek: string, hour: number): string {
    if (dayOfWeek === 'Sunday' && hour < 10) {
      return 'Horario de bajo actividad (domingo temprano)';
    } else if (dayOfWeek === 'Friday' && hour > 22) {
      return 'Fin de semana tarde, menor actividad profesional';
    } else if (hour < 6 || hour > 23) {
      return 'Horario nocturno, menor audiencia activa';
    } else {
      return 'Históricamente menor engagement en este horario';
    }
  }
  
  // Analizar patrones estacionales
  private static analyzeSeasonalPatterns(data: InstagramAnalytics[]): Array<{
    month: string;
    performanceMultiplier: number;
    notes: string;
  }> {
    
    const monthlyPerformance: Record<number, { total: number; count: number }> = {};
    
    data.forEach(post => {
      const month = new Date(post.publishedAt).getMonth();
      if (!monthlyPerformance[month]) {
        monthlyPerformance[month] = { total: 0, count: 0 };
      }
      monthlyPerformance[month].total += this.calculateEngagementRate(post);
      monthlyPerformance[month].count++;
    });
    
    // Calcular promedio mensual y multiplicadores
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const avgMonthly = Object.values(monthlyPerformance)
      .reduce((sum, month) => sum + (month.total / month.count), 0) / 
      Object.keys(monthlyPerformance).length;
    
    return Object.entries(monthlyPerformance).map(([monthIndex, data]) => {
      const monthNum = parseInt(monthIndex);
      const performance = data.total / data.count;
      const multiplier = performance / avgMonthly;
      
      return {
        month: months[monthNum],
        performanceMultiplier: multiplier,
        notes: this.getSeasonalNote(monthNum, multiplier)
      };
    });
  }
  
  // Obtener nota estacional
  private static getSeasonalNote(month: number, multiplier: number): string {
    const seasonalNotes: Record<number, { high: string; low: string }> = {
      0: { high: 'Enero: Buen rendimiento post-vacaciones', low: 'Enero: Menor actividad por vacaciones' },
      3: { high: 'Abril: Inicio de temporada alta', low: 'Abril: Transición de temporada' },
      6: { high: 'Julio: Verano, alta actividad', low: 'Julio: Vacaciones reducen actividad' },
      11: { high: 'Diciembre: Festividades, alto engagement', low: 'Diciembre: Competencia alta' }
    };
    
    const note = seasonalNotes[month];
    if (note) {
      return multiplier > 1.1 ? note.high : note.low;
    }
    
    return multiplier > 1.1 ? 'Mes con rendimiento superior al promedio' : 'Mes con rendimiento estándar';
  }
  
  // Generar recomendaciones de scheduling
  private static generateSchedulingRecommendations(
    bestTimes: any[],
    worstTimes: any[]
  ): string[] {
    
    const recommendations: string[] = [];
    
    if (bestTimes.length > 0) {
      const topTime = bestTimes[0];
      recommendations.push(`Mejor horario: ${topTime.dayOfWeek} a las ${topTime.hour}:00 con ${topTime.avgEngagement.toFixed(2)}% engagement promedio`);
    }
    
    if (bestTimes.length >= 3) {
      const top3 = bestTimes.slice(0, 3);
      const days = top3.map(t => t.dayOfWeek).join(', ');
      recommendations.push(`Concentrar publicaciones en: ${days}`);
    }
    
    if (worstTimes.length > 0) {
      const worstTime = worstTimes[0];
      recommendations.push(`Evitar publicaciones: ${worstTime.dayOfWeek} ${worstTime.hour}:00 - ${worstTime.reason}`);
    }
    
    // Recomendaciones generales
    recommendations.push('Mantener consistencia en los horarios de publicación');
    recommendations.push('Ajustar horarios según cambios estacionales');
    recommendations.push('Monitorear engagement y ajustar estrategia mensualmente');
    
    return recommendations;
  }
  
  // Encontrar mejor tiempo disponible
  private static findBestAvailableTime(
    bestTimes: any[],
    options: SchedulingOptions
  ): { dayOfWeek: number; hour: number } | null {
    
    for (const timeSlot of bestTimes) {
      const dayIndex = this.getDayIndex(timeSlot.dayOfWeek);
      
      // Verificar si está en tiempos preferidos
      const isPreferred = options.preferredTimes?.some(pref => 
        pref.dayOfWeek === dayIndex && pref.hour === timeSlot.hour
      );
      
      // Verificar si está en tiempos a evitar
      const isAvoided = options.avoidTimes?.some(avoid => 
        avoid.dayOfWeek === dayIndex && avoid.hour === timeSlot.hour
      );
      
      if (isPreferred && !isAvoided) {
        return { dayOfWeek: dayIndex, hour: timeSlot.hour };
      }
    }
    
    // Si no hay tiempo preferido, tomar el mejor no evitado
    for (const timeSlot of bestTimes) {
      const dayIndex = this.getDayIndex(timeSlot.dayOfWeek);
      const isAvoided = options.avoidTimes?.some(avoid => 
        avoid.dayOfWeek === dayIndex && avoid.hour === timeSlot.hour
      );
      
      if (!isAvoided) {
        return { dayOfWeek: dayIndex, hour: timeSlot.hour };
      }
    }
    
    return null;
  }
  
  // Obtener índice del día
  private static getDayIndex(dayName: string): number {
    const days: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    return days[dayName] || 0;
  }
  
  // Obtener siguiente tiempo disponible
  private static getNextAvailableTime(options: SchedulingOptions): Date {
    const now = new Date();
    let candidateTime = new Date(now);
    
    // Buscar el próximo tiempo preferido disponible
    while (true) {
      const dayOfWeek = candidateTime.getDay();
      const hour = candidateTime.getHours();
      
      const isPreferred = options.preferredTimes?.some(pref => 
        pref.dayOfWeek === dayOfWeek && pref.hour === hour
      );
      
      const isAvoided = options.avoidTimes?.some(avoid => 
        avoid.dayOfWeek === dayOfWeek && avoid.hour === hour
      );
      
      if (isPreferred && !isAvoided && candidateTime > now) {
        return candidateTime;
      }
      
      // Avanzar una hora
      candidateTime.setHours(candidateTime.getHours() + 1);
      
      // Si avanzamos demasiado, usar tiempo por defecto
      if (candidateTime.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000) { // 7 días
        candidateTime = new Date(now);
        candidateTime.setHours(candidateTime.getHours() + 2); // 2 horas desde ahora
        return candidateTime;
      }
    }
  }
  
  // Convertir time slot a fecha
  private static convertTimeSlotToDate(
    timeSlot: { dayOfWeek: number; hour: number },
    timezone: string
  ): Date {
    
    const now = new Date();
    const targetDate = new Date(now);
    
    // Encontrar el próximo día de la semana deseado
    const currentDay = now.getDay();
    let daysToAdd = (timeSlot.dayOfWeek - currentDay + 7) % 7;
    
    // Si es el mismo día pero ya pasó la hora, usar la próxima semana
    if (daysToAdd === 0 && now.getHours() >= timeSlot.hour) {
      daysToAdd = 7;
    }
    
    targetDate.setDate(now.getDate() + daysToAdd);
    targetDate.setHours(timeSlot.hour, 0, 0, 0);
    
    return targetDate;
  }
  
  // Obtener tiempos preferidos por defecto
  private static getDefaultPreferredTimes(): Array<{ dayOfWeek: number; hour: number; minute: number }> {
    return [
      { dayOfWeek: 1, hour: 9, minute: 0 },  // Lunes 9 AM
      { dayOfWeek: 1, hour: 18, minute: 0 }, // Lunes 6 PM
      { dayOfWeek: 2, hour: 12, minute: 0 }, // Martes 12 PM
      { dayOfWeek: 3, hour: 15, minute: 0 }, // Miércoles 3 PM
      { dayOfWeek: 4, hour: 11, minute: 0 }, // Jueves 11 AM
      { dayOfWeek: 5, hour: 17, minute: 0 }, // Viernes 5 PM
      { dayOfWeek: 6, hour: 10, minute: 0 }, // Sábado 10 AM
    ];
  }
  
  // Obtener tiempos a evitar por defecto
  private static getDefaultAvoidTimes(): Array<{ dayOfWeek: number; hour: number; reason: string }> {
    return [
      { dayOfWeek: 0, hour: 6, reason: 'Domingo temprano, baja actividad' },
      { dayOfWeek: 0, hour: 23, reason: 'Domingo noche, menor audiencia' },
      { dayOfWeek: 5, hour: 23, reason: 'Viernes noche, inicio de fin de semana' },
      { dayOfWeek: 6, hour: 23, reason: 'Sábado noche, menor actividad profesional' },
    ];
  }
  
  // Verificar si una publicación debe ser reprogramada
  static shouldReschedule(
    scheduledPost: ScheduledPost,
    currentPerformance: InstagramAnalytics,
    threshold: number = 2.0
  ): boolean {
    
    // Si el engagement es menor al threshold, reprogramar
    const engagementRate = this.calculateEngagementRate(currentPerformance);
    
    if (engagementRate < threshold) {
      return true;
    }
    
    // Si hay muchos errores de publicación
    if (scheduledPost.retryCount >= scheduledPost.maxRetries) {
      return true;
    }
    
    return false;
  }
  
  // Obtener próximas publicaciones programadas
  static getUpcomingPosts(
    scheduledPosts: ScheduledPost[],
    hoursAhead: number = 24
  ): ScheduledPost[] {
    
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    return scheduledPosts
      .filter(post => 
        post.status === 'scheduled' && 
        post.scheduledTime >= now && 
        post.scheduledTime <= cutoff
      )
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }
  
  // Optimizar programación existente
  static optimizeExistingSchedule(
    scheduledPosts: ScheduledPost[],
    insights: SchedulingInsights
  ): ScheduledPost[] {
    
    const optimizedPosts = [...scheduledPosts];
    
    // Reordenar publicaciones por prioridad y mejores tiempos
    optimizedPosts.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Mayor prioridad primero
      }
      
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
    
    return optimizedPosts;
  }
}
