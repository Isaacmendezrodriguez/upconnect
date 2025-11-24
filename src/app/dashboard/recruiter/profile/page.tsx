"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { updateRecruiterProfile } from "@/domain/recruiters/recruiterService";

type Recruiter = {
  id: string; // = auth.users.id
  company_name?: string | null;
  position?: string | null;
  contact_email?: string | null;
};

export default function RecruiterProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwUpdating, setPwUpdating] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // ⇨ obtener sesión actual
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("auth getUser error:", authError);
        setRecruiter(null);
        setMessage({
          type: "error",
          text: "No se pudo obtener tu sesión. Intenta recargar la página o vuelve a iniciar sesión.",
        });
        setLoading(false);
        return;
      }

      const user = data?.user;

      if (!user?.id) {
        setRecruiter(null);
        setCompanyName("");
        setPosition("");
        setContactEmail("");
        setMessage({ type: "error", text: "Usuario no autenticado." });
        setLoading(false);
        return;
      }

      // buscar recruiter por ID = auth.users.id
      const { data: recData, error: recErr } = await supabase
        .from("recruiters")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (recErr) {
        console.error("fetch recruiter error:", recErr);
        setRecruiter(null);
        setMessage({ type: "error", text: "No fue posible cargar el perfil." });
        setLoading(false);
        return;
      }

      if (!recData) {
        // no hay registro en recruiters para este usuario
        setRecruiter(null);
        setCompanyName("");
        setPosition("");
        setContactEmail(user.email ?? "");
        setMessage({
          type: "error",
          text: "Aún no existe un registro de reclutador para este usuario. Completa tu perfil.",
        });
        setLoading(false);
        return;
      }

      const rec = recData as Recruiter;
      setRecruiter(rec);
      setCompanyName(rec.company_name ?? "");
      setPosition(rec.position ?? "");
      setContactEmail(rec.contact_email ?? user.email ?? "");
    } catch (err) {
      console.error("fetchProfile unexpected error:", err);
      setMessage({ type: "error", text: "No fue posible cargar el perfil." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recruiter) {
      setMessage({
        type: "error",
        text: "No hay registro de reclutador. Verifica que tu usuario exista en la tabla recruiters.",
      });
      return;
    }

    setMessage(null);
    setSaving(true);

    try {
      await updateRecruiterProfile(recruiter.id, {
        companyName: companyName.trim(),
        position: position.trim(),
      });

      setMessage({ type: "success", text: "Perfil actualizado correctamente." });
      await fetchProfile();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("updateRecruiterProfile error:", messageText);

      if (messageText.includes("RECRUITER_UPDATE_ERROR")) {
        setMessage({ type: "error", text: "No se pudo actualizar el perfil." });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setPwUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage({ type: "success", text: "Contraseña actualizada correctamente." });
      setNewPassword("");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("updateUser password error:", messageText);
      setMessage({ type: "error", text: messageText });
    } finally {
      setPwUpdating(false);
    }
  };

  const handleBack = () => router.push("/dashboard/recruiter");

  /* ========== ESTADO CARGANDO ========== */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando perfil...</p>
        </div>
      </main>
    );
  }

  /* ========== PÁGINA PRINCIPAL ========== */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Reclutador
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Perfil de Reclutador</h1>
            <p className="text-sm text-sky-200">
              Actualiza los datos de tu empresa y tu contraseña de acceso.
            </p>
          </div>
          <button
            className="text-sm text-sky-300 hover:text-sky-100 underline-offset-2"
            onClick={handleBack}
          >
            Regresar al dashboard
          </button>
        </header>

        {/* Mensajes */}
        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm border ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Datos empresa */}
        <section className="bg-white/95 rounded-2xl shadow-xl border border-slate-100 p-6 mb-8">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Datos de la empresa</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de la empresa
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm
                           text-slate-900 bg-slate-50
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej. INDEP Business Partner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm
                           text-slate-900 bg-slate-50
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ej. Coordinador de selección"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contacto (email)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm
                           bg-slate-100 text-slate-600"
                value={contactEmail}
                readOnly
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5
                           text-sm font-semibold text-white shadow-sm hover:bg-sky-700
                           disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500
                           focus:ring-offset-2 focus:ring-offset-white"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={fetchProfile}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200
                           bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Revertir cambios
              </button>
            </div>
          </form>
        </section>

        {/* Cambio de contraseña */}
        <section className="bg-white/95 rounded-2xl shadow-xl border border-slate-100 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm
                           text-slate-900 bg-white
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pwUpdating}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5
                           text-sm font-semibold text-white shadow-sm hover:bg-emerald-700
                           disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:ring-offset-2 focus:ring-offset-white"
              >
                {pwUpdating ? "Actualizando..." : "Actualizar contraseña"}
              </button>
              <button
                type="button"
                onClick={() => setNewPassword("")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200
                           bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
