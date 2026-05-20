-- =====================================================
-- MIGRACIÓN: Divide admin@simpleplataforma.app 
-- en cuentas por vertical
-- =====================================================
-- Este script:
-- 1. Crea admin@simpleautos.app y admin@simplepropiedades.app
-- 2. Migra publicaciones de autos a admin@simpleautos.app
-- 3. Crea perfiles públicos para las nuevas cuentas
-- 4. Mantiene admin@simpleplataforma.app para uso administrativo
-- =====================================================

-- =====================================================
-- PASO 0: Verificación de seguridad
-- =====================================================
DO $$
DECLARE
    old_user_id UUID;
    old_user_exists BOOLEAN;
BEGIN
    -- Verificar que el usuario viejo existe
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@simpleplataforma.app') INTO old_user_exists;
    
    IF NOT old_user_exists THEN
        RAISE EXCEPTION 'Usuario admin@simpleplataforma.app no encontrado. Abortando migración.';
    END IF;
    
    SELECT id INTO old_user_id FROM users WHERE email = 'admin@simpleplataforma.app';
    
    RAISE NOTICE 'Usuario encontrado: %', old_user_id;
    RAISE NOTICE 'Iniciando migración...';
END $$;

-- =====================================================
-- PASO 1: Crear nuevos usuarios
-- =====================================================

-- Crear admin@simpleautos.app (si no existe)
INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'admin@simpleautos.app',
    password_hash,  -- Misma contraseña que admin viejo
    'SimpleAutos',
    'admin',
    'active',
    NOW(),
    NOW()
FROM users 
WHERE email = 'admin@simpleplataforma.app'
ON CONFLICT (email) DO NOTHING;

-- Crear admin@simplepropiedades.app (si no existe)
INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'admin@simplepropiedades.app',
    password_hash,  -- Misma contraseña que admin viejo
    'SimplePropiedades',
    'admin',
    'active',
    NOW(),
    NOW()
FROM users 
WHERE email = 'admin@simpleplataforma.app'
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- PASO 2: Obtener IDs para migración
-- =====================================================
DO $$
DECLARE
    old_user_id UUID;
    autos_user_id UUID;
    propiedades_user_id UUID;
    listings_count INTEGER;
    drafts_count INTEGER;
BEGIN
    -- Obtener IDs
    SELECT id INTO old_user_id FROM users WHERE email = 'admin@simpleplataforma.app';
    SELECT id INTO autos_user_id FROM users WHERE email = 'admin@simpleautos.app';
    SELECT id INTO propiedades_user_id FROM users WHERE email = 'admin@simplepropiedades.app';
    
    RAISE NOTICE 'IDs obtenidos:';
    RAISE NOTICE '  - Viejo: %', old_user_id;
    RAISE NOTICE '  - Autos: %', autos_user_id;
    RAISE NOTICE '  - Propiedades: %', propiedades_user_id;
    
    -- =====================================================
    -- PASO 3: Migrar publicaciones de autos
    -- =====================================================
    
    UPDATE listings 
    SET owner_id = autos_user_id,
        updated_at = NOW()
    WHERE owner_id = old_user_id
      AND vertical = 'autos';
    
    GET DIAGNOSTICS listings_count = ROW_COUNT;
    RAISE NOTICE 'Publicaciones de autos migradas: %', listings_count;
    
    -- =====================================================
    -- PASO 4: Migrar borradores de autos
    -- =====================================================
    
    UPDATE listing_drafts
    SET user_id = autos_user_id,
        updated_at = NOW()
    WHERE user_id = old_user_id
      AND vertical = 'autos';
    
    GET DIAGNOSTICS drafts_count = ROW_COUNT;
    RAISE NOTICE 'Borradores de autos migrados: %', drafts_count;
    
    -- =====================================================
    -- PASO 5: Crear perfiles públicos
    -- =====================================================
    
    -- Perfil para SimpleAutos (si no existe)
    INSERT INTO public_profiles (
        id, user_id, vertical, slug, display_name, account_kind,
        headline, bio, is_published, lead_routing_mode, public_email,
        social_links, business_hours, specialties, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        autos_user_id,
        'autos',
        'simpleautos',
        'SimpleAutos',
        'company',
        'Gestión profesional de venta de vehículos',
        'Somos SimpleAutos, tu aliado para comprar o vender vehículos de forma segura y profesional. Ofrecemos gestión completa desde la publicación hasta el cierre de la operación.',
        true,
        'owner',
        'admin@simpleautos.app',
        '{}'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public_profiles 
        WHERE user_id = autos_user_id AND vertical = 'autos'
    );
    
    RAISE NOTICE 'Perfil SimpleAutos creado (o ya existía)';
    
    -- Perfil para SimplePropiedades (si no existe)
    INSERT INTO public_profiles (
        id, user_id, vertical, slug, display_name, account_kind,
        headline, bio, is_published, lead_routing_mode, public_email,
        social_links, business_hours, specialties, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        propiedades_user_id,
        'propiedades',
        'simplepropiedades',
        'SimplePropiedades',
        'company',
        'Gestión profesional de bienes raíces',
        'Somos SimplePropiedades, especialistas en la compra, venta y arriendo de propiedades. Gestionamos todo el proceso para que tengas una experiencia sin complicaciones.',
        true,
        'owner',
        'admin@simplepropiedades.app',
        '{}'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public_profiles 
        WHERE user_id = propiedades_user_id AND vertical = 'propiedades'
    );
    
    RAISE NOTICE 'Perfil SimplePropiedades creado (o ya existía)';
    
    -- =====================================================
    -- RESUMEN
    -- =====================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuario viejo (administrativo): %', old_user_id;
    RAISE NOTICE 'Usuario autos: %', autos_user_id;
    RAISE NOTICE 'Usuario propiedades: %', propiedades_user_id;
    RAISE NOTICE 'Publicaciones migradas: %', listings_count;
    RAISE NOTICE 'Borradores migrados: %', drafts_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'URLs de perfil público:';
    RAISE NOTICE '  https://simpleautos.cl/perfil/simpleautos';
    RAISE NOTICE '  https://simplepropiedades.cl/perfil/simplepropiedades';
    RAISE NOTICE '========================================';
    
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL (SELECT para confirmar)
-- =====================================================

-- Ver usuarios creados
SELECT 'USUARIOS CREADOS' as info, email, name, role, status 
FROM users 
WHERE email IN ('admin@simpleautos.app', 'admin@simplepropiedades.app', 'admin@simpleplataforma.app')
ORDER BY email;

-- Ver publicaciones migradas
SELECT 'PUBLICACIONES POR USUARIO' as info, 
       u.email, 
       COUNT(l.id) as total_listings
FROM users u
LEFT JOIN listings l ON l.owner_id = u.id
WHERE u.email IN ('admin@simpleautos.app', 'admin@simpleplataforma.app')
GROUP BY u.email;

-- Ver perfiles creados
SELECT 'PERFILES PUBLICOS CREADOS' as info,
       p.slug, 
       p.display_name, 
       p.vertical,
       p.is_published,
       u.email as owner_email
FROM public_profiles p
JOIN users u ON u.id = p.user_id
WHERE u.email IN ('admin@simpleautos.app', 'admin@simplepropiedades.app');
