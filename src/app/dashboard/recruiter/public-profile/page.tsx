"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Recruiter = {
  id: string;
  user_id?: string;
  company_name?: string | null;
  position?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
};

type Job = { id: number; title?: string; position?: string; salary?: number | null; status?: string | null };
type Interest = { id: number; interest: string };

export default function RecruiterPublicProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user?.id) {
          setError("Usuario no autenticado.");
          setLoading(false);
          return;
        }

        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (recErr || !recData) {
          const msg = recErr ? recErr.message : "No se encontró el recruiter.";
          setError(msg);
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        // jobs públicas
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("id, title, position, salary, status")
          .eq("recruiter_id", rec.id);

        if (jobsErr) {
          console.error("jobs fetch error:", jobsErr);
          setJobs([]);
        } else {
          setJobs((jobsData || []) as Job[]);
        }

        // intereses
        const { data: intsData, error: intsErr } = await supabase
          .from("recruiter_interests")
          .select("id, interest")
          .eq("recruiter_id", rec.id)
          .order("id", { ascending: false });

        if (intsErr) {
          console.error("interests fetch error:", intsErr);
          setInterests([]);
        } else {
          setInterests((intsData || []) as Interest[]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("load public profile error:", msg);
        setError("No fue posible cargar el perfil público.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleBack = () => router.push("/dashboard/recruiter");

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (error || !recruiter) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white p-6 rounded shadow">
            <h1 className="text-xl font-semibold mb-2">Perfil público</h1>
            <p className="text-sm text-red-600 mb-4">{error ?? "No se encontró el perfil del reclutador."}</p>
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleBack}>Regresar al Dashboard</button>
          </div>
        </div>
      </main>
    );
  }

  const jobsCount = jobs.length;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Perfil público del Reclutador</h1>
          <button className="text-sm text-gray-600" onClick={handleBack}>Regresar al Dashboard</button>
        </div>

        <section className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">{recruiter.company_name ?? '—'}</h2>
          <p className="text-sm text-gray-600">{recruiter.position ?? '—'}</p>
          <p className="text-sm text-gray-600 mt-2">Contacto: {recruiter.contact_email ?? '—'}</p>
          <p className="text-sm text-gray-600 mt-1">Registrado: {recruiter.created_at ? new Date(recruiter.created_at).toLocaleDateString() : '—'}</p>
          <p className="text-sm text-gray-600 mt-1">Vacantes publicadas: {jobsCount}</p>
        </section>

        <section className="mt-6 bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">Mis vacantes públicas</h3>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No hay vacantes públicas.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(j => (
                <div key={j.id} className="p-3 border rounded">
                  <h4 className="font-medium">{j.title ?? '—'}</h4>
                  <p className="text-sm text-gray-600">Puesto: {j.position ?? '—'}</p>
                  <p className="text-sm text-gray-600">Salario: {j.salary ? `$${j.salary}` : '—'}</p>
                  <p className="text-sm text-gray-600">Estado: {j.status ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">Intereses</h3>
          {interests.length === 0 ? (
            <p className="text-sm text-gray-500">No hay intereses registrados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interests.map(tag => (
                <span key={tag.id} className="px-3 py-1 bg-gray-100 text-sm rounded-full">{tag.interest}</span>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
