export default function PublicarPropiedadPage() {
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Publicar Propiedad</h1>

        <div className="bg-white dark:bg-darkcard rounded-xl shadow-card p-8">
          <div className="space-y-8">
            {/* Paso 1: Datos básicos */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Paso 1: Datos Básicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Propiedad</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
                    <option>Casa</option>
                    <option>Departamento</option>
                    <option>Oficina</option>
                    <option>Terreno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Operación</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
                    <option>Venta</option>
                    <option>Arriendo</option>
                    <option>Subasta</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Paso 2: Ubicación */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Paso 2: Ubicación</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Región</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
                    <option>Metropolitana</option>
                    <option>Valparaíso</option>
                    <option>Biobío</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Comuna</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
                    <option>Santiago</option>
                    <option>Providencia</option>
                    <option>Las Condes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Paso 3: Detalles */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Paso 3: Detalles de la Propiedad</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Superficie (m²)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dormitorios</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Baños</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                    placeholder="2"
                  />
                </div>
              </div>
            </div>

            {/* Paso 4: Precio */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Paso 4: Precio</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Precio (CLP)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                  placeholder="150000000"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-between pt-8">
              <button className="px-6 py-3 rounded-lg border border-lightborder dark:border-darkborder hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
                Anterior
              </button>
              <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}