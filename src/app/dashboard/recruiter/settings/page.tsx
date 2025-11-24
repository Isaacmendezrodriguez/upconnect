"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Recruiter = {
  id: string;
  user_id?: string;
  company_name?: string | null;
};

type RecruiterSettings = {
  recruiter_id: string;
  email_notifications: boolean;
  application_notifications: boolean;
  weekly_summary: boolean;
};

export default function RecruiterSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
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

        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (recErr || !recData) {
          setMessage({ type: "error", text: recErr?.message ?? "No se encontró el reclutador." });
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        const { data: settingsData, error: settingsErr } = await supabase
          .from("recruiter_settings")
          .select("*")
          .eq("recruiter_id", rec.id)
          .maybeSingle();

        if (settingsErr) {
          setMessage({ type: "error", text: settingsErr.message || "No fue posible cargar la configuración." });
          setLoading(false);
          return;
        }

        if (!settingsData) {
          setSettings({
            recruiter_id: rec.id,
            email_notifications: true,
            application_notifications: true,
            weekly_summary: false,
          });
        } else {
          setSettings(settingsData as RecruiterSettings);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        setMessage({ type: "error", text: text || "Error inesperado al cargar configuración." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiter || !settings) return;
    setMessage(null);
    setSaving(true);

    try {
      const payload = {
        recruiter_id: recruiter.id,
        email_notifications: settings.email_notifications,
        application_notifications: settings.application_notifications,
        weekly_summary: settings.weekly_summary,
      };

      const { error } = await supabase
        .from("recruiter_settings")
        .upsert(payload, { onConflict: "recruiter_id" });

      if (error) throw error;

      setMessage({ type: "success", text: "Configuración guardada correctamente." });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: text || "No se pudo guardar la configuración." });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => router.push("/dashboard/recruiter");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!recruiter) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Configuración del Reclutador</h1>
            </div>
            <button className="text-sm text-gray-600" onClick={() => router.push("/auth/login")}>
              Ir a login
            </button>
          </header>

          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-red-600">No se encontró el perfil del reclutador o no estás autenticado.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Configuración del Reclutador</h1>
            {recruiter && (
              <p className="text-sm text-gray-600">{recruiter.company_name}</p>
            )}
          </div>
          <button
            className="text-sm text-gray-600"
            onClick={handleBack}
          >
            Regresar
          </button>
        </header>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
          </div>
        )}

        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-medium mb-4">Preferencias de notificación</h2>

          {!settings ? (
            <p className="text-sm text-gray-500">Cargando preferencias...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Notificaciones por correo</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, email_notifications: e.target.checked } : prev)}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Alertas cuando haya nuevas postulaciones</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.application_notifications}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, application_notifications: e.target.checked } : prev)}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Resumen semanal de actividad</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.weekly_summary}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, weekly_summary: e.target.checked } : prev)}
                />
              </label>

              <div className="pt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded"
                  onClick={() => router.push("/dashboard/recruiter")}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
