import Link from 'next/link';
import { IconSparkles, IconArrowRight, IconCar } from '@tabler/icons-react';

export default function ServiciosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm text-lighttext/80 dark:text-darktext/80">
          <IconSparkles size={16} stroke={1.7} />
          Servicios SimpleAutos
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold text-lighttext dark:text-darktext">Servicios para vender mejor</h1>
        <p className="mt-2 text-lighttext/80 dark:text-darktext/80 max-w-3xl">
          Elige el camino que más te acomode: publicar por tu cuenta o delegar la venta con nuestro servicio asistido.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/panel/publicar-vehiculo?new=1" className="card-surface shadow-card p-6 rounded-2xl hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-primary">
            <IconCar size={20} />
            <span className="font-semibold">Publicar mi vehículo</span>
          </div>
          <div className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Publica tú mismo, gestiona tus mensajes y potencia con boosts cuando lo necesites.
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
            Ir a publicar <IconArrowRight size={16} />
          </div>
        </Link>

        <Link href="/servicios/venta-asistida" className="card-surface shadow-card p-6 rounded-2xl hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-primary">
            <IconSparkles size={20} />
            <span className="font-semibold">Venta asistida</span>
          </div>
          <div className="mt-2 text-sm text-lighttext/80 dark:text-darktext/80">
            Nosotros gestionamos publicación, interesados y negociación. Comisión sólo al vender.
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
            Ver el servicio <IconArrowRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
}
