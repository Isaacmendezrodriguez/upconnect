"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setApplicationStatus } from "@/domain/jobs/jobService";

type Recruiter = {
  id: string;
  company_name?: string | null;
  position?: string | null;
  contact_email?: string | null;
};

type JobRow = {
  id: number;
  title: string;
  status?: string | null;
  available_slots?: number | null;
};

type ApplicationRow = {
  id: number;
  status: string;
  student_id: string;
  job_id: number;
  jobs?: {
    title?: string | null;
  } | null;
};

export default function RecruiterDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

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

        // 2) Buscar recruiter por ID = auth.users.id
        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("id, company_name, position, contact_email")
          .eq("id", user.id)
          .maybeSingle();

        if (recErr) {
          console.error("fetch recruiter error:", recErr);
          setMessage({ type: "error", text: "No fue posible cargar el perfil de reclutador." });
          setRecruiter(null);
          setLoading(false);
          return;
        }

        // 3) Si no existe registro en recruiters → tarjeta para completar perfil
        if (!recData) {
          setRecruiter(null);
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        // 4) Cargar vacantes del recruiter
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("id, title, status, available_slots")
          .eq("recruiter_id", rec.id)
          .order("id", { ascending: false });

        if (jobsErr) {
          console.error("fetch jobs error:", jobsErr);
          setMessage({ type: "error", text: "No fue posible cargar tus vacantes." });
          setJobs([]);
        } else {
          setJobs((jobsData || []) as JobRow[]);
        }

        // 5) Cargar postulaciones de todas las vacantes del recruiter
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, status, student_id, job_id, jobs(title)")
          .eq("jobs.recruiter_id", rec.id)
          .order("id", { ascending: false });

        if (appsErr) {
          console.error("fetch applications error:", appsErr);
          setApplications([]);
        } else {
          setApplications((appsData || []) as ApplicationRow[]);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("RecruiterDashboard error:", text);
        setMessage({ type: "error", text: "Error inesperado al cargar el dashboard." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleGoToProfile = () => {
    router.push("/dashboard/recruiter/profile");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateJob = () => {
    // editor de vacante nueva: /dashboard/recruiter/jobs/new
    router.push("/dashboard/recruiter/jobs/new");
  };

  const handleEditJob = (jobId: number) => {
    // editor de vacante existente
    router.push(`/dashboard/recruiter/jobs/${jobId}`);
  };

  const handleDeleteJob = async (jobId: number) => {
    const ok = confirm("¿Estás seguro de que deseas eliminar esta vacante? Esta acción no se puede deshacer.");
    if (!ok) return;

    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) {
        console.error("delete job error:", error);
        setMessage({ type: "error", text: "No fue posible eliminar la vacante. Intenta de nuevo." });
      } else {
        // Actualizar estado local
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setMessage({ type: "success", text: "Vacante eliminada correctamente." });
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error("handleDeleteJob error:", text);
      setMessage({ type: "error", text: "Error inesperado al eliminar la vacante." });
    } finally {
      setLoading(false);
    }
  };

  const handleSetStatus = async (applicationId: number, status: "ACEPTADO" | "RECHAZADO") => {
    setMessage(null);
    try {
      await setApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
      );
      setMessage({ type: "success", text: "Estado del postulante actualizado." });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("setApplicationStatus error:", messageText);
      if (messageText.includes("APPLICATION_STATUS_ERROR")) {
        setMessage({ type: "error", text: "No se pudo actualizar el estado del postulante." });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    }
  };

  /* ======================
     ESTADOS DE CARGA
  ====================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando información…</p>
        </div>
      </main>
    );
  }

  /* ====================================================
     CASO: NO HAY RECRUITER → TARJETA COMO EN LOGIN
  ==================================================== */

  if (!recruiter) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
          <div className="mb-4 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Plataforma
            </p>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
              Completa tu perfil de reclutador
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium tracking-wide text-sky-700">
              UPICONNECT
            </p>
          </div>

          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            No se encontró tu perfil de reclutador. Completa tu registro para usar el dashboard.
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-6">
            Hemos encontrado tu usuario autenticado en Supabase, pero aún no existe un registro
            asociado en la tabla{" "}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              recruiters
            </span>
            . Para usar el dashboard, primero completa tu perfil.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleGoToProfile}
              className="inline-flex justify-center flex-1 sm:flex-none rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              Ir a completar mi perfil
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex justify-center flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ====================================================
     CASO: RECRUITER ENCONTRADO → DASHBOARD PRINCIPAL
  ==================================================== */

  const totalJobs = jobs.length;
  const openJobs = jobs.filter((j) => j.status === "ABIERTA").length;
  const closedJobs = jobs.filter((j) => j.status === "CERRADA").length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* CARD PRINCIPAL */}
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
          {/* Header */}
          <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
                Dashboard Reclutador
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Panel de vacantes
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {recruiter.company_name || "Empresa sin nombre asignado"}
                {recruiter.position ? ` · ${recruiter.position}` : ""}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={handleGoToProfile}
              >
                Editar perfil
              </button>
              <button
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-red-600"
                onClick={handleLogout}
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
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">
                Vacantes publicadas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalJobs}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-emerald-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-emerald-600 uppercase">
                Vacantes abiertas
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">{openJobs}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">
                Vacantes cerradas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{closedJobs}</p>
            </div>
          </section>

          {/* Tabla de vacantes */}
          <section className="rounded-xl border border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-medium text-slate-900">Mis vacantes</h2>
              <button
                onClick={handleCreateJob}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
              >
                Crear nueva vacante
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no has publicado vacantes. Crea la primera para empezar a recibir postulaciones.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Título
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Cupos
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        {/* TÍTULO + LÁPIZ DE EDITAR */}
                        <td className="px-3 py-2 text-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span>{job.title}</span>
                            <button
                              type="button"
                              onClick={() => handleEditJob(job.id)}
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
                            >
                              <span className="mr-1" aria-hidden="true">
                                ✏️
                              </span>
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              job.status === "ABIERTA"
                                ? "bg-emerald-50 text-emerald-700"
                                : job.status === "CERRADA"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {job.status || "SIN ESTADO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {job.available_slots ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditJob(job.id)}
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(job.id)}
                              className="inline-flex items-center justify-center rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Postulantes (agregado al dashboard) */}
          <section className="rounded-xl border border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">Postulantes</h2>
              <p className="text-xs text-slate-500">
                Gestiona aquí los postulantes de todas tus vacantes.
              </p>
            </div>

            {applications.length === 0 ? (
              <p className="text-sm text-slate-500">No hay postulantes todavía.</p>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-slate-800">
                        Vacante: {app.jobs?.title || `#${app.job_id}`}
                      </p>
                      <p className="text-xs text-slate-600">
                        Student ID: <span className="font-mono">{app.student_id}</span>
                      </p>
                      <p className="text-xs text-slate-500">Estado: {app.status}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          router.push(`/dashboard/recruiter/applications/${app.student_id}`)
                        }
                      >
                        Ver perfil
                      </button>
                      <button
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        onClick={() => handleSetStatus(app.id, "ACEPTADO")}
                      >
                        Aceptar
                      </button>
                      <button
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        onClick={() => handleSetStatus(app.id, "RECHAZADO")}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          UPICONNECT · Panel de reclutadores
        </p>
      </div>
    </main>
  );
}
