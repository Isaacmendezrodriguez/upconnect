"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

  // mismos campos extra que usas en jobs/page.tsx
  area?: string | null;
  nivel_puesto?: string | null;
  tipo_programa?: string | null;
  nivel_educativo_requerido?: string | null;
  semestre_minimo?: number | null;
  modalidad_trabajo?: string | null;
  horario_trabajo?: string | null;
  salario_minimo?: number | null;
  salario_maximo?: number | null;
  moneda?: string | null;
  beneficios?: string | null;
  tags?: string[] | null;
};

export default function JobPublicDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const jobIdParam = params?.id;
  const jobId = jobIdParam ? Number(jobIdParam) : NaN;

  const [job, setJob] = useState<JobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!jobId || Number.isNaN(jobId)) {
        setMessage("Id de vacante inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
            id,
            title,
            position,
            description,
            degree_required,
            salary,
            status,
            available_slots,
            area,
            nivel_puesto,
            tipo_programa,
            nivel_educativo_requerido,
            semestre_minimo,
            modalidad_trabajo,
            horario_trabajo,
            salario_minimo,
            salario_maximo,
            moneda,
            beneficios,
            tags,
            recruiters ( company_name )
          `
        )
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        console.error("fetch job detail error:", error);
        setMessage("No se pudo cargar la vacante.");
      } else if (!data) {
        setMessage("No se encontró la vacante.");
      } else {
        setJob(data as JobRow);
      }

      setLoading(false);
    };

    load();
  }, [jobId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando vacante…</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-6 text-center">
          <p className="text-sm font-medium text-red-600 mb-2">
            {message || "No se encontró la vacante."}
          </p>
          <button
            className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            onClick={() => router.push("/jobs")}
          >
            Volver a vacantes
          </button>
        </div>
      </main>
    );
  }

  const company = job.recruiters?.[0]?.company_name ?? "—";

  const salaryText =
    job.salario_minimo || job.salario_maximo
      ? `${job.salario_minimo ?? "?"} – ${job.salario_maximo ?? "?"} ${
          job.moneda ?? "MXN"
        }`
      : job.salary
      ? `${job.salary} ${job.moneda ?? "MXN"}`
      : "No especificado";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Vacante
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-sky-100">
              {company}
              {job.position ? ` — ${job.position}` : ""}
            </p>
          </div>
          <button
            className="text-sm text-sky-300 hover:text-sky-100 underline-offset-2"
            onClick={() => router.push("/jobs")}
          >
            Volver a vacantes
          </button>
        </div>

        {/* Card principal */}
        <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5 space-y-4">
          {/* Rango salarial y estado */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Rango salarial
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {salaryText}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                {job.area && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Área: {job.area}
                  </span>
                )}
                {job.nivel_puesto && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Nivel: {job.nivel_puesto}
                  </span>
                )}
                {job.tipo_programa && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Programa: {job.tipo_programa}
                  </span>
                )}
                {job.modalidad_trabajo && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Modalidad: {job.modalidad_trabajo}
                  </span>
                )}
                {job.horario_trabajo && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Horario: {job.horario_trabajo}
                  </span>
                )}
                {job.semestre_minimo && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50">
                    Desde semestre {job.semestre_minimo}
                  </span>
                )}
              </div>
            </div>

            <div className="text-sm text-slate-600 min-w-[180px]">
              <p>Cupos: {job.available_slots ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">
                Estado: {job.status ?? "SIN ESTADO"}
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Descripción del puesto
            </h2>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {job.description || "Sin descripción detallada."}
            </p>
          </div>

          {/* Beneficios */}
          {job.beneficios && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Beneficios y prestaciones
              </h2>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {job.beneficios}
              </p>
            </div>
          )}

          {/* Grado / nivel educativo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">
                Grado requerido
              </p>
              <p>{job.degree_required ?? "No especificado"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                Nivel educativo requerido
              </p>
              <p>{job.nivel_educativo_requerido ?? "Cualquiera"}</p>
            </div>
          </div>

          {/* Tags */}
          {Array.isArray(job.tags) && job.tags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">
                Tags
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-700">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
