import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { listPublicListingsFromSource } from './listing-search.js';

export interface PublicRouterDeps {
    parseVertical: (v: string | undefined) => any;
    asString: (v: any) => string;
    asObject: (v: any) => Record<string, unknown>;
    parseNumberFromString: (v: any) => number | null;
    parseBoostSection: (section: string, vertical: any) => any;
    listingsById: Map<string, any>;
    isPublicListingVisible: (listing: any) => boolean;
    matchesListingSlug: (listing: any, slug: string) => boolean;
    listingToPublicResponse: (listing: any) => any;
    usersById: Map<string, any>;
    getPublishedPublicProfileBySlug: (vertical: any, slug: string) => any;
    userCanUsePublicProfile: (user: any, vertical: any) => boolean;
    getListingBySlug: (slugLike: string) => Promise<any | null>;
    fetchActivePublicListingRowsForMarketplace: (input: {
        vertical: string;
        section?: string | null;
        fetchLimit: number;
        searchQuery?: import('./listing-search.js').PublicListingSearchQuery;
    }) => Promise<unknown[]>;
    mapListingRowToRecord: (row: unknown) => any;
    buildPublicProfileResponse: (user: any, vertical: any, profile: any) => Promise<any>;
    searchPublicOperatorCatalog?: (input: {
        vertical: 'autos' | 'propiedades';
        q?: string;
        category?: string;
        region?: string;
        limit?: number;
    }) => Promise<{
        services: unknown[];
        packs: unknown[];
        promotions: unknown[];
    }>;
    geocodeLocationRequestSchema: any;
    normalizeListingLocation: (location: any) => any;
    geocodeLocationRemotely: (location: any) => Promise<any>;
    propertyValuationRequestSchema: any;
    vehicleValuationRequestSchema: any;
    getValuationFeedState: () => any;
    refreshValuationFeeds: () => Promise<any>;
    estimatePropertyValuation: (req: any) => any;
    getVehicleValuationFeedState: () => any;
    refreshVehicleValuationFeeds: () => Promise<any>;
    estimateVehicleValuation: (req: any) => any;
    // Mortgage rates
    db: any;
    tables: {
        mortgageRates: any;
    };
}

export function createPublicRouter(deps: PublicRouterDeps) {
    const {
        parseVertical,
        asString,
        asObject,
        parseNumberFromString,
        parseBoostSection,
        listingsById,
        isPublicListingVisible,
        matchesListingSlug,
        listingToPublicResponse,
        usersById,
        getPublishedPublicProfileBySlug,
        userCanUsePublicProfile,
        getListingBySlug,
        fetchActivePublicListingRowsForMarketplace,
        mapListingRowToRecord,
        buildPublicProfileResponse,
        searchPublicOperatorCatalog,
        geocodeLocationRequestSchema,
        normalizeListingLocation,
        geocodeLocationRemotely,
        propertyValuationRequestSchema,
        vehicleValuationRequestSchema,
        getValuationFeedState,
        refreshValuationFeeds,
        estimatePropertyValuation,
        getVehicleValuationFeedState,
        refreshVehicleValuationFeeds,
        estimateVehicleValuation,
        db,
        tables,
    } = deps;

    const app = new Hono();

    app.get('/listings', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const sectionRaw = c.req.query('section');
        const limitRaw = Number(c.req.query('limit') ?? '60');
        const limit = Number.isFinite(limitRaw) ? Math.min(120, Math.max(1, limitRaw)) : 60;
        const normalizedSection = sectionRaw ? parseBoostSection(sectionRaw, vertical) : null;

        const searchQuery = {
            q: c.req.query('q'),
            region: c.req.query('region'),
            commune: c.req.query('commune'),
            priceFrom: c.req.query('price_from'),
            priceTo: c.req.query('price_to'),
            brand: c.req.query('brand'),
            model: c.req.query('model'),
            yearFrom: c.req.query('year_from'),
            yearTo: c.req.query('year_to'),
            fuel: c.req.query('fuel'),
        };

        const items = await listPublicListingsFromSource({
            vertical,
            section: normalizedSection,
            limit,
            searchQuery,
            deps: {
                asString,
                asObject,
                parseNumberFromString,
                isPublicListingVisible,
                listingToPublicResponse,
                fetchActiveRowsFromDb: () =>
                    fetchActivePublicListingRowsForMarketplace({
                        vertical,
                        section: normalizedSection,
                        fetchLimit: Math.min(500, Math.max(limit * 4, limit)),
                        searchQuery,
                    }),
                mapRowToListing: mapListingRowToRecord,
                listingsById,
            },
        });

        return c.json({ ok: true, items });
    });

    app.get('/listings/:slug', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const slug = c.req.param('slug') ?? '';
        const listing = await getListingBySlug(slug);

        if (!listing || listing.vertical !== vertical || !isPublicListingVisible(listing)) {
            return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        }
        return c.json({ ok: true, item: listingToPublicResponse(listing) });
    });

    app.get('/profiles/:slug', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const slug = c.req.param('slug') ?? '';
        const profile = getPublishedPublicProfileBySlug(vertical, slug);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

        const user = usersById.get(profile.userId) ?? null;
        if (!user || !userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        }

        const payload = await buildPublicProfileResponse(user, vertical, profile);
        return c.json({ ok: true, ...payload });
    });

    app.get('/services', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        }
        if (!searchPublicOperatorCatalog) {
            return c.json({ ok: true, services: [], packs: [], promotions: [], items: [] });
        }
        const catalog = await searchPublicOperatorCatalog({
            vertical,
            q: asString(c.req.query('q')) || undefined,
            category: asString(c.req.query('category')) || undefined,
            region: asString(c.req.query('region')) || undefined,
            limit: parseNumberFromString(c.req.query('limit')) ?? 48,
        });
        return c.json({
            ok: true,
            services: catalog.services,
            packs: catalog.packs,
            promotions: catalog.promotions,
            items: catalog.services,
        });
    });

    app.post('/locations/geocode', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = geocodeLocationRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, provider: 'none', error: 'Payload inválido' }, 400);

        const normalized = normalizeListingLocation(parsed.data.location);
        if (!normalized) return c.json({ ok: false, provider: 'none', error: 'No pudimos procesar la ubicación.' }, 400);
        const location = await geocodeLocationRemotely(normalized);
        if (!location) {
            return c.json({
                ok: true,
                provider: normalized.geoPoint.provider ?? 'none',
                location: normalized,
                error: 'No pudimos confirmar automáticamente el punto exacto. Revisa la dirección en Google Maps antes de guardar.',
            });
        }

        return c.json({
            ok: true,
            provider: location.geoPoint.provider ?? 'none',
            location,
        });
    });

    app.get('/valuations/properties/sources', (c) => {
        const state = getValuationFeedState();
        return c.json({ ok: true, sources: state.sources });
    });

    app.post('/valuations/properties/sources/refresh', async (c) => {
        const state = await refreshValuationFeeds();
        return c.json({ ok: true, sources: state.sources, totalRecords: state.records.length });
    });

    app.post('/valuations/properties/estimate', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = propertyValuationRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const estimate = estimatePropertyValuation(parsed.data);
        return c.json({ ok: true, estimate });
    });

    app.get('/valuations/vehicles/sources', (c) => {
        const state = getVehicleValuationFeedState();
        return c.json({ ok: true, sources: state.sources });
    });

    app.post('/valuations/vehicles/sources/refresh', async (c) => {
        const state = await refreshVehicleValuationFeeds();
        return c.json({ ok: true, sources: state.sources, totalRecords: state.records.length });
    });

    app.post('/valuations/vehicles/estimate', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = vehicleValuationRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const estimate = estimateVehicleValuation(parsed.data);
        return c.json({ ok: true, estimate });
    });

    // Mortgage rates endpoint - returns current rates for simulator
    app.get('/mortgage-rates', async (c) => {
        try {
            const rates = await db
                .select()
                .from(tables.mortgageRates)
                .where(eq(tables.mortgageRates.isActive, true))
                .orderBy(desc(tables.mortgageRates.updatedAt))
                .limit(1);

            if (rates.length > 0) {
                const rate = rates[0];
                
                // Parse metadata from notes
                let metadata: Record<string, any> = {};
                try {
                    metadata = JSON.parse(rate.notes || '{}');
                } catch {
                    // Ignore parse errors
                }
                
                return c.json({
                    ok: true,
                    rates: {
                        standardRate: parseFloat(rate.standardRate),
                        subsidyRate: parseFloat(rate.subsidyRate),
                        bestMarketRate: parseFloat(rate.bestMarketRate),
                    },
                    sourceName: rate.sourceName,
                    sourceUrl: rate.sourceUrl,
                    updatedAt: rate.updatedAt,
                    isCMFData: metadata.cmf_available || false,
                    sourcesCount: metadata.sources_consulted || 1,
                    bankCount: metadata.bank_rates || 0,
                    confidence: metadata.statistics?.count > 3 ? 'high' : metadata.statistics?.count > 0 ? 'medium' : 'low',
                    methodology: 'Promedio ponderado de tasas bancarias + validación CMF',
                    notes: rate.notes
                });
            }

            // Fallback to default rates when no data in DB
            return c.json({
                ok: true,
                rates: {
                    standardRate: 5.5,
                    subsidyRate: 4.19,
                    bestMarketRate: 3.39,
                },
                sourceName: 'Valores por defecto',
                sourceUrl: '',
                updatedAt: new Date().toISOString(),
                confidence: 'low',
                methodology: 'Valores estimados pendientes de actualización',
                notes: 'No hay datos actualizados en la base de datos'
            });
        } catch (error) {
            console.error('Error fetching mortgage rates:', error);
            // Return 200 with ok:false so frontend can use fallback gracefully
            // 500 would cause fetch to reject and break the UI
            return c.json({
                ok: false,
                error: 'Error al obtener tasas de base de datos',
                rates: {
                    standardRate: 5.5,
                    subsidyRate: 4.19,
                    bestMarketRate: 3.39,
                },
                sourceName: 'Fallback (error DB)',
                updatedAt: new Date().toISOString(),
                confidence: 'low',
            }, 200);
        }
    });

    // Refresh mortgage rates - triggers update from multiple sources
    app.post('/mortgage-rates/refresh', async (c) => {
        try {
            // Import the update function dynamically to avoid circular dependencies
            const { updateMortgageRates } = await import('../../lib/updateMortgageRates.js');
            await updateMortgageRates();
            
            // Get updated rates
            const [latest] = await db
                .select()
                .from(tables.mortgageRates)
                .where(eq(tables.mortgageRates.isActive, true))
                .orderBy(desc(tables.mortgageRates.updatedAt))
                .limit(1);

            return c.json({
                ok: true,
                message: 'Tasas actualizadas exitosamente',
                data: latest ? {
                    standardRate: parseFloat(latest.standardRate),
                    subsidyRate: parseFloat(latest.subsidyRate),
                    bestMarketRate: parseFloat(latest.bestMarketRate),
                    highestRate: parseFloat(latest.highestRate || '6.5'), // Tasa más cara
                    updatedAt: latest.updatedAt,
                    sourceName: latest.sourceName
                } : null
            });
        } catch (error) {
            console.error('Error refreshing mortgage rates:', error);
            return c.json({
                ok: false,
                error: 'Error al actualizar tasas',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, 500);
        }
    });

    // Get mortgage rates sources and methodology
    app.get('/mortgage-rates/sources', (c) => {
        return c.json({
            ok: true,
            methodology: {
                name: 'Agregación Multi-Fuente con Validación CMF',
                description: 'Sistema que consulta múltiples fuentes bancarias y valida contra datos oficiales de la CMF',
                calculation: 'Promedio ponderado de tasas obtenidas, con mayor peso a fuentes oficiales',
                update_frequency: 'Diaria o manual mediante API',
                confidence_levels: {
                    high: 'Datos de CMF disponibles + 4+ bancos consultados (< 24h)',
                    medium: 'Datos de 2-3 bancos o datos con 24-72h de antigüedad',
                    low: 'Datos por defecto o > 72h de antigüedad'
                }
            },
            official_sources: [
                {
                    name: 'CMF - Comisión para el Mercado Financiero',
                    url: 'https://www.cmfchile.cl',
                    type: 'regulador',
                    weight: 1.0,
                    description: 'Autoridad reguladora del sistema financiero chileno'
                },
                {
                    name: 'Banco Central de Chile',
                    url: 'https://www.bcentral.cl',
                    type: 'oficial',
                    weight: 0.95,
                    description: 'Estadísticas oficiales de créditos hipotecarios'
                }
            ],
            bank_sources: [
                { name: 'BancoEstado', weight: 0.85 },
                { name: 'Banco de Chile', weight: 0.85 },
                { name: 'Santander Chile', weight: 0.85 },
                { name: 'Itaú Chile', weight: 0.85 },
                { name: 'BCI', weight: 0.85 },
                { name: 'Scotiabank', weight: 0.85 },
                { name: 'Falabella', weight: 0.80 }
            ],
            subsidy_source: {
                name: 'MINVU - Ministerio de Vivienda',
                url: 'https://www.minvu.gob.cl/nuevo-subsidio-al-credito-hipotecario/',
                description: 'Tasa de subsidio oficial DS1 2026: 4.19%'
            }
        });
    });

    // Get current UF value from Mindicador API
    app.get('/uf-value', async (c) => {
        try {
            const response = await fetch('https://mindicador.cl/api/uf');
            if (!response.ok) {
                throw new Error('Failed to fetch UF from Mindicador');
            }
            
            const data = await response.json();
            const latestUF = data.serie?.[0];
            
            if (!latestUF) {
                throw new Error('No UF data available');
            }
            
            return c.json({
                ok: true,
                ufValue: latestUF.valor,
                date: latestUF.fecha,
                source: 'mindicador.cl',
                fallback: 39643 // Hardcoded fallback value
            });
        } catch (error) {
            console.error('Error fetching UF:', error);
            // Return fallback value if API fails
            return c.json({
                ok: true,
                ufValue: 39643,
                date: new Date().toISOString(),
                source: 'fallback',
                fallback: true,
                error: 'Using fallback value'
            });
        }
    });

    return app;
}
