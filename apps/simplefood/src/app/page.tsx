import { IconClockHour4, IconFlame } from "@tabler/icons-react";
import FoodSearchBox from '@/components/search/FoodSearchBox';

const metrics = [
  { label: "Restaurantes activos", value: "+2,000" },
  { label: "Pedidos diarios", value: "85K" },
  { label: "Tiempo medio", value: "26 min" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-lightbg dark:bg-darkbg">
      <section className="hero-stack w-full flex flex-col items-center justify-center pb-6">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="hero-shell hero-card relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-lightcard/70 dark:bg-darkcard/70" />
              <div className="hero-content relative z-10 flex flex-col items-center text-center gap-6">
                <h1 className="text-4xl md:text-6xl font-extrabold text-lighttext dark:text-darktext max-w-4xl">
                  Delivery conectado al ecosistema Simple
                </h1>
                
              </div>
            </div>
            <div className="hero-floating-panel w-full">
              <FoodSearchBox />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 md:px-8 lg:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl card-surface shadow-card px-4 py-4 text-center"
            >
              <p className="text-3xl font-bold text-primary">{metric.value}</p>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full px-4 md:px-8 lg:px-8 pb-12">
        <div className="rounded-3xl card-surface shadow-card p-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 justify-between text-sm text-lighttext/70 dark:text-darktext/70">
            <span className="flex items-center gap-2"><IconClockHour4 size={16} /> Cocina sincronizada en tiempo real</span>
            <span className="flex items-center gap-2"><IconFlame size={16} /> Algoritmos de demanda compartidos</span>
          </div>
          <p className="text-base text-lighttext dark:text-darktext">
            Menu Builder 3.0 permite publicar combos y planes de suscripción que luego se replican en SimpleAutos y SimpleTiendas para experiencias cross-sell.
          </p>
        </div>
      </section>

      <section className="w-full px-4 md:px-8 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="rounded-3xl card-surface shadow-card p-8 space-y-4">
            <h2 className="text-3xl font-bold text-lighttext dark:text-darktext">Operaciones conectadas</h2>
            <p className="text-base text-lighttext/70 dark:text-darktext/70">
              Integra POS, sensores de cocina y operadores logísticos para tener visibilidad completa del viaje del pedido.
            </p>
            <ul className="space-y-2 text-sm text-lighttext/80 dark:text-darktext/80">
              <li>• Smart-routing que asigna repartidores según SLA compartidos con otros verticales.</li>
              <li>• Single sign-on para staff y dueños en todo el ecosistema.</li>
              <li>• APIs unificadas para insights de inventario perecible.</li>
            </ul>
          </div>
          <div className="rounded-3xl card-surface shadow-card ring-1 ring-border/60 p-8 space-y-4">
            <h2 className="text-3xl font-bold text-lighttext dark:text-darktext">Campañas y experiencias</h2>
            <p className="text-base text-lighttext/70 dark:text-darktext/70">
              Dispara campañas conjuntas entre SimpleFood y SimpleTiendas para combos físicos + delivery.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {['Menús fantasma', 'Combos express', 'Eventos corporativos', 'Suscripciones semanales'].map((item) => (
                <div key={item} className="rounded-2xl card-surface shadow-card px-4 py-3 text-center">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
