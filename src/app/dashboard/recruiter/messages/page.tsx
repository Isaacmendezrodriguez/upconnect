"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Recruiter = { id: string; user_id?: string; company_name?: string | null };
type ConversationKey = { student_id: string; job_id: number; job_title?: string | null; application_status?: string | null };
type MessageRow = {
  id: number;
  recruiter_id: string;
  student_id: string;
  job_id: number;
  content: string;
  sender_type: "RECRUITER" | "STUDENT";
  created_at: string;
};

export default function RecruiterMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [conversations, setConversations] = useState<ConversationKey[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationKey | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user?.id) {
          setMessage({ type: "error", text: "Usuario no autenticado." });
          setLoading(false);
          return;
        }

        // get recruiter
        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (recErr || !recData) {
          const txt = recErr ? recErr.message : "No se encontró el perfil del reclutador.";
          setMessage({ type: "error", text: txt });
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        // get jobs
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("id, title")
          .eq("recruiter_id", rec.id);

        if (jobsErr) {
          setMessage({ type: "error", text: "No fue posible cargar las vacantes." });
          setLoading(false);
          return;
        }

  const jobsListTyped = (jobsData || []) as Array<{ id: number; title?: string }>;
  const jobIds = jobsListTyped.map((j) => j.id).filter(Boolean) as number[];

        // get applications for those jobs
  type ApplicationShort = { id: number; status?: string | null; student_id: string; job_id: number };
  let appsData: ApplicationShort[] = [];
        if (jobIds.length > 0) {
          const { data: aData, error: aErr } = await supabase
            .from("applications")
            .select("id, status, student_id, job_id")
            .in("job_id", jobIds);

          if (aErr) {
            setMessage({ type: "error", text: "No fue posible cargar las postulaciones." });
            setLoading(false);
            return;
          }
          appsData = aData || [];
        }

        // build conversations unique by student_id + job_id
        const convMap = new Map<string, ConversationKey>();
        for (const app of appsData) {
          const key = `${app.student_id}::${app.job_id}`;
          if (!convMap.has(key)) {
            const job = jobsListTyped.find((j) => j.id === app.job_id);
            convMap.set(key, {
              student_id: app.student_id,
              job_id: app.job_id,
              job_title: job?.title ?? null,
              application_status: app.status ?? null,
            });
          }
        }

        // if no conversations, still optionally show empty state
        setConversations(Array.from(convMap.values()));

      } catch (err) {
        const txt = err instanceof Error ? err.message : String(err);
        console.error("init messages error:", txt);
        setMessage({ type: "error", text: "No fue posible cargar los datos." });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    // scroll to bottom when messages change
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversationMessages = async (conv: ConversationKey) => {
    if (!recruiter) return;
    setSelectedConversation(conv);
    setLoadingMessages(true);
    setMessage(null);
    try {
      const { data: messagesData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("recruiter_id", recruiter.id)
        .eq("student_id", conv.student_id)
        .eq("job_id", conv.job_id)
        .order("created_at", { ascending: true });

      if (msgErr) {
        setMessage({ type: "error", text: "No fue posible cargar los mensajes." });
        return;
      }

      setMessages((messagesData || []) as MessageRow[]);
    } catch (err) {
      const txt = err instanceof Error ? err.message : String(err);
      console.error("loadConversationMessages error:", txt);
      setMessage({ type: "error", text: "No fue posible cargar los mensajes." });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    if (!selectedConversation || !recruiter) return;
    const text = newMessage.trim();
    if (!text) return;
    setSending(true);
    try {
      const payload = {
        recruiter_id: recruiter.id,
        student_id: selectedConversation.student_id,
        job_id: selectedConversation.job_id,
        content: text,
        sender_type: "RECRUITER",
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertErr) {
        const txt = insertErr.message || String(insertErr);
        console.error("insert message error:", txt);
        setMessage({ type: "error", text: "No fue posible enviar el mensaje." });
        setSending(false);
        return;
      }

      // append message
      setMessages(prev => [...prev, inserted as MessageRow]);
      setNewMessage("");
    } catch (err) {
      const txt = err instanceof Error ? err.message : String(err);
      console.error("send message error:", txt);
      setMessage({ type: "error", text: "No fue posible enviar el mensaje." });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!recruiter) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-red-600">Usuario no autenticado o perfil de reclutador no encontrado.</p>
            <div className="mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => router.push("/auth/login")}>Regresar</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Centro de Mensajes</h1>
            {recruiter && <p className="text-sm text-gray-600">{recruiter.company_name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600" onClick={() => router.push("/dashboard/recruiter")}>Regresar</button>
          </div>
        </header>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: conversations */}
          <aside className="bg-white rounded shadow p-3 md:col-span-1">
            <h3 className="text-lg font-medium mb-3">Conversaciones</h3>
            {conversations.length === 0 ? (
              <div className="text-sm text-gray-500">No hay conversaciones aún.</div>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => {
                  const isSelected = selectedConversation && selectedConversation.student_id === conv.student_id && selectedConversation.job_id === conv.job_id;
                  return (
                    <button
                      key={`${conv.student_id}::${conv.job_id}`}
                      className={`w-full text-left px-3 py-2 rounded mb-1 ${isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                      onClick={() => loadConversationMessages(conv)}
                    >
                      <div className="font-medium text-sm">{conv.job_title ?? `Vacante #${conv.job_id}`}</div>
                      <div className="text-xs text-gray-600">Student: {conv.student_id}</div>
                      {conv.application_status && <div className="text-xs text-gray-500">Estado: {conv.application_status}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Right: chat */}
          <section className="bg-white rounded shadow p-3 md:col-span-2 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 mb-3" ref={messagesRef} style={{ maxHeight: 520 }}>
              {!selectedConversation ? (
                <div className="text-sm text-gray-500">Selecciona una conversación para ver mensajes.</div>
              ) : loadingMessages ? (
                <div className="text-sm text-gray-500">Cargando mensajes...</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500">No hay mensajes en esta conversación.</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`max-w-xs px-3 py-2 rounded text-sm ${msg.sender_type === "RECRUITER" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-gray-100 text-gray-800"}`}>
                    <p>{msg.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <textarea
                className="flex-1 border rounded px-3 py-2 text-sm"
                rows={2}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedConversation ? "Escribe un mensaje para el estudiante..." : "Selecciona una conversación para enviar mensaje..."}
                disabled={!selectedConversation}
              />
              <button
                type="submit"
                disabled={sending || !selectedConversation || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded h-fit"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}


