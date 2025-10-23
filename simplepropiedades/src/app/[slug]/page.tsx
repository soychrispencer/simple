interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Imágenes */}
          <div className="space-y-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-96 flex items-center justify-center">
              <span className="text-gray-500">Imagen principal</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 flex items-center justify-center">
                <span className="text-xs text-gray-500">Img 1</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 flex items-center justify-center">
                <span className="text-xs text-gray-500">Img 2</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 flex items-center justify-center">
                <span className="text-xs text-gray-500">Img 3</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 flex items-center justify-center">
                <span className="text-xs text-gray-500">+3</span>
              </div>
            </div>
          </div>

          {/* Información */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Hermosa Casa en Providencia</h1>
              <p className="text-lighttext/60 dark:text-darktext/60">Providencia, Santiago • ID: {slug}</p>
            </div>

            <div className="text-4xl font-bold text-primary">$250.000.000</div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-darkcard rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">180 m²</div>
                <div className="text-sm text-lighttext/60 dark:text-darktext/60">Superficie</div>
              </div>
              <div className="bg-white dark:bg-darkcard rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-lighttext/60 dark:text-darktext/60">Dormitorios</div>
              </div>
              <div className="bg-white dark:bg-darkcard rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">2</div>
                <div className="text-sm text-lighttext/60 dark:text-darktext/60">Baños</div>
              </div>
              <div className="bg-white dark:bg-darkcard rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">2</div>
                <div className="text-sm text-lighttext/60 dark:text-darktext/60">Estacionamientos</div>
              </div>
            </div>

            <div className="bg-white dark:bg-darkcard rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Descripción</h2>
              <p className="text-lighttext/80 dark:text-darktext/80 leading-relaxed">
                Hermosa casa completamente remodelada en uno de los mejores sectores de Providencia.
                Cuenta con excelente distribución, terminaciones de primera calidad y una terraza
                privada con vista panorámica. Ideal para familias que buscan comodidad y tranquilidad
                en el corazón de la ciudad.
              </p>
            </div>

            <div className="bg-white dark:bg-darkcard rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Características</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">Amoblado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">Bodega</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">Logia</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">Calefacción central</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-primary text-white py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Contactar
              </button>
              <button className="flex-1 border border-lightborder dark:border-darkborder py-4 rounded-lg font-medium hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}