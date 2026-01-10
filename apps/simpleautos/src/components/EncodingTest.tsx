// Componente de prueba para verificar codificación UTF-8
export default function EncodingTest() {
  return (
    <div className="p-4 card-surface rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Prueba de Codificación UTF-8</h2>
      <div className="space-y-2">
        <p>Vehículos: Vehículos</p>
        <p>Propiedades: Propiedades</p>
        <p>Categorías: Categorías</p>
        <p>Teléfono: Teléfono</p>
        <p>Dirección: Dirección</p>
        <p>Descripción: Descripción</p>
        <p>Caracteres especiales: áéíóúñ ÁÉÍÓÚÑ</p>
      </div>
    </div>
  );
}