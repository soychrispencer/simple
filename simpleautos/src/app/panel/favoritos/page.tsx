import PanelPageLayout from "@/components/panel/PanelPageLayout";
export default function Favoritos() {
  const favs = [
    { id: "f1", titulo: "Hyundai Tucson 2021", precio: 16800000, portada: "/file.svg" },
    { id: "f2", titulo: "Kia Rio 2018", precio: 6500000, portada: "/file.svg" },
  ];
  return (
    <PanelPageLayout
      header={{
        title: "Favoritos",
        description: "Tus vehículos favoritos y guardados."
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {favs.map((i) => (
          <div key={i.id} className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
            <div className="h-36 bg-lightbg dark:bg-darkbg flex items-center justify-center">
              <img src={i.portada} alt="portada" className="w-20 h-20 object-contain opacity-60" />
            </div>
            <div className="p-4">
              <div className="font-medium text-lighttext dark:text-darktext line-clamp-1">{i.titulo}</div>
              <div className="text-sm text-lighttext dark:text-darktext">${i.precio.toLocaleString()}</div>
              <div className="mt-3 flex items-center gap-2">
                <button className="ml-auto text-sm px-2 py-1 rounded bg-lightbg dark:bg-darkbg text-lighttext dark:text-darktext">Ver</button>
                <button className="text-sm px-2 py-1 rounded bg-red-600 text-white">Quitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelPageLayout>
  );
}
