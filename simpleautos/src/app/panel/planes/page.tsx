import { Button } from "@/components/ui/Button";

export default function Planes() {

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-4 flex flex-row gap-8 items-center" style={{ alignItems: 'center', width: '100%' }}>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Planes</h1>
          <p className="text-gray-600 dark:text-gray-300">Elige el plan que mejor se adapte a tus necesidades.</p>
        </div>
  {/* Sin botón de ver todos los planes */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[ 
          { nombre: "Free", precio: "$0", features: ["1 publicación", "Soporte básico"] },
          { nombre: "Pro", precio: "$9.990", features: ["10 publicaciones", "Destacados", "Soporte prioritario"] },
          { nombre: "Empresa", precio: "$29.990", features: ["Ilimitadas", "Branding", "Equipo"] },
        ].map((p) => (
          <div key={p.nombre} className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
            <div className="text-xl font-bold text-black dark:text-white">{p.nombre}</div>
            <div className="text-2xl mt-2 text-primary font-semibold">{p.precio}/mes</div>
            <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant="primary" size="md">Seleccionar</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
