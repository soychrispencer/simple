import { IconShoppingCart, IconChartArrowsVertical, IconTruckDelivery } from "@tabler/icons-react";
import StoreSearchBox from '@/components/search/StoreSearchBox';

const highlights = [
  {
    title: "Marketplace unificado",
    description: "Publica una vez y sincroniza tu catálogo en móvil, web y kioscos físicos.",
    icon: IconShoppingCart,
  },
  {
    title: "Panel en tiempo real",
    description: "Controla inventario, precios y órdenes desde un dashboard moderno.",
    icon: IconChartArrowsVertical,
  },
  {
    title: "Logística integrada",
    description: "Conecta operadores last-mile y retiros en tienda con un solo clic.",
    icon: IconTruckDelivery,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="hero-stack w-full flex flex-col items-center justify-center pb-6">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="hero-shell hero-card relative w-full text-center">
              <div className="absolute inset-0 bg-lightcard/70 dark:bg-darkcard/70" />
              <div className="hero-content relative z-10 flex flex-col items-center gap-6 text-center">
                <h1 className="type-display-hero text-lighttext dark:text-darktext max-w-4xl">
                  Transforma tus tiendas en experiencias digitales
                </h1>
                
              </div>
            </div>
            <div className="hero-floating-panel w-full">
              <StoreSearchBox />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 md:px-8 lg:px-8 pb-12">
        <div className="section-card glow-ring px-6 py-6 md:px-10 md:py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="flex flex-col gap-2 text-left">
              <div className="flex items-center gap-2 text-primary type-title-4">
                <Icon size={18} />
                {title}
              </div>
              <p className="type-body-sm text-lighttext/70 dark:text-darktext/70">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full px-4 md:px-8 lg:px-8 py-20">
        <div className="section-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <span className="badge-pill">Operaciones</span>
            <h2 className="type-title-1 text-lighttext dark:text-darktext">
              Pedidos, pagos y logística conectados al resto del ecosistema Simple
            </h2>
            <p className="type-body-md text-lighttext/70 dark:text-darktext/70">
              SimpleTiendas comparte cuenta y datos maestros con SimpleAutos, SimplePropiedades y SimpleFood. Crea experiencias
              consistentes en todos los verticales sin duplicar integraciones ni catálogos.
            </p>
            <ul className="space-y-3 type-body-sm text-lighttext/80 dark:text-darktext/80">
              <li>• Inventario centralizado y sincronizado con marketplaces externos.</li>
              <li>• Retiros en tienda, envíos mismos-día y logística programada.</li>
              <li>• KPI unificados: margen, rotación y recurrencia por vertical.</li>
            </ul>
          </div>
          <div className="rounded-2xl card-surface ring-1 ring-border/60 p-8 shadow-card space-y-6">
            <div>
              <p className="type-label text-lighttext/60 dark:text-darktext/60">Integraciones</p>
              <h3 className="type-title-2 text-lighttext dark:text-darktext">POS &amp; ERP favoritos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 type-body-sm">
              {['Shopify', 'Vendus', 'Tango', 'Microsoft Dynamics'].map((item) => (
                <div key={item} className="p-4 rounded-xl card-surface ring-1 ring-border/60 text-center font-medium">
                  {item}
                </div>
              ))}
            </div>
            <p className="type-caption text-lighttext/60 dark:text-darktext/60">
              Integramos tu stack actual o construimos conectores a medida usando APIs compartidas del ecosistema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
