"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Recruiter = {
  id: string;
  user_id?: string;
  company_name?: string | null;
};

type JobRow = {
  id: number;
  title: string;
  status?: string | null;
  available_slots?: number | null;
};

type ApplicationRow = {
  id: number;
  job_id: number;
  status: string;
};

type JobStats = {
  jobId: number;
  title: string;
  total: number;
  accepted: number;
  rejected: number;
};

export default function RecruiterAnalyticsPage() {
  const router = useRouter();

  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
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
          const errText = recErr?.message ?? "No se encontró el reclutador.";
          setMessage({ type: "error", text: errText });
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("id, title, status, available_slots")
          .eq("recruiter_id", rec.id);

        if (jobsErr) {
          setMessage({ type: "error", text: jobsErr.message || "No fue posible obtener vacantes." });
          setLoading(false);
          return;
        }

        const jobsList = (jobsData || []) as JobRow[];
        setJobs(jobsList);

        const jobIds = jobsList.map(j => j.id);

        let appsData: ApplicationRow[] = [];
        if (jobIds.length > 0) {
          const { data: aData, error: aErr } = await supabase
            .from("applications")
            .select("id, job_id, status")
            .in("job_id", jobIds);

          if (aErr) {
            setMessage({ type: "error", text: aErr.message || "No fue posible obtener postulaciones." });
            setLoading(false);
            return;
          }

          appsData = (aData || []) as ApplicationRow[];
        }

        setApplications(appsData);
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        setMessage({ type: "error", text: text || "Error inesperado al cargar métricas." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!recruiter) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-red-600">No se encontró el perfil del reclutador.</p>
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

  // Calculations
  const totalJobs = jobs.length;
  const openJobs = jobs.filter(j => j.status === "ABIERTA").length;
  const closedJobs = jobs.filter(j => j.status === "CERRADA").length;

  const totalApplications = applications.length;
  const acceptedApplications = applications.filter(a => a.status === "ACEPTADO").length;
  const rejectedApplications = applications.filter(a => a.status === "RECHAZADO").length;

  const acceptanceRate = totalApplications > 0
    ? Math.round((acceptedApplications / totalApplications) * 100)
    : 0;

  const jobsStats: JobStats[] = jobs.map(job => {
    const appsForJob = applications.filter(a => a.job_id === job.id);
    const total = appsForJob.length;
    const accepted = appsForJob.filter(a => a.status === "ACEPTADO").length;
    const rejected = appsForJob.filter(a => a.status === "RECHAZADO").length;
    return { jobId: job.id, title: job.title, total, accepted, rejected };
  });

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Analytics del Reclutador</h1>
            {recruiter && (
              <p className="text-sm text-gray-600">{recruiter.company_name}</p>
            )}
          </div>
          <button
            className="text-sm text-gray-600"
            onClick={() => router.push("/dashboard/recruiter")}
          >
            Regresar
          </button>
        </header>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500 uppercase">Vacantes totales</p>
            <p className="mt-2 text-2xl font-semibold">{totalJobs}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500 uppercase">Postulaciones totales</p>
            <p className="mt-2 text-2xl font-semibold">{totalApplications}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500 uppercase">Tasa de aceptación</p>
            <p className="mt-2 text-2xl font-semibold">{acceptanceRate}%</p>
          </div>
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-3">Resumen por vacante</h2>
          {jobsStats.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay vacantes para mostrar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Vacante</th>
                    <th className="text-left py-2 pr-4">Postulaciones</th>
                    <th className="text-left py-2 pr-4">Aceptadas</th>
                    <th className="text-left py-2 pr-4">Rechazadas</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsStats.map(row => (
                    <tr key={row.jobId} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.title}</td>
                      <td className="py-2 pr-4">{row.total}</td>
                      <td className="py-2 pr-4 text-green-700">{row.accepted}</td>
                      <td className="py-2 pr-4 text-red-700">{row.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Vacantes abiertas</p>
            <p className="mt-2 text-2xl font-semibold">{openJobs}</p>
            <p className="text-xs text-gray-500">Cerradas: {closedJobs}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Aceptadas</p>
            <p className="mt-2 text-2xl font-semibold">{acceptedApplications}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Rechazadas</p>
            <p className="mt-2 text-2xl font-semibold">{rejectedApplications}</p>
          </div>
        </section>

      </div>
    </main>
  );
}
