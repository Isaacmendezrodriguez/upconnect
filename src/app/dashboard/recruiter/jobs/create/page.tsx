"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CreateJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setMessage({ type: "error", text: "Usuario no autenticado." });
        return;
      }

      const recruiterId = user.id;

      const { data, error } = await supabase
        .from("jobs")
        .insert({
          recruiter_id: recruiterId,
          title: title.trim(),
          position: position.trim(),
          description: description.trim() || null,
          status: "ABIERTA",
          available_slots: 1,
        })
        .select("id")
        .single();

      if (error) {
        console.error(error);
        setMessage({ type: "error", text: "No se pudo crear la vacante." });
        return;
      }

      router.push(`/dashboard/recruiter/jobs/${data.id}`);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Ocurrió un error inesperado al crear la vacante.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white/95 shadow-xl border border-slate-100 rounded-2xl p-8">

        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Crear nueva vacante
        </h1>
        <p className="text-sky-700 text-sm mb-6">UPICONNECT · Reclutadores</p>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleCreateJob}>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Título</label>
            <input
              className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-slate-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Puesto</label>
            <input
              className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-slate-50"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Descripción</label>
            <textarea
              className="w-full min-h-[120px] border border-slate-300 px-3 py-2 rounded-lg bg-slate-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? "Creando..." : "Crear vacante"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/recruiter")}
            className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </form>
      </div>
    </main>
  );
}
