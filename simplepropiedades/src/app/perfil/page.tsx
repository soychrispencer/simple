export default function PerfilPage() {
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Mi Perfil</h1>
        <div className="bg-white dark:bg-darkcard rounded-xl shadow-card p-8">
          <h2 className="text-xl font-semibold mb-6">Información Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sitio Web</label>
              <input
                type="url"
                className="w-full px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
                placeholder="https://tu-sitio.com"
              />
            </div>
          </div>
          <div className="mt-8">
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}