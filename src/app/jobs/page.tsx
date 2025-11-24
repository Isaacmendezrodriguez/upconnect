"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { applyToJob } from "@/domain/jobs/jobService";

type Student = {
  id: string; // = auth.users.id
  user_id?: string;
  full_name?: string | null;
  degree?: string | null;
};

type JobRow = {
  id: number;
  title: string;
  position?: string | null;
  description?: string | null;
  degree_required?: string | null;
  salary?: number | null;
  status?: string | null;
  available_slots?: number | null;
  recruiters?: Array<{ company_name?: string | null }>;
};

type ApplicationRow = {
  id: number;
  job_id: number;
  status: string;
};

export default function JobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

  const [searchTitle, setSearchTitle] = useState<string>("");
  const [searchCompany, setSearchCompany] = useState<string>("");
  const [onlyMatchingDegree, setOnlyMatchingDegree] = useState<boolean>(false);

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

        // 2) Buscar estudiante usando id = auth.uid()
        const { data: sData, error: sErr } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (sErr) {
          console.error("fetch student error:", sErr);
        }

        if (!sData) {
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se encontró el perfil de estudiante.",
          });
          setLoading(false);
          return;
        }

        const stu = sData as Student;
        setStudent(stu);

        // 3) Vacantes abiertas con info del reclutador
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select(
            "id, title, position, description, degree_required, salary, status, available_slots, recruiters (company_name)"
          )
          .eq("status", "ABIERTA");

        if (jobsErr) {
          console.error("fetch jobs error:", jobsErr);
          setMessage({
            type: "error",
            text: jobsErr.message || "No fue posible obtener vacantes.",
          });
          setLoading(false);
          return;
        }

        setJobs((jobsData || []) as JobRow[]);

        // 4) Postulaciones del estudiante
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, job_id, status")
          .eq("student_id", stu.id);

        if (appsErr) {
          console.error("fetch applications error:", appsErr);
          setMessage({
            type: "error",
            text: appsErr.message || "No fue posible obtener postulaciones.",
          });
        } else {
          setApplications((appsData || []) as ApplicationRow[]);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("JobsPage load error:", text);
        setMessage({
          type: "error",
          text: text || "Error inesperado al cargar vacantes.",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const reloadApplications = async (studentId: string) => {
    const { data: appsData, error: appsErr } = await supabase
      .from("applications")
      .select("id, job_id, status")
      .eq("student_id", studentId);

    if (!appsErr) {
      setApplications((appsData || []) as ApplicationRow[]);
    } else {
      console.error("reloadApplications error:", appsErr);
    }
  };

  const handleApply = async (job: JobRow) => {
    if (!student) return;
    setMessage(null);

    try {
      await applyToJob(job.id, student.id);
      await reloadApplications(student.id);
      setMessage({ type: "success", text: "Te has postulado a la vacante." });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error("handleApply error:", text);

      if (text.includes("JOB_APPLICATION_ERROR")) {
        setMessage({
          type: "error",
          text: "No fue posible completar tu postulación.",
        });
      } else {
        setMessage({
          type: "error",
          text: text || "No fue posible completar tu postulación.",
        });
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
          <p className="text-sm text-slate-700">Cargando vacantes…</p>
        </div>
      </main>
    );
  }

  /* ======================
     SIN PERFIL DE ESTUDIANTE
  ====================== */

  if (!student) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-6">
            <p className="text-sm font-medium text-red-600 mb-2">
              No se encontró el perfil de estudiante.
            </p>
            <p className="text-xs text-slate-600 mb-4">
              Inicia sesión nuevamente o completa tu registro como alumno para poder
              postularte a vacantes.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                onClick={() => router.push("/login")}
              >
                Ir a login
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => router.push("/dashboard/student")}
              >
                Ir al dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ======================
     FILTROS
  ====================== */

  const filteredJobs = jobs.filter((job) => {
    if (searchTitle && !job.title?.toLowerCase().includes(searchTitle.toLowerCase())) {
      return false;
    }

    const company = job.recruiters?.[0]?.company_name ?? "";
    if (searchCompany && !company.toLowerCase().includes(searchCompany.toLowerCase())) {
      return false;
    }

    if (onlyMatchingDegree && student.degree) {
      const req = job.degree_required ?? "";
      if (!req.toLowerCase().includes((student.degree ?? "").toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const hasApplied = (jobId: number) => applications.some((a) => a.job_id === jobId);

  /* ======================
     UI PRINCIPAL
  ====================== */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-400 uppercase">
              Vacantes
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Explorar vacantes disponibles
            </h1>
            {student.full_name && (
              <p className="mt-1 text-sm text-sky-100">
                {student.full_name}
                {student.degree ? ` · ${student.degree}` : ""}
              </p>
            )}
          </div>
          <button
            className="self-start rounded-lg border border-sky-300/70 bg-sky-50/10 px-4 py-2 text-xs sm:text-sm font-medium text-sky-100 hover:bg-sky-50/20"
            onClick={() => router.push("/dashboard/student")}
          >
            Regresar al dashboard
          </button>
        </header>

        {/* MENSAJE DE ESTADO */}
        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "error"
                ? "bg-red-50/90 text-red-700 border-red-100"
                : "bg-emerald-50/90 text-emerald-700 border-emerald-100"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* FILTROS */}
        <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-5 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Filtrar vacantes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Buscar por título"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Buscar por empresa"
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
            />

            <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={onlyMatchingDegree}
                onChange={() => setOnlyMatchingDegree(!onlyMatchingDegree)}
              />
              <span>Solo vacantes relacionadas con mi carrera</span>
            </label>
          </div>
        </section>

        {/* LISTADO DE VACANTES */}
        <section className="grid grid-cols-1 gap-4">
          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-6 text-sm text-slate-500">
              No se encontraron vacantes con los filtros actuales.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const company = job.recruiters?.[0]?.company_name ?? "—";
              const applied = hasApplied(job.id);
              const noSlots = (job.available_slots ?? 0) <= 0;
              const disabled = applied || noSlots || job.status !== "ABIERTA";

              return (
                <article
                  key={job.id}
                  className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {job.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {company}
                        {job.position ? ` — ${job.position}` : ""}
                      </p>
                      <p className="mt-3 text-sm text-slate-700">
                        {job.description || "Sin descripción detallada."}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600 min-w-[140px]">
                      <p>Cupos: {job.available_slots ?? 0}</p>
                      <p>Salario: {job.salary ?? "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Estado: {job.status ?? "SIN ESTADO"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs sm:text-sm text-slate-500">
                      Grado requerido: {job.degree_required ?? "No especificado"}
                    </p>
                    <button
                      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold ${
                        disabled
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                          : "bg-sky-600 text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
                      }`}
                      onClick={() => handleApply(job)}
                      disabled={disabled}
                    >
                      {applied
                        ? "Ya postulado"
                        : noSlots
                        ? "Sin cupos"
                        : "Postularme"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
