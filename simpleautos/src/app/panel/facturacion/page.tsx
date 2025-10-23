import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { createServerClient } from "@/lib/supabase/serverSupabase";
import { format } from "@/lib/format";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  description: string;
  created_at: string;
}

async function getUserInvoices(): Promise<Invoice[]> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data || [];
}

export default async function Facturacion() {
  const invoices = await getUserInvoices();

  return (
    <PanelPageLayout
      header={{
        title: "Facturación",
        description: "Descarga comprobantes y revisa el estado de tus pagos.",
        actions: <Button variant="primary" size="md">Actualizar</Button>
      }}
    >
      <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 text-black dark:text-white font-semibold">
          Historial de boletas/facturas
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No tienes facturas aún. Tus pagos aparecerán aquí cuando completes transacciones.
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{invoice.invoice_number}</div>
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                  {format.date(invoice.created_at)}
                </div>
                <div className="w-32 text-sm">
                  {format.currency(invoice.amount / 100, { currency: invoice.currency })}
                </div>
                <span className={`state-pill ${
                  invoice.status === 'paid' ? 'state-pagada' :
                  invoice.status === 'overdue' ? 'state-pendiente' :
                  'state-pendiente'
                }`}>
                  {invoice.status === 'paid' ? 'Pagada' :
                   invoice.status === 'overdue' ? 'Vencida' :
                   invoice.status === 'sent' ? 'Enviada' :
                   invoice.status === 'draft' ? 'Borrador' :
                   'Pendiente'}
                </span>
                <Button
                  className="ml-auto"
                  variant="neutral"
                  size="sm"
                  disabled={invoice.status !== 'paid'}
                >
                  Descargar PDF
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </PanelPageLayout>
  );
}
