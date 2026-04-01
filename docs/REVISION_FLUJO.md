# Revisión Flujo Completo - SimpleAutos Publishing

## PROBLEMAS ENCONTRADOS

### 1. **CRÍTICO: Términos no aceptables en modo publicación rápida**
- En modo publicación: El formulario valida que `data.review.acceptTerms` sea true
- Pero el checkbox de términos SOLO aparece en la sección "Publicación" (línea 2239)
- La sección "Publicación" SOLO aparece en modo edición (línea 2185: `{isEditing && (`)
- **EFECTO**: Usuario no puede aceptar términos en modo publicación → publicación falla

**SOLUCIÓN Required**:
- Option A: Agregar checkbox de términos ANTES del botón de publicar en AMBOS modos
- Option B: No validar 'review' step en modo publicación rápida
- RECOMENDADO: Option A (mejor UX)

### 2. **POTENCIAL: Datos incompletos en publicación rápida**
- El flujo de publicación rápida NO muestra:
  - Antecedentes (history fields)
  - Especificaciones técnicas (specs fields)
  - Video y documentos
  - Tasador de precios
  - Configuración de publicación
- PERO: Validaciones las requiere en step 'specs' y 'commercial'
- **EFECTO**: Campos "empty" pueden causar errores de validación

**SOLUCIÓN Required**:
- Validar que campos opcionales en quick-publish NO se validen como requeridos
- O mostrar solo campos requeridos en quick-publish

### 3. **State Management: acceptTerms inicial**
- `acceptTerms` siempre inicia en `false` (línea 652)
- En modo edición, usuario DEBE cambiar a true manualmente
- En modo publicación, usuario NO PUEDE cambiar este campo
- **EFECTO**: Publicación siempre fallará

## FLUJO ACTUAL

1. **Publicación Nueva**:
   - Usuario inicia en /panel/publicar
   - isEditing = false, editingId = null
   - Ve: Fotos + Datos Básicos + Precio + Botón Publicar
   - NO ve: Términos, Tasador, Antecedentes, Especificaciones
   - Al clickear Publicar:
     - Valida TODOS los steps (setup, basic, specs, media, commercial, review)
     - `validateStep('review')` requiere `acceptTerms = true` ❌ FALLA

2. **Edición Existente**:
   - Usuario inicia en /panel/publicar?edit=ID
   - isEditing = true, editingId = ID
   - Ve: Todos los campos incluyendo Términos
   - Datos se cargan de `buildEditPayload()`
   - Al clickear Guardar:
     - Valida TODOS los steps
     - Usuario puede aceptar términos ✓ OK

3. **Visualización Pública**:
   - /vehiculo/[slug]
   - Carga datos de `fetchPublicListing(slug)`
   - Muestra: Título, Fotos, Descripción, Resumen, Métricas, Vendedor
   - ✓ Parece correcto

## ARCHIVOS A REVISAR

- `/panel/publicar/page.tsx` - Formulario principal
- `/vehiculo/[slug]/page.tsx` - Página pública
- `/lib/public-listings.ts` - Obtención datos públicos
- `/lib/panel-listings.ts` - Creación/actualización listings

## RECOMENDACIONES

1. **FIX INMEDIATO**: Agregar checkbox de términos

en la UI pública (antes de botón Publicar)
2. Validar que no haya inconsistencias en datos requeridos
3. Testear flujo completo: Publicar → Editar → Ver Público
