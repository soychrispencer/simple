"use client";
import React from "react";
import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { useNotifications } from "@/context/NotificationsContext";

export default function Mensajes() {
  const [convos] = React.useState<any[]>([]); // TODO: Implementar tabla de conversaciones
  const [active, setActive] = React.useState<string | null>(null);
  const [texto, setTexto] = React.useState("");
  const [msgs, setMsgs] = React.useState<{ id: string; yo?: boolean; texto: string; hora: string }[]>([]);
  const { createNotification } = useNotifications();

  const enviar = async () => {
    if (!texto.trim()) return;
    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch (e) {}
    const sanitizedTexto = DOMPurify ? DOMPurify.sanitize(texto) : texto;
    setMsgs((m) => [...m, { id: crypto.randomUUID(), yo: true, texto: sanitizedTexto, hora: new Date().toLocaleTimeString().slice(0,5) }]);

    // Ejemplo: Crear notificación cuando se envía un mensaje
    await createNotification('message', 'Mensaje enviado', `Respondiste a ${convos.find(c => c.id === active)?.nombre}`);

    setTexto("");
  };

  return (
    <PanelPageLayout
      header={{
        title: "Mensajes",
        description: "Gestiona tus conversaciones y mensajes recibidos."
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <aside className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-4">
          <h3 className="font-semibold mb-3 text-lighttext dark:text-darktext">Conversaciones</h3>
          <div className="space-y-2">
            {convos.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No tienes conversaciones aún.<br />
                <span className="text-xs">Esta funcionalidad estará disponible próximamente.</span>
              </div>
            ) : (
              convos.map((c) => (
                <Button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full text-left text-sm ${active === c.id ? "!bg-primary !text-white" : ''}`}
                  variant={active === c.id ? 'primary' : 'neutral'}
                  size="sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-xs opacity-70">{c.hora}</span>
                  </div>
                  <div className="text-sm opacity-80 line-clamp-1">{c.ultimo}</div>
                </Button>
              ))
            )}
          </div>
        </aside>
        <section className="md:col-span-2 bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 text-lighttext dark:text-darktext">
            {active ? `Chat con ${convos.find(c=>c.id===active)?.nombre}` : 'Selecciona una conversación'}
          </div>
          <div className="flex-1 p-4 space-y-2 overflow-auto">
            {active && msgs.length > 0 ? (
              msgs.map(m => (
                <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-lg ${m.yo ? "ml-auto bg-primary text-white" : "bg-gray-100 dark:bg-gray-900 text-black dark:text-white"}`}>
                  <div className="text-sm">{m.texto}</div>
                  <div className="text-[10px] opacity-70 mt-1 text-right">{m.hora}</div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                {active ? 'No hay mensajes en esta conversación.' : 'Selecciona una conversación para ver los mensajes.'}
              </div>
            )}
          </div>
          {active && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
              <input 
                value={texto} 
                onChange={(e)=>setTexto(e.target.value)} 
                className="flex-1 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-900 text-black dark:text-white outline-none" 
                placeholder="Escribe un mensaje"
                onKeyPress={(e) => e.key === 'Enter' && enviar()}
              />
              <Button variant="primary" size="md" onClick={enviar} disabled={!texto.trim()}>Enviar</Button>
            </div>
          )}
        </section>
      </div>
    </PanelPageLayout>
  );
}
