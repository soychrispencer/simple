export default function PanelPage() {
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Panel de Control</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-darkcard rounded-xl shadow-card p-6">
            <h2 className="text-xl font-semibold mb-4">Mis Propiedades</h2>
            <p className="text-lighttext/60 dark:text-darktext/60">
              Gestiona tus propiedades publicadas
            </p>
          </div>
          <div className="bg-white dark:bg-darkcard rounded-xl shadow-card p-6">
            <h2 className="text-xl font-semibold mb-4">Estadísticas</h2>
            <p className="text-lighttext/60 dark:text-darktext/60">
              Visitas, interesados y métricas
            </p>
          </div>
          <div className="bg-white dark:bg-darkcard rounded-xl shadow-card p-6">
            <h2 className="text-xl font-semibold mb-4">Perfil</h2>
            <p className="text-lighttext/60 dark:text-darktext/60">
              Configuración de empresa y perfil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}