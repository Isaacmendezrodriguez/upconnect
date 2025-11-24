"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { addInterest, deleteInterest } from "@/domain/recruiters/recruiterService";

type Recruiter = { id: string; user_id?: string; company_name?: string; position?: string };
type Interest = { id: number; recruiter_id: string; interest: string };

export default function RecruiterInterestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: string; email?: string } | null>(null);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const fetchRecruiterAndInterests = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser || null);
      if (!currentUser?.id) {
        setRecruiter(null);
        setInterests([]);
        return;
      }

      const { data: recData, error: recErr } = await supabase
        .from("recruiters")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (recErr) {
        console.warn("No recruiter found:", recErr.message || recErr);
        setRecruiter(null);
        setInterests([]);
        return;
      }

      const rec = recData as Recruiter;
      setRecruiter(rec);

      const { data: ints, error: intsErr } = await supabase
        .from("recruiter_interests")
        .select("*")
        .eq("recruiter_id", rec.id)
        .order("id", { ascending: false });

      if (intsErr) throw intsErr;
      setInterests((ints || []) as Interest[]);
    } catch (err) {
      console.error("fetchRecruiterAndInterests error:", err);
      setMessage({ type: "error", text: "No fue posible cargar los intereses." });
      setInterests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiterAndInterests();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!recruiter) {
      setMessage({ type: "error", text: "Perfil de reclutador no cargado." });
      return;
    }
    const interestTrim = input.trim();
    if (!interestTrim) {
      setMessage({ type: "error", text: "Ingresa un interés válido." });
      return;
    }

    setCreating(true);
    try {
      await addInterest(recruiter.id, interestTrim);
      setInput("");
      // recargar
      const { data: ints, error: intsErr } = await supabase
        .from("recruiter_interests")
        .select("*")
        .eq("recruiter_id", recruiter.id)
        .order("id", { ascending: false });
      if (intsErr) throw intsErr;
      setInterests((ints || []) as Interest[]);
      setMessage({ type: "success", text: "Interés agregado correctamente." });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("addInterest error:", messageText);
      if (messageText.includes("RECRUITER_INTEREST_ERROR")) {
        setMessage({ type: "error", text: "No se pudo agregar el interés" });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!recruiter) return;
    setMessage(null);
    setDeletingId(id);
    try {
      await deleteInterest(id);
      // recargar
      const { data: ints, error: intsErr } = await supabase
        .from("recruiter_interests")
        .select("*")
        .eq("recruiter_id", recruiter.id)
        .order("id", { ascending: false });
      if (intsErr) throw intsErr;
      setInterests((ints || []) as Interest[]);
      setMessage({ type: "success", text: "Interés eliminado." });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("deleteInterest error:", messageText);
      if (messageText.includes("RECRUITER_INTEREST_DELETE_ERROR")) {
        setMessage({ type: "error", text: "No se pudo eliminar el interés" });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleBack = () => router.push("/dashboard/recruiter");

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Intereses del reclutador</h1>
            {user?.email && <div className="text-sm text-gray-500">{user.email}</div>}
          </div>
          <button className="text-sm text-gray-600" onClick={handleBack}>Regresar</button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <section className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-medium mb-3">Agregar interés</h2>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded"
              placeholder="Ej: JavaScript, UX, Marketing"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded">{creating ? 'Agregando...' : 'Agregar interés'}</button>
          </form>
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-3">Mis intereses</h2>
          <div className="space-y-2">
            {interests.length === 0 && <div className="text-sm text-gray-500">No hay intereses registrados.</div>}
            {interests.map(i => (
              <div key={i.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="text-sm">{i.interest}</div>
                <div>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" disabled={deletingId === i.id} onClick={() => handleDelete(i.id)}>
                    {deletingId === i.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
