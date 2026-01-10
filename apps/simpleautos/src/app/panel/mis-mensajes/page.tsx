"use client";
import React from "react";
import { Button, PanelPageLayout, Input, Badge } from "@simple/ui";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { logError } from "@/lib/logger";
import { IconMessageCircle2, IconAlertCircle, IconLock, IconLockOpen } from "@tabler/icons-react";

type MessageRow = {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  listing_id: string | null;
  subject: string | null;
  content: string;
  is_read: boolean | null;
  status?: string | null;
  created_at: string;
  listings: {
    id: string;
    title: string | null;
    user_id: string | null;
    company_id?: string | null;
    verticals?: { key: string | null } | null;
  } | null;
};

type Thread = {
  threadId: string;
  listingId: string;
  listingTitle: string;
  counterpartyId: string;
  context: "buy" | "sell";
  unread: number;
  lastMessage: MessageRow;
  messages: MessageRow[];
  status?: string | null;
};

export default function Mensajes() {
  const supabase = useSupabase();
  const { user } = useAuth();

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "buy" | "sell">("all");
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const activeThread = React.useMemo(() => threads.find((t) => t.threadId === activeThreadId) || null, [threads, activeThreadId]);

  const loadMessages = React.useCallback(async () => {
    if (!supabase || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("messages_inbox_user")
        .select(
          `listing_id, company_id, vertical_key, listing_title, context, counterparty_id, last_message_at, last_event_at, last_message_content, status, unread, role, user_id`
        )
        .eq("user_id", user.id)
        .eq("vertical_key", "autos")
        .order("last_event_at", { ascending: false });

      if (error) throw error;
      const rows = (data || []) as any[];

      const threadsArr: Thread[] = rows.map((row) => ({
        threadId: `${row.listing_id}-${row.counterparty_id}`,
        listingId: row.listing_id,
        listingTitle: row.listing_title || "(sin título)",
        counterpartyId: row.counterparty_id,
        context: row.context === "sell" ? "sell" : "buy",
        unread: row.unread || 0,
        lastMessage: {
          id: "",
          sender_id: null,
          receiver_id: null,
          listing_id: row.listing_id,
          subject: row.listing_title,
          content: row.last_message_content || "",
          is_read: true,
          created_at: row.last_message_at || row.last_event_at || new Date().toISOString(),
          status: row.status,
          listings: {
            id: row.listing_id,
            title: row.listing_title,
            user_id: null,
            company_id: row.company_id,
            verticals: { key: row.vertical_key },
          },
        } as MessageRow,
        messages: [],
        status: row.status || "open",
      }));

      setThreads(threadsArr);
      if (threadsArr.length && !activeThreadId) {
        setActiveThreadId(threadsArr[0].threadId);
      }
    } catch (err: any) {
      logError("[Mensajes] load error", err);
      setError(err?.message || "No pudimos cargar tus mensajes.");
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, activeThreadId]);

  React.useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  React.useEffect(() => {
    if (!supabase || !user?.id) return;
    const channel = supabase
      .channel("messages-inbox")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
        },
        () => {
          void loadMessages();
        }
      );
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, user?.id, loadMessages]);

  const markRead = React.useCallback(async (thread: Thread) => {
    if (!supabase || !user?.id || !thread.counterpartyId) return;
    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .match({ listing_id: thread.listingId, receiver_id: user.id, sender_id: thread.counterpartyId });
      setThreads((prev) => prev.map((t) => (t.threadId === thread.threadId ? { ...t, unread: 0 } : t)));
    } catch (err) {
      logError("[Mensajes] mark read", err);
    }
  }, [supabase, user?.id]);

  const loadThreadMessages = React.useCallback(
    async (thread: Thread) => {
      if (!supabase || !user?.id) return;
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, receiver_id, listing_id, subject, content, is_read, status, created_at")
          .eq("listing_id", thread.listingId)
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${thread.counterpartyId}),and(sender_id.eq.${thread.counterpartyId},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        setThreads((prev) =>
          prev.map((t) => (t.threadId === thread.threadId ? { ...t, messages: (data || []) as MessageRow[] } : t))
        );
      } catch (err) {
        logError("[Mensajes] load thread messages", err);
        setError("No pudimos cargar el detalle del hilo.");
      }
    },
    [supabase, user?.id]
  );

  React.useEffect(() => {
    if (activeThread) {
      void markRead(activeThread);
      void loadThreadMessages(activeThread);
    }
  }, [activeThread, markRead, loadThreadMessages]);

  const sendMessage = React.useCallback(async () => {
    if (!supabase || !user?.id || !activeThread) return;
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      let DOMPurify: any = null;
      try {
        DOMPurify = require("isomorphic-dompurify");
      } catch {}
      const sanitized = DOMPurify ? DOMPurify.sanitize(content) : content;
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: activeThread.counterpartyId,
        listing_id: activeThread.listingId,
        content: sanitized,
        subject: activeThread.listingTitle,
        is_read: false,
      });
      if (error) throw error;
      setInput("");
      await loadMessages();
    } catch (err: any) {
      logError("[Mensajes] send", err);
      setError(err?.message || "No pudimos enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }, [supabase, user?.id, activeThread, input, loadMessages]);

  const toggleStatus = React.useCallback(async () => {
    if (!supabase || !user?.id || !activeThread) return;
    const nextStatus = activeThread.status === "closed" ? "open" : "closed";
    try {
      await supabase
        .from("messages")
        .update({ status: nextStatus, last_event_at: new Date().toISOString() })
        .eq("listing_id", activeThread.listingId)
        .or(`sender_id.eq.${activeThread.counterpartyId},receiver_id.eq.${activeThread.counterpartyId}`);

      setThreads((prev) =>
        prev.map((t) => (t.threadId === activeThread.threadId ? { ...t, status: nextStatus } : t))
      );
    } catch (err) {
      logError("[Mensajes] toggle status", err);
      setError("No pudimos actualizar el estado del hilo.");
    }
  }, [supabase, user?.id, activeThread]);

  const filteredThreads = React.useMemo(() => {
    if (filter === "all") return threads;
    return threads.filter((t) => t.context === filter);
  }, [threads, filter]);

  return (
    <PanelPageLayout
      header={{
        title: "Mensajes",
        description: "Compra y venta: conversa con compradores y vendedores desde un solo lugar.",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <aside className="card-surface shadow-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lighttext dark:text-darktext">Conversaciones</h3>
            <div className="flex gap-2 text-xs">
              {[{ key: "all", label: "Todos" }, { key: "buy", label: "Compras" }, { key: "sell", label: "Ventas" }].map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "primary" : "neutral"}
                  onClick={() => setFilter(f.key as any)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
          {loading && (
            <div className="text-sm text-lighttext/70 dark:text-darktext/70">Cargando mensajes...</div>
          )}
          {error && (
            <div className="text-sm text-[var(--color-danger)] flex items-center gap-2"><IconAlertCircle size={16} /> {error}</div>
          )}
          {!loading && !filteredThreads.length && (
            <div className="text-sm text-lighttext/70 dark:text-darktext/70 text-center py-8">
              No tienes conversaciones aún.
            </div>
          )}
          <div className="space-y-2 overflow-auto max-h-[70vh] pr-1">
            {filteredThreads.map((t) => (
              <button
                key={t.threadId}
                onClick={() => setActiveThreadId(t.threadId)}
                className={`w-full text-left px-3 py-2 rounded-xl transition border border-transparent hover:border-border/60 ${
                  activeThreadId === t.threadId ? "bg-[var(--color-primary-a10)] border-[var(--color-primary-a40)]" : "card-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-lighttext dark:text-darktext line-clamp-1">{t.listingTitle}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.context === "sell" ? "default" : "secondary"}>
                      {t.context === "sell" ? "Ventas" : "Compras"}
                    </Badge>
                    {t.status && (
                      <Badge variant="secondary">
                        {t.status}
                      </Badge>
                    )}
                    {t.unread > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-[var(--color-on-primary)]">{t.unread}</span>}
                  </div>
                </div>
                <div className="text-xs text-lighttext/70 dark:text-darktext/70 line-clamp-1">
                  {t.lastMessage.content}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="md:col-span-2 card-surface shadow-card flex flex-col min-h-[520px]">
          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <IconMessageCircle2 size={18} className="text-lighttext/80 dark:text-darktext/80" />
            <div className="flex-1">
              <p className="font-semibold text-lighttext dark:text-darktext">{activeThread?.listingTitle || "Selecciona una conversación"}</p>
              {activeThread && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">
                  {activeThread.context === "sell" ? "Ventas" : "Compras"}
                </p>
              )}
            </div>
            {activeThread && (
              <div className="flex items-center gap-2">
                <Badge variant={activeThread.status === "closed" ? "secondary" : "default"}>
                  {activeThread.status === "closed" ? "Cerrado" : "Abierto"}
                </Badge>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={toggleStatus}
                  leftIcon={activeThread.status === "closed" ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                >
                  {activeThread.status === "closed" ? "Reabrir" : "Cerrar"}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-auto">
            {!activeThread && (
              <div className="h-full flex items-center justify-center text-lighttext/60 dark:text-darktext/60">
                Selecciona una conversación para ver los mensajes.
              </div>
            )}
            {activeThread && (
              activeThread.messages.length ? (
                activeThread.messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${
                        isMine ? "ml-auto bg-primary text-[var(--color-on-primary)]" : "card-surface shadow-card text-lighttext dark:text-darktext"
                      }`}
                    >
                      <div className="text-sm">{m.content}</div>
                      <div className={`text-[10px] mt-1 text-right ${isMine ? "text-[var(--color-on-primary)] opacity-80" : "text-lighttext/60 dark:text-darktext/60"}`}>
                        {new Date(m.created_at).toLocaleString("es-CL", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-lighttext/60 dark:text-darktext/60">
                  No hay mensajes en esta conversación.
                </div>
              )
            )}
          </div>

          {activeThread && (
            <div className="p-3 flex gap-2 border-t border-border/50">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button variant="primary" size="md" onClick={sendMessage} disabled={!input.trim() || sending}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </PanelPageLayout>
  );
}







