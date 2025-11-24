"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id: string;
  user_id?: string;
  full_name?: string | null;
  degree?: string | null;
};

type StudentSettings = {
  student_id: string;
  email_notifications: boolean;
  status_change_notifications: boolean;
  weekly_summary: boolean;
};

export default function StudentSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<StudentSettings | null>(null);

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

        const { data: sData, error: sErr } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (sErr || !sData) {
          setMessage({ type: "error", text: "No se encontró el perfil de estudiante." });
          setLoading(false);
          return;
        }

        const stu = sData as Student;
        setStudent(stu);

        // load settings (maybe single)
        const { data: cfgData, error: cfgErr } = await supabase
          .from("student_settings")
          .select("*")
          .eq("student_id", stu.id)
          .maybeSingle();

        if (cfgErr) {
          setMessage({ type: "error", text: cfgErr.message || "No fue posible cargar la configuración." });
          setSettings({
            student_id: stu.id,
            email_notifications: true,
            status_change_notifications: true,
            weekly_summary: false,
          });
          setLoading(false);
          return;
        }

        if (!cfgData) {
          setSettings({
            student_id: stu.id,
            email_notifications: true,
            status_change_notifications: true,
            weekly_summary: false,
          });
        } else {
          setSettings(cfgData as StudentSettings);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        setMessage({ type: "error", text: text || "Error inesperado al cargar datos." });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleToggle = (key: keyof Omit<StudentSettings, "student_id">) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] } as StudentSettings);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!student || !settings) return;
    setSaving(true);
    setMessage(null);

    const payload: StudentSettings = {
      student_id: student.id,
      email_notifications: settings.email_notifications,
      status_change_notifications: settings.status_change_notifications,
      weekly_summary: settings.weekly_summary,
    };

    try {
      const { error } = await supabase
        .from("student_settings")
        .upsert(payload, { onConflict: "student_id" });

      if (error) {
        setMessage({ type: "error", text: error.message || "No se pudo guardar la configuración." });
      } else {
        setMessage({ type: "success", text: "Configuración guardada correctamente." });
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: text || "No se pudo guardar la configuración." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    // reload settings from DB
    if (!student) {
      router.push("/dashboard/student");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const { data: cfgData, error: cfgErr } = await supabase
        .from("student_settings")
        .select("*")
        .eq("student_id", student.id)
        .maybeSingle();

      if (cfgErr) {
        setMessage({ type: "error", text: cfgErr.message || "No fue posible recargar la configuración." });
        return;
      }

      if (!cfgData) {
        setSettings({
          student_id: student.id,
          email_notifications: true,
          status_change_notifications: true,
          weekly_summary: false,
        });
      } else {
        setSettings(cfgData as StudentSettings);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: text || "Error inesperado al recargar configuración." });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-red-600">No se encontró el perfil de estudiante.</p>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => router.push("/auth/login")}
              >
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
      <div className="max-w-3xl mx-auto px-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Configuración del Estudiante</h1>
            {student.full_name && (
              <p className="text-sm text-gray-600">{student.full_name}</p>
            )}
          </div>
          <button
            className="text-sm text-gray-600"
            onClick={() => router.push("/dashboard/student")}
          >
            Regresar
          </button>
        </header>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-medium mb-3">Preferencias de notificación</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Notificaciones por correo</label>
              <input
                type="checkbox"
                checked={!!settings?.email_notifications}
                onChange={() => handleToggle("email_notifications")}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Avisos cuando cambie el estado de mis postulaciones</label>
              <input
                type="checkbox"
                checked={!!settings?.status_change_notifications}
                onChange={() => handleToggle("status_change_notifications")}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Resumen semanal de actividad</label>
              <input
                type="checkbox"
                checked={!!settings?.weekly_summary}
                onChange={() => handleToggle("weekly_summary")}
                className="h-4 w-4"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 bg-blue-600 text-white rounded ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
