# SimplePropiedades

Plataforma inmobiliaria moderna para Chile, parte del ecosistema Simple (SimpleAutos, SimplePropiedades, etc.).

## 🚀 Características

- **Búsqueda avanzada** de propiedades por ubicación, precio, tipo y características
- **Publicación guiada** en pasos para vendedores e inmobiliarias
- **Panel de control** completo para gestión de propiedades
- **Sistema de autenticación** seguro con Supabase
- **Diseño responsive** con modo oscuro
- **SEO optimizado** para motores de búsqueda

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript
- **Estilos**: Tailwind CSS 3.4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Despliegue**: Vercel

## 📁 Estructura del Proyecto

```
simplepropiedades/
├── src/
│   ├── app/                 # Rutas de Next.js (App Router)
│   │   ├── auth/           # Autenticación
│   │   ├── panel/          # Panel de usuario
│   │   ├── perfil/         # Perfil de usuario
│   │   ├── propiedades/    # Listado de propiedades
│   │   ├── publicar-propiedad/ # Publicación de propiedades
│   │   └── [slug]/         # Página individual de propiedad
│   ├── components/         # Componentes reutilizables
│   ├── context/            # Contextos de React
│   ├── lib/                # Utilidades y configuración
│   └── types/              # Tipos TypeScript
├── supabase/
│   └── migrations/         # Migraciones de base de datos
└── public/                 # Archivos estáticos
```

## 🚀 Inicio Rápido

1. **Clona el repositorio**
   ```bash
   git clone <url-del-repo>
   cd simplepropiedades
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura variables de entorno**
   ```bash
   cp .env.example .env.local
   # Edita .env.local con tus credenciales de Supabase
   ```

4. **Ejecuta migraciones de base de datos**
   ```bash
   # Ejecuta las migraciones en tu proyecto Supabase
   ```

5. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

6. **Abre [http://localhost:3000](http://localhost:3000)**

## 📊 Base de Datos

El proyecto utiliza las siguientes tablas principales:

- `agencies` - Inmobiliarias y empresas
- `properties` - Propiedades en venta/arriendo
- `property_images` - Imágenes de propiedades
- `favorites` - Propiedades favoritas de usuarios
- `regions` / `communes` - Ubicaciones geográficas

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linting con ESLint

## 🌐 Despliegue

El proyecto está optimizado para despliegue en Vercel:

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Ejecuta las migraciones en Supabase
4. ¡Listo para producción!

## 📝 Licencia

Este proyecto es parte del ecosistema Simple y está destinado al mercado chileno.

## 🤝 Contribuir

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto, contacta al equipo de desarrollo.