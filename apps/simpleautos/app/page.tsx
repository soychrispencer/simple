import { Header, Footer, Button, Card, Badge } from '@simple/ui';
import { IconSearch, IconCar, IconTruck, IconMotorbike, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        logo={
          <Link href="/" className="text-2xl font-bold text-primary">
            Simple<span className="font-normal">Autos</span>
          </Link>
        }
        navigation={
          <>
            <Link
              href="/ventas"
              className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            >
              Ventas
            </Link>
            <Link
              href="/arriendos"
              className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            >
              Arriendos
            </Link>
            <Link
              href="/subastas"
              className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            >
              Subastas
            </Link>
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="md">
              Ingresar
            </Button>
            <Button variant="primary" size="md">
              Vender mi Auto
            </Button>
          </>
        }
        sticky
      />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="primary" size="lg" className="mb-6">
                <IconSparkles size={16} className="mr-1" />
                Más de 10,000 vehículos disponibles
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
                Encuentra el <span className="text-primary">vehículo perfecto</span> para ti
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Compra, vende y arrienda con confianza. La plataforma más segura y confiable de
                Chile.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button variant="primary" size="lg" leftIcon={<IconSearch size={20} />}>
                  Buscar Vehículos
                </Button>
                <Button variant="secondary" size="lg">
                  Vender mi Auto
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              ¿Qué estás buscando?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card variant="elevated" hoverable className="p-8 text-center cursor-pointer">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconCar size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Automóviles</h3>
                <p className="text-gray-600 dark:text-gray-400">Sedán, SUV, hatchback y más</p>
                <Badge variant="primary" className="mt-4">
                  +5,000 disponibles
                </Badge>
              </Card>

              <Card variant="elevated" hoverable className="p-8 text-center cursor-pointer">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconTruck size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Camionetas</h3>
                <p className="text-gray-600 dark:text-gray-400">Pickup, van, carga y trabajo</p>
                <Badge variant="primary" className="mt-4">
                  +3,000 disponibles
                </Badge>
              </Card>

              <Card variant="elevated" hoverable className="p-8 text-center cursor-pointer">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconMotorbike size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Motocicletas</h3>
                <p className="text-gray-600 dark:text-gray-400">Sport, touring, urbanas</p>
                <Badge variant="primary" className="mt-4">
                  +2,000 disponibles
                </Badge>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card
              variant="elevated"
              className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-r from-primary/5 to-primary/10"
            >
              <h2 className="text-3xl font-bold mb-4">¿Quieres vender tu vehículo?</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Publica tu anuncio en minutos y llega a miles de compradores potenciales
              </p>
              <Button variant="primary" size="lg">
                Publicar Ahora Gratis
              </Button>
            </Card>
          </div>
        </section>
      </main>

      <Footer
        logo={
          <Link href="/" className="text-2xl font-bold text-primary">
            Simple<span className="font-normal">Autos</span>
          </Link>
        }
        description="La plataforma más confiable para comprar, vender y arrendar vehículos en Chile."
        links={[
          {
            title: 'Producto',
            items: [
              { label: 'Ventas', href: '/ventas' },
              { label: 'Arriendos', href: '/arriendos' },
              { label: 'Subastas', href: '/subastas' },
            ],
          },
          {
            title: 'Empresa',
            items: [
              { label: 'Sobre Nosotros', href: '/about' },
              { label: 'Contacto', href: '/contact' },
              { label: 'Blog', href: '/blog' },
            ],
          },
          {
            title: 'Legal',
            items: [
              { label: 'Términos', href: '/terms' },
              { label: 'Privacidad', href: '/privacy' },
            ],
          },
        ]}
        copyright=" 2025 SimpleAutos. Todos los derechos reservados."
      />
    </div>
  );
}
