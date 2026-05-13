# 🔐 AUDITORÍA COMPLETA - FLUJO DE REGISTRO DE USUARIO

**Fecha:** 9 de marzo de 2026  
**Análisis:** Auditoría de seguridad del flujo de registro en las aplicaciones Simple (v2)

---

## 📊 RESUMEN EJECUTIVO

El flujo de registro tiene **vulnerabilidades críticas de seguridad** que lo hacen **inadecuado para producción**. Aunque la estructura básica es funcional, carece de protecciones esenciales.

### Nivel de Riesgo: 🔴 CRÍTICO

---

## 1. ARQUITECTURA GENERAL

### Componentes Identificados

```
CLIENTE (Next.js Apps)
  ├─ simpleautos
  ├─ simplepropiedades
  ├─ simpleadmin (sin auth yet)
  └─ simpleplataforma (sin auth yet)
        ↓
API BACKEND (Hono.js)
  └─ services/api/src/index.ts
        ↓
ALMACENAMIENTO
  └─ En memoria (Maps) ⚠️ NO PERSISTIDO
```

### Apps Analizadas

| App | Registro | BD | Auth | Observación |
|-----|----------|----|----|-------------|
| simpleautos | ✓ Sí | ✗ Memoria | ✓ JWT+Cookie | Funcional para dev |
| simplepropiedades | ✓ Sí | ✗ Memoria | ✓ JWT+Cookie | Funcional para dev |
| simpleadmin | ✗ No | N/A | ✗ No | Aún no implementado |
| simpleplataforma | ✗ No | N/A | ✗ No | Aún no implementado |

---

## 2. HALLAZGOS CRÍTICOS 🚨

### 2.1 CONTRASEÑAS SIN ENCRIPTAR ⚠️ CRÍTICO

**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
// CÓDIGO ACTUAL (INSEGURO)
if (!user || user.password !== parsed.data.password) {
    return c.json({ ok: false, error: 'Credenciales inválidas' }, 401);
}
```

**Problemas:**
- ✗ Contraseñas comparadas en texto plano
- ✗ Almacenadas sin hash
- ✗ bcryptjs está instalado pero NO se usa
- ✗ SQL injection teórico si hubiera DB real

**Impacto:** Si la BD se exfiltrada, todos los usuarios quedan comprometidos.

**Recomendación:**
```typescript
// CORRECTO
import bcrypt from 'bcryptjs';

// Al registrar
const hashedPassword = await bcrypt.hash(password, 12);

// Al validar
const isValid = await bcrypt.compare(passwordProvidido, user.password);
```

---

### 2.2 ALMACENAMIENTO EN MEMORIA (NO PERSISTIDO) 🔴 CRÍTICO

**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
const usersById = new Map<string, AppUser>();  // Línea 608
let userCounter = 9;                             // Línea 616

// Los usuarios se pierden al reiniciar el servidor ❌
```

**Problemas:**
- ✗ Todos los registros se pierden al reiniciar
- ✗ No hay persistencia en BD
- ✗ Carpeta `/db` está **vacía**
- ✗ No hay Prisma, PostgreSQL, MongoDB configurado
- ✗ Simulación de BD solamente

**Impacto:** En producción, cualquier reinicio del servidor pierde todos los usuarios.

**Recomendación:** Implementar una BD real:
```bash
# Opción 1: PostgreSQL + Prisma
npm install @prisma/client
npx prisma init

# Opción 2: Turso (SQLite serverless)
npm install @libsql/client

# Opción 3: MongoDB
npm install mongoose
```

---

### 2.3 SECRETO DE SESIÓN DÉBIL

**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
const SESSION_SECRET = process.env.SESSION_SECRET ?? 
    'simple_v2_dev_session_secret_change_me';  // ⚠️ DEFAULT

const SESSION_COOKIE = 'simple_session';
```

**Problemas:**
- ✗ Si `SESSION_SECRET` no está en env, usa default débil
- ✗ Secreto legible en código
- ✗ En .env local dice: `SESSION_SECRET=simple_v2_local_dev_secret_change_me`
- ✗ Si se expone el código, el secreto se expone

**Recomendación:**
```bash
# En .env.production
SESSION_SECRET=$(openssl rand -base64 32)  # Generar aleatorio

# En código - hacer REQUIRED
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET required in production');
}
```

---

## 3. VALIDACIÓN - LADO CLIENTE ❌ DEFICIENTE

### FORMULARIO REGISTRO
**Ubicación:** [apps/simpleautos/src/components/auth/auth-modal.tsx](../apps/simpleautos/src/components/auth/auth-modal.tsx)

```typescript
// ACTUAL (INSUFICIENTE)
<input 
    type="password" 
    value={password} 
    onChange={(e) => setPassword(e.target.value)} 
    placeholder="Contraseña" 
    required  // ← Solo HTML required ⚠️
/>
```

**Problemas:**
- ✗ Solo `required` HTML
- ✗ Sin validación de complejidad
- ✗ Sin requisitos mínimos de contraseña
- ✗ Sin feedback de fortaleza
- ✗ Sin validación en tiempo real

**Recomendación:**
```typescript
// Agregar validación
const validatePassword = (pwd: string): {valid: boolean; errors: string[]} => {
    const errors = [];
    if (pwd.length < 12) errors.push('Mínimo 12 caracteres');
    if (!/[A-Z]/.test(pwd)) errors.push('Requiere mayúscula');
    if (!/[a-z]/.test(pwd)) errors.push('Requiere minúscula');
    if (!/[0-9]/.test(pwd)) errors.push('Requiere número');
    if (!/[!@#$%^&*]/.test(pwd)) errors.push('Requiere símbolo');
    return { valid: errors.length === 0, errors };
};

// Mostrar errores al usuario
{error && <PanelNotice tone="error">{error}</PanelNotice>}
```

---

## 4. VALIDACIÓN - LADO SERVIDOR ⚠️ PARCIAL

### SCHEMA REGISTRO
**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
const registerSchema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(120),  // ⚠️ DÉBIL: solo 6 caracteres
});
```

**Validaciones Presentes:**
- ✓ Email válido (Zod email() validator)
- ✓ Nombre: 2-80 caracteres
- ✓ Contraseña: 6-120 caracteres
- ✓ Trim y lowercase en email

**Falta:**
- ✗ Longitud **mínima** de contraseña demasiado baja (6 char vs recomendado 12+)
- ✗ Sin requisitos de **complejidad** (mayúscula, número, símbolo)
- ✗ Sin validación de **nombre** (caracteres permitidos, no SQL injection)
- ✗ Sin rate limiting por IP/email
- ✗ Sin validación de dominios de email

**Recomendación:**
```typescript
const registerSchema = z.object({
    name: z
        .string()
        .min(2)
        .max(80)
        .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/, 'Solo letras, espacios, guiones y apóstrofos'),
    email: z
        .string()
        .email()
        .refine(e => !isDisposableEmail(e), 'Email temporal no permitido'),
    password: z
        .string()
        .min(12, 'Mínimo 12 caracteres')
        .max(120)
        .regex(/[A-Z]/, 'Requiere mayúscula')
        .regex(/[a-z]/, 'Requiere minúscula')
        .regex(/[0-9]/, 'Requiere número')
        .regex(/[!@#$%^&*]/, 'Requiere símbolo especial'),
});
```

---

## 5. VERIFICACIÓN DE DUPLICADOS ✓ CORRECTO

**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
const existing = getUserByEmail(parsed.data.email);
if (existing) {
    return c.json({ ok: false, error: 'Email ya registrado' }, 409);
}
```

✓ **Correcto:**
- Email se normaliza (lowercase + trim) antes de buscar
- Se verifica duplicado
- Retorna 409 Conflict
- Logueado adecuadamente

⚠️ **Improvements:**
- Agregar rate limiting para evitar enumerate emails
- Añadir delay aleatorio para evitar timing attacks
- Log de intentos fallidos

---

## 6. EMAILS DE CONFIRMACIÓN ✗ NO IMPLEMENTADO

**Halazgo:**
- ✗ No hay confirmación de email
- ✗ Usuario registrado inmediatamente
- ✗ No hay verificación de posesión de email
- ✗ La opción "recovery" es solo UI (no hace nada)

**Ubicación:** [apps/simpleautos/src/components/auth/auth-modal.tsx](../apps/simpleautos/src/components/auth/auth-modal.tsx)

```typescript
const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Si el correo electrónico existe, recibirás instrucciones para restablecer tu contraseña.');
    // ⚠️ No hace nada
};
```

**Impacto:**
- Usuarios pueden registrar emails de otros
- Sin verificación de posesión
- Sin recovery real

**Recomendación:**
```typescript
// Implementar email verification
app.post('/api/auth/register', async (c) => {
    // ... validación ...
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
    
    // Guardar token temporal
    verificationTokens.set(verificationToken, {
        email: newUser.email,
        userId: newUser.id,
        expiresAt
    });
    
    // Enviar email
    await sendVerificationEmail(newUser.email, verificationToken);
    
    return c.json({ ok: true, message: 'Verifica tu email' });
});

// Endpoint para verificar
app.post('/api/auth/verify-email', (c) => {
    const { token } = await c.req.json();
    const verification = verificationTokens.get(token);
    
    if (!verification || verification.expiresAt < Date.now()) {
        return c.json({ ok: false, error: 'Token inválido' }, 400);
    }
    
    // Marcar como verificado
    const user = usersById.get(verification.userId);
    user.emailVerified = true;
    verificationTokens.delete(token);
    
    return c.json({ ok: true });
});
```

---

## 7. SESIONES Y AUTENTICACIÓN ✓ BIEN (CON NOTAS)

### JWT + Cookies

**Ubicación:** [services/api/src/index.ts](../services/api/src/index.ts)

```typescript
function setSession(c: Context, userId: string): void {
    const sessionToken = jwt.sign({ sub: userId }, SESSION_SECRET, { 
        expiresIn: '14d' 
    });

    setCookie(c, SESSION_COOKIE, sessionToken, {
        httpOnly: true,        // ✓ Protege contra XSS
        sameSite: 'Lax',       // ✓ Protege contra CSRF
        secure: process.env.NODE_ENV === 'production',  // ✓ HTTPS only en prod
        path: '/',
        maxAge: 60 * 60 * 24 * 14,  // ✓ 14 días
    });
}
```

✓ **Lo Correcto:**
- JWT con expiración
- HttpOnly cookie
- SameSite: Lax
- Secure flag en producción
- 14 días de expiración razonable

⚠️ **Mejoras Recomendadas:**
- Implementar refresh tokens (15 min access + 7 días refresh)
- Agregar blacklist de tokens revocados
- Log de sesiones activas por usuario
- Validación de user agent para detectar hijacking

---

## 8. PROTECCIONES FALTANTES 🚨

### 8.1 Sin Rate Limiting
```typescript
// ACTUALMENTE: Cualquiera puede intentar infinitas veces
POST /api/auth/register
POST /api/auth/login

// RECOMENDADO: Máximo 5 intentos por IP/hora
```

### 8.2 Sin CSRF Protection
```typescript
// No hay verificación de X-CSRF-Token
// Aunque SameSite: Lax brinda protección, mejor ser explícito
```

### 8.3 Sin Validación de Content-Type
```typescript
// Aceptaría cualquier Content-Type
// Debe ser application/json obligatoriamente
```

### 8.4 Sin Logging de Seguridad
```typescript
// No hay registro de:
// - Intentos fallidos de login
// - Cambios de email/contraseña
// - Acceso desde nuevas ubicaciones
// - Dispositivos desconocidos
```

### 8.5 Sin Protección de Información Sensible
```typescript
// Las respuestas podrían filtrar información
// Ej: "Email ya registrado" permite enumerar usuarios
// Mejor: "Si el email existe, recibirás instrucciones"
```

---

## 9. RECOMENDACIONES PARA PRODUCCIÓN 🏭

### PRIORIDAD 1: CRÍTICA (Implementar ya)
- [ ] **Encriptar contraseñas con bcrypt**
- [ ] **Implementar BD real** (no en memoria)
- [ ] **Validación de contraseña robusta** (12+ chars, complejidad)
- [ ] **Verificación de email**
- [ ] **Rate limiting en endpoints auth**

### PRIORIDAD 2: ALTA (Antes de producción)
- [ ] Refresh tokens (access token corto + refresh token largo)
- [ ] Logging de seguridad (auditoría)
- [ ] Detección de anomalías (múltiples intentos fallidos)
- [ ] CORS restrictivo (solo dominios permitidos)
- [ ] Validación de User-Agent
- [ ] IP whitelisting opcional por usuario

### PRIORIDAD 3: MEDIA (Próximas sprints)
- [ ] Two-factor authentication (2FA)
- [ ] Autenticación con OAuth (Google, GitHub)
- [ ] Recuperación de contraseña segura
- [ ] Notificaciones de actividad sospechosa
- [ ] Análisis de password breach (HaveIBeenPwned API)

### PRIORIDAD 4: BAJA (Futura)
- [ ] Biometric authentication
- [ ] Passwordless login (magic links)
- [ ] Session binding (IP + User-Agent)
- [ ] Device fingerprinting

---

## 10. CÓDIGO DE REFERENCIA - IMPLEMENTACIÓN SEGURA

### Setup de BD con Prisma

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**.env**
```
DATABASE_URL="postgresql://user:password@localhost:5432/simple_v2"
SESSION_SECRET=$(openssl rand -base64 32)
```

**schema.prisma**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String    // Será hash
  emailVerified Boolean   @default(false)
  role          String    @default("user")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  sessions      Session[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model EmailVerification {
  id         String   @id @default(cuid())
  email      String
  token      String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

**Endpoint seguro**
```typescript
import bcrypt from 'bcryptjs';
import { prisma } from './db';

app.post('/api/auth/register', async (c) => {
    const payload = await c.req.json();
    const parsed = registerSchema.safeParse(payload);
    
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Datos inválidos' }, 400);
    }
    
    // Verificar duplicado
    const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() }
    });
    
    if (existing) {
        return c.json({ ok: false, error: 'Email registrado' }, 409);
    }
    
    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    
    // Crear usuario
    const newUser = await prisma.user.create({
        data: {
            email: parsed.data.email.toLowerCase().trim(),
            name: parsed.data.name.trim(),
            password: hashedPassword,
            role: 'user'
        }
    });
    
    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerification.create({
        data: {
            email: newUser.email,
            token: verificationToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
    });
    
    // Enviar email
    await sendVerificationEmail(newUser.email, verificationToken);
    
    return c.json({ 
        ok: true, 
        message: 'Verifica tu email para completar el registro'
    }, 201);
});
```

---

## 11. TABLA COMPARATIVA - ESTADO ACTUAL vs RECOMENDADO

| Aspecto | Actual | Recomendado | Riesgo |
|--------|--------|-------------|--------|
| Almacenamiento | En memoria | DB real | 🔴 CRÍTICO |
| Encriptación | Texto plano | bcrypt | 🔴 CRÍTICO |
| Min. contraseña | 6 chars | 12+ chars | 🔴 CRÍTICO |
| Complejidad | Ninguna | Alta | 🟠 ALTO |
| Email verificación | No | Sí | 🟠 ALTO |
| Rate limiting | No | Sí | 🟠 ALTO |
| Refresh tokens | No | Sí | 🟡 MEDIO |
| 2FA | No | Sí (futuro) | 🟡 MEDIO |
| Logging | No | Completo | 🟡 MEDIO |
| CORS | Básico | Restrictivo | 🟡 MEDIO |

---

## 12. CHECKLIST DE PRODUCCIÓN

```bash
# Antes de ir a producción:
[ ] Contraseñas encriptadas con bcrypt
[ ] BD persistente (PostgreSQL, MySQL, o equivalente)
[ ] Verificación de email requerida
[ ] Rate limiting en login/register
[ ] Validación de contraseña robusta (12+ chars)
[ ] Secreto de sesión aleatorio generado
[ ] HTTPS forzado (secure: true en cookies)
[ ] Logging de seguridad habilitado
[ ] Tests de seguridad automatizados
[ ] Documentación de política de contraseñas
[ ] Plan de recuperación de cuenta
[ ] Monitoreo de intentos de fuerza bruta
[ ] Backups automáticos de BD
[ ] SSL/TLS configurado
[ ] Headers de seguridad (HSTS, CSP, etc.)
```

---

## 13. CONCLUSIÓN

### Estado General: 🟠 ACEPTABLE PARA DESARROLLO

El sistema funciona correctamente para **desarrollo y testing**, pero **NO está listo para producción**. Los problemas de seguridad son graves pero **solucionables**.

### Timeframe Estimado para Producción:
- **Fixes críticos:** 2-3 días
- **Mejoras de seguridad:** 1 semana
- **Testing:** 3-5 días
- **Despliegue:** 1 día

**Total: ~2 semanas**

### Prioridad de Acción:
1. Implementar BD real (**hoy**)
2. Añadir encriptación de contraseñas (**hoy**)
3. Validación robusta (**mañana**)
4. Verificación de email (**semana 1**)
5. Rate limiting (**semana 1**)

---

## 14. REFERENCIAS Y RECURSOS

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidance](https://pages.nist.gov/800-63-3/)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Session Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

**Documento preparado para auditoría completa**  
**Color scheme:** 🔴 Crítico | 🟠 Alto | 🟡 Medio | ✓ Bien
