import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, desc } from 'drizzle-orm';

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
    buildPublicProfileResponse: (user: any, vertical: any, profile: any) => any;
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
        buildPublicProfileResponse,
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

    app.get('/listings', (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const section = c.req.query('section');
        const limitRaw = Number(c.req.query('limit') ?? '60');
        const limit = Number.isFinite(limitRaw) ? Math.min(120, Math.max(1, limitRaw)) : 60;

        const q = c.req.query('q');
        const region = c.req.query('region');
        const commune = c.req.query('commune');
        const priceFrom = c.req.query('price_from');
        const priceTo = c.req.query('price_to');
        const brand = c.req.query('brand');
        const model = c.req.query('model');
        const yearFrom = c.req.query('year_from');
        const yearTo = c.req.query('year_to');
        const fuel = c.req.query('fuel');

        const items = Array.from(listingsById.values())
            .filter((listing) => listing.vertical === vertical)
            .filter((listing) => isPublicListingVisible(listing))
            .filter((listing) => {
                if (!section) return true;
                const normalized = parseBoostSection(section, vertical);
                return listing.section === normalized;
            })
            .filter((listing) => {
                if (!q) return true;
                const query = q.toLowerCase();
                const title = listing.title?.toLowerCase() ?? '';
                const description = listing.description?.toLowerCase() ?? '';
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const brandField = (asString(basic.brand) || asString(rawData.brand) || '').toLowerCase();
                const modelField = (asString(basic.model) || asString(rawData.model) || '').toLowerCase();
                return title.includes(query) || description.includes(query) || brandField.includes(query) || modelField.includes(query);
            })
            .filter((listing) => {
                if (!region) return true;
                const locationData = asObject(listing.locationData);
                const rawData = asObject(listing.rawData);
                const location = asObject(rawData.location);
                const listingRegionId = (asString(locationData.regionId) || asString(location.regionId) || '').toLowerCase();
                return listingRegionId === region.toLowerCase();
            })
            .filter((listing) => {
                if (!commune) return true;
                const locationData = asObject(listing.locationData);
                const rawData = asObject(listing.rawData);
                const location = asObject(rawData.location);
                const listingCommuneId = (asString(locationData.communeId) || asString(location.communeId) || '').toLowerCase();
                return listingCommuneId === commune.toLowerCase();
            })
            .filter((listing) => {
                if (!brand) return true;
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const listingBrand = (asString(basic.brand) || asString(rawData.brand) || '').toLowerCase();
                return listingBrand === brand.toLowerCase();
            })
            .filter((listing) => {
                if (!model) return true;
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const listingModel = (asString(basic.model) || asString(rawData.model) || '').toLowerCase();
                return listingModel === model.toLowerCase();
            })
            .filter((listing) => {
                if (!fuel) return true;
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const listingFuel = (asString(basic.fuelType) || asString(rawData.fuelType) || '').toLowerCase();
                return listingFuel === fuel.toLowerCase();
            })
            .filter((listing) => {
                if (!yearFrom) return true;
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const listingYear = parseNumberFromString(basic.year) ?? parseNumberFromString(rawData.year) ?? 0;
                return listingYear >= Number(yearFrom);
            })
            .filter((listing) => {
                if (!yearTo) return true;
                const rawData = asObject(listing.rawData);
                const basic = asObject(rawData.basic);
                const listingYear = parseNumberFromString(basic.year) ?? parseNumberFromString(rawData.year) ?? 0;
                return listingYear <= Number(yearTo);
            })
            .filter((listing) => {
                const listingPrice = parseNumberFromString(listing.price) ?? 0;
                if (priceFrom && priceTo) {
                    return listingPrice >= Number(priceFrom) && listingPrice <= Number(priceTo);
                }
                if (priceFrom) return listingPrice >= Number(priceFrom);
                if (priceTo) return listingPrice <= Number(priceTo);
                return true;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, limit)
            .map((listing) => listingToPublicResponse(listing));

        return c.json({ ok: true, items });
    });

    app.get('/listings/:slug', (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const slug = c.req.param('slug') ?? '';
        const listing = Array.from(listingsById.values())
            .find((item) => item.vertical === vertical && isPublicListingVisible(item) && matchesListingSlug(item, slug));

        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        return c.json({ ok: true, item: listingToPublicResponse(listing) });
    });

    app.get('/profiles/:slug', (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const slug = c.req.param('slug') ?? '';
        const profile = getPublishedPublicProfileBySlug(vertical, slug);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

        const user = usersById.get(profile.userId) ?? null;
        if (!user || !userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        }

        const payload = buildPublicProfileResponse(user, vertical, profile);
        return c.json({ ok: true, ...payload });
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
                    standardRate: parseFloat(rate.standardRate),
                    subsidyRate: parseFloat(rate.subsidyRate),
                    bestMarketRate: parseFloat(rate.bestMarketRate),
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

            // Fallback to default rates
            return c.json({
                ok: true,
                standardRate: 5.5,
                subsidyRate: 4.19,
                bestMarketRate: 3.39,
                sourceName: 'Valores por defecto',
                sourceUrl: '',
                updatedAt: new Date().toISOString(),
                confidence: 'low',
                methodology: 'Valores estimados pendientes de actualización',
                notes: 'No hay datos actualizados en la base de datos'
            });
        } catch (error) {
            console.error('Error fetching mortgage rates:', error);
            return c.json({
                ok: false,
                error: 'Error al obtener tasas',
                standardRate: 5.5,
                subsidyRate: 4.19,
                bestMarketRate: 3.39,
                highestRate: 6.5 // Tasa más cara fallback
            }, 500);
        }
    });

    // Refresh mortgage rates - triggers update from multiple sources
    app.post('/mortgage-rates/refresh', async (c) => {
        try {
            // Import the update function dynamically to avoid circular dependencies
            const { updateMortgageRates } = await import('../../scripts/updateMortgageRates');
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
