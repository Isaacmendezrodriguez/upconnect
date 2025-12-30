"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id: string;
  full_name?: string | null;
  degree?: string | null;
  boleta?: string | null;
  soft_skills?: string[] | null;
  tech_skills?: string[] | null;
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

export default function RecruiterStudentProfilePage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const studentId = params?.studentId;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  useEffect(() => {
    const load = async () => {
      if (!studentId) return;
      setLoading(true);
      setMessage(null);

      try {
        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("id, full_name, degree, boleta, soft_skills, tech_skills")
          .eq("id", studentId)
          .maybeSingle();

        if (stuErr) {
          console.error("fetch student error:", stuErr);
          setMessage({ type: "error", text: "No se pudo cargar el perfil del estudiante." });
          setStudent(null);
          setLoading(false);
          return;
        }

        if (!stuData) {
          setStudent(null);
          setMessage({ type: "error", text: "No se encontró este estudiante." });
          setLoading(false);
          return;
        }

        setStudent(stuData as Student);

        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, status, job_id, jobs(title, position, recruiters(company_name))")
          .eq("student_id", studentId)
          .order("id", { ascending: false });

        if (appsErr) {
          console.error("fetch student applications error:", appsErr);
          setApplications([]);
        } else {
          setApplications((appsData || []) as ApplicationRow[]);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("RecruiterStudentProfile load error:", text);
        setMessage({ type: "error", text: "Error inesperado al cargar el perfil." });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [studentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando perfil del estudiante…</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-6 text-center">
          <p className="text-sm text-slate-700 mb-2">No se encontró este estudiante.</p>
          <button
            onClick={() => router.push("/dashboard/recruiter")}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700"
          >
            Volver al dashboard
          </button>
        </div>
      </main>
    );
  }

  const softSkills = Array.isArray(student.soft_skills) ? student.soft_skills : [];
  const techSkills = Array.isArray(student.tech_skills) ? student.tech_skills : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-400 uppercase">
              Estudiante
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {student.full_name || "Alumno sin nombre"}
            </h1>
            <p className="mt-1 text-sm text-sky-100">
              {student.degree || "Carrera no especificada"}
              {student.boleta ? ` · Boleta: ${student.boleta}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-sky-300/70 bg-sky-50/10 px-4 py-2 text-xs sm:text-sm font-medium text-sky-100 hover:bg-sky-50/20"
              onClick={() => router.push("/dashboard/recruiter")}
            >
              Volver al dashboard
            </button>
          </div>
        </header>

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

        {/* Habilidades */}
        <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Habilidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Habilidades blandas</p>
              {softSkills.length === 0 ? (
                <p className="text-sm text-slate-500">Sin habilidades blandas registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {softSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Habilidades técnicas</p>
              {techSkills.length === 0 ? (
                <p className="text-sm text-slate-500">Sin habilidades técnicas registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {techSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs text-sky-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Postulaciones del estudiante */}
        <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Postulaciones del estudiante
          </h2>
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500">Este estudiante no tiene postulaciones.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {app.jobs?.title || `Vacante #${app.job_id}`}
                    </p>
                    <p className="text-xs text-slate-600">
                      {app.jobs?.recruiters?.company_name || "Empresa no especificada"}
                    </p>
                    <p className="text-xs text-slate-500">Estado: {app.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
