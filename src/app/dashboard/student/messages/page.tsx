
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id: string;
  user_id?: string;
  full_name?: string | null;
  degree?: string | null;
};

type ConversationKey = {
  job_id: number;
  recruiter_id: string;
  job_title?: string | null;
  company_name?: string | null;
  application_status?: string | null;
};

type MessageRow = {
  id: number;
  recruiter_id: string;
  student_id: string;
  job_id: number;
  content: string;
  sender_type: "RECRUITER" | "STUDENT";
  created_at: string;
};

export default function StudentMessagesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [conversations, setConversations] = useState<ConversationKey[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationKey | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

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

        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (stuErr || !stuData) {
          setMessage({ type: "error", text: stuErr?.message ?? "No se encontró el perfil de estudiante." });
          setStudent(null);
          setLoading(false);
          return;
        }

        const stu = stuData as Student;
        setStudent(stu);

        // load applications with job and recruiter info
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, student_id, job_id, status, jobs(id, title, recruiters(id, company_name))")
          .eq("student_id", stu.id);

        if (appsErr) {
          throw appsErr;
        }

        type ApplicationWithJob = {
          id: number;
          student_id: string;
          job_id: number;
          status?: string | null;
          jobs?: {
            id?: number;
            title?: string | null;
            recruiters?: { id?: string | number; company_name?: string | null } | null;
          } | null;
        };

        const apps = (appsData || []) as ApplicationWithJob[];

        // build unique conversations by job_id + recruiter_id
        const convMap = new Map<string, ConversationKey>();
        for (const app of apps) {
          const job = app.jobs;
          const recruiterObj = job?.recruiters ?? null;
          const recruiterId = recruiterObj?.id ?? "";
          const key = `${app.job_id}::${recruiterId}`;
          if (!convMap.has(key)) {
            convMap.set(key, {
              job_id: app.job_id,
              recruiter_id: String(recruiterId),
              job_title: job?.title ?? null,
              company_name: recruiterObj?.company_name ?? null,
              application_status: app.status ?? null,
            });
          }
        }

        setConversations(Array.from(convMap.values()));
      } catch (err) {
        const txt = err instanceof Error ? err.message : String(err);
        console.error("init student messages error:", txt);
        setMessage({ type: "error", text: "No fue posible cargar las conversaciones." });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversationMessages = async (conv: ConversationKey) => {
    if (!student) return;
    setSelectedConversation(conv);
    setLoadingMessages(true);
    setMessage(null);

    try {
      const { data: messagesData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("student_id", student.id)
        .eq("job_id", conv.job_id)
        .eq("recruiter_id", conv.recruiter_id)
        .order("created_at", { ascending: true });

      if (msgErr) {
        console.error("load messages err:", msgErr);
        setMessage({ type: "error", text: "No fue posible cargar los mensajes." });
        setMessages([]);
        return;
      }

      setMessages((messagesData || []) as MessageRow[]);
    } catch (err) {
      const txt = err instanceof Error ? err.message : String(err);
      console.error("loadConversationMessages error:", txt);
      setMessage({ type: "error", text: "No fue posible cargar los mensajes." });
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    if (!selectedConversation || !student) return;
    const text = newMessage.trim();
    if (!text) return;
    setSending(true);

    try {
      const payload = {
        recruiter_id: selectedConversation.recruiter_id,
        student_id: student.id,
        job_id: selectedConversation.job_id,
        content: text,
        sender_type: "STUDENT",
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertErr) {
        console.error("insert message err:", insertErr);
        setMessage({ type: "error", text: "No fue posible enviar el mensaje." });
        return;
      }

      setMessages(prev => [...prev, inserted as MessageRow]);
      setNewMessage("");
      setMessage({ type: "success", text: "Mensaje enviado." });
    } catch (err) {
      const txt = err instanceof Error ? err.message : String(err);
      console.error("send message error:", txt);
      setMessage({ type: "error", text: "No fue posible enviar el mensaje." });
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => router.push("/dashboard/student");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-red-600">No se encontró el perfil de estudiante o no estás autenticado.</p>
            <div className="mt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => router.push("/auth/login")}>
                Ir a login
              </button>
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
            <p className="text-sm text-gray-600">{student.full_name} · {student.degree}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600" onClick={handleBack}>Regresar</button>
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
                  const key = `${conv.job_id}::${conv.recruiter_id}`;
                  const isSelected = selectedConversation && selectedConversation.job_id === conv.job_id && selectedConversation.recruiter_id === conv.recruiter_id;
                  return (
                    <button
                      key={key}
                      className={`w-full text-left px-3 py-2 rounded mb-1 ${isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                      onClick={() => loadConversationMessages(conv)}
                    >
                      <div className="font-medium text-sm">{conv.job_title ?? `Vacante #${conv.job_id}`}</div>
                      <div className="text-xs text-gray-600">{conv.company_name ?? '—'}</div>
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
                  <div key={msg.id} className={`max-w-xs px-3 py-2 rounded text-sm ${msg.sender_type === "STUDENT" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-gray-100 text-gray-800"}`}>
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
                placeholder={selectedConversation ? "Escribe un mensaje para el reclutador..." : "Selecciona una conversación para enviar mensaje..."}
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
