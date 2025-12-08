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

type ApplicationRow = {
  id: number;
  status: string;
  job_id: number;
  jobs?: {
    title?: string | null;
    position?: string | null;
    recruiters?: {
      company_name?: string | null;
    } | null;
  } | null;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

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
          setMessage({ type: "error", text: "Usuario no autenticado." });
          setLoading(false);
          return;
        }

        // 2) Buscar perfil de estudiante por id = UID de Supabase
        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (stuErr) {
          console.error("fetch student error:", stuErr);
          setMessage({
            type: "error",
            text: "No fue posible cargar tu perfil de estudiante.",
          });
          setStudent(null);
          setLoading(false);
          return;
        }

        if (!stuData) {
          setStudent(null);
          setLoading(false);
          return;
        }

        const stu = stuData as Student;
        setStudent(stu);

        // 3) Cargar postulaciones
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, status, job_id, jobs(title, position, recruiters(company_name))")
          .eq("student_id", stu.id)
          .order("id", { ascending: false });

        if (appsErr) {
          console.error("fetch applications error:", appsErr);
          setMessage({
            type: "error",
            text: "No fue posible cargar postulaciones.",
          });
          setApplications([]);
        } else {
          setApplications((appsData || []) as ApplicationRow[]);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("StudentDashboard error:", text);
        setMessage({
          type: "error",
          text: "Error inesperado al cargar el dashboard.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ================= ESTADO DE CARGA ================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando dashboard de estudiante…</p>
        </div>
      </main>
    );
  }

  /* ================= SIN PERFIL DE ESTUDIANTE ================= */

  if (!student) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
          <div className="mb-4 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Plataforma
            </p>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
              No se encontró tu perfil de estudiante
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium tracking-wide text-sky-700">
              UPICONNECT
            </p>
          </div>

          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            Verifica que te hayas registrado como alumno o inicia sesión de nuevo.
          </div>

          <div className="flex justify-end">
            <button
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white"
              onClick={() => router.push("/login")}
            >
              Ir a login
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ================= MÉTRICAS ================= */

  const totalApplications = applications.length;
  const accepted = applications.filter((a) => a.status === "ACEPTADO").length;
  const rejected = applications.filter((a) => a.status === "RECHAZADO").length;
  const pending = applications.filter((a) => a.status === "PENDIENTE").length;

  const acceptanceRate =
    totalApplications > 0 ? Math.round((accepted / totalApplications) * 100) : 0;

  /* ================= DASHBOARD PRINCIPAL ================= */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* CARD PRINCIPAL */}
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
          {/* Header */}
          <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
                Dashboard Estudiante
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Panel de postulaciones
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {student.full_name || "Alumno sin nombre asignado"}
                {student.degree ? ` · ${student.degree}` : ""}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => router.push("/dashboard/student/profile")}
              >
                Mi perfil
              </button>
              <button
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    router.push("/login");
                  } catch (err) {
                    console.error("sign out error:", err);
                    setMessage({ type: "error", text: "No fue posible cerrar sesión." });
                  }
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </header>

          {/* Mensaje de estado */}
          {message && (
            <div
              className={`mb-4 rounded-md px-3 py-2 text-sm ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Resumen de tarjetas */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">
                Postulaciones
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {totalApplications}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-sky-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-sky-700 uppercase">
                Pendientes
              </p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">
                {pending}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-emerald-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-emerald-700 uppercase">
                Aceptadas
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {accepted}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Rechazadas: {rejected}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">
                Tasa de aceptación
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {acceptanceRate}%
              </p>
            </div>
          </section>

          {/* Tabla de postulaciones */}
          <section className="rounded-xl border border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-medium text-slate-900">Mis postulaciones</h2>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
                onClick={() => router.push("/jobs")}
              >
                Explorar vacantes
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Vacante
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Empresa
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-4 text-center text-sm text-slate-500"
                      >
                        Aún no te has postulado a ninguna vacante.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2 text-slate-800">
                          {app.jobs?.title || `Vacante #${app.job_id}`}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {app.jobs?.recruiters?.company_name || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{app.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          UPICONNECT · Panel de estudiantes
        </p>
      </div>
    </main>
  );
}
