"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id: string;            // PK de la tabla students
  user_id?: string;      // UID de auth.users
  full_name?: string | null;
  degree?: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [fullName, setFullName] = useState("");
  const [degree, setDegree] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // ========= CARGA DEL PERFIL (MISMA LÓGICA QUE EN EL DASHBOARD) =========
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage(null);

      try {
        // 1) Usuario autenticado
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.error("auth error:", authErr);
        }
        const user = authData?.user;

        if (!user?.id) {
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se encontró el perfil de estudiante o no estás autenticado.",
          });
          setLoading(false);
          return;
        }

        const { data: stuData, error: stuErr } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)         
        .maybeSingle();



        if (stuErr) {
          console.error("fetch student error:", stuErr);
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se pudo cargar tu perfil de estudiante.",
          });
          setLoading(false);
          return;
        }

        if (!stuData) {
          // No hay fila en students para este usuario
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se encontró el perfil de estudiante. Verifica que tu usuario exista en la tabla students.",
          });
          setLoading(false);
          return;
        }

        const stu = stuData as Student;
        setStudent(stu);
        setFullName(stu.full_name ?? "");
        setDegree(stu.degree ?? "");
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("StudentProfile load error:", text);
        setStudent(null);
        setMessage({
          type: "error",
          text: "Error inesperado al cargar tu perfil.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ========= GUARDAR CAMBIOS BÁSICOS =========
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: fullName.trim() || null,
          degree: degree.trim() || null,
        })
        .eq("id", student.id); // usamos la PK de students

      if (error) {
        console.error("update student error:", error);
        setMessage({
          type: "error",
          text: "No se pudo actualizar tu perfil.",
        });
        return;
      }

      setStudent((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim() || null,
              degree: degree.trim() || null,
            }
          : prev
      );

      setMessage({
        type: "success",
        text: "Perfil actualizado correctamente.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error("handleSave error:", text);
      setMessage({
        type: "error",
        text: "Error inesperado al actualizar tu perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/student");
  };

  // ========= ESTADO DE CARGA =========
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando perfil de estudiante…</p>
        </div>
      </main>
    );
  }

  // ========= CASO: NO HAY STUDENT =========
  if (!student) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-6 text-center">
            <p className="text-sm text-red-600 mb-2">
              No se encontró el perfil de estudiante o no estás autenticado.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700"
            >
              Ir a login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ========= UI PRINCIPAL (MISMA PALETA QUE EL RESTO) =========
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Estudiante
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Perfil de estudiante
            </h1>
            <p className="mt-1 text-sm text-sky-100/80">
              Actualiza tus datos básicos para que los reclutadores te conozcan mejor.
            </p>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-sky-300 hover:text-sky-100 underline-offset-2"
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

        {/* Card de edición */}
        <section className="bg-white/95 rounded-2xl shadow-2xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Datos básicos
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre completo
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Juan Pérez López"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Carrera / Programa
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="Ej. Ingeniería en Sistemas Computacionales"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  // revertir a valores originales del estado student
                  setFullName(student.full_name ?? "");
                  setDegree(student.degree ?? "");
                  setMessage(null);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200
                           bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Revertir cambios
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5
                           text-sm font-semibold text-white shadow-md hover:bg-sky-700
                           disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500
                           focus:ring-offset-2 focus:ring-offset-white"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          UPICONNECT · Perfil de estudiantes
        </p>
      </div>
    </main>
  );
}
