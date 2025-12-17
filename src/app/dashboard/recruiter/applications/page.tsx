"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setApplicationStatus } from "@/domain/jobs/jobService";

type Recruiter = { id: string; user_id?: string; company_name?: string };

type ApplicationRow = {
  id: number;
  status: string;
  student_id: string;
  job_id: number;
  jobs?: Array<{ title?: string }>; // supabase returns related jobs as an array
};

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user?.id) {
          setRecruiter(null);
          setApplications([]);
          setMessage({ type: "error", text: "Usuario no autenticado." });
          setLoading(false);
          return;
        }

        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (recErr) {
          console.error("fetch recruiter error:", recErr);
          setRecruiter(null);
          setApplications([]);
          setMessage({ type: "error", text: "No fue posible cargar el perfil de reclutador." });
          setLoading(false);
          return;
        }

        const rec = recData as Recruiter;
        setRecruiter(rec);

        // Obtener todas las postulaciones a las vacantes del recruiter
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select("id, status, student_id, job_id, jobs(title)")
          .eq("jobs.recruiter_id", rec.id)
          .order("id", { ascending: false });

        if (appsErr) throw appsErr;

        setApplications((appsData || []) as ApplicationRow[]);
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("fetchRecruiterAndApplications error:", text);
        setApplications([]);
        setMessage({ type: "error", text: "No fue posible cargar las postulaciones." });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const handleSetStatus = async (applicationId: number, status: "ACEPTADO" | "RECHAZADO") => {
    setMessage(null);
    setProcessingId(applicationId);
    try {
      await setApplicationStatus(applicationId, status);
      setApplications(prev => prev.map(a => (a.id === applicationId ? { ...a, status } : a)));

      if (status === "ACEPTADO") {
        try {
          const res = await fetch("/api/notifications/application-accepted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error("application-accepted API not ok:", res.status, body);
            setMessage({
              type: "success",
              text: "Estado actualizado, pero no se pudo enviar la notificacion por correo.",
            });
            return;
          }

          const data = await res.json();
          setMessage({
            type: "success",
            text: `Estado actualizado. Se notifico a ${data.studentEmail} (ID postulacion ${data.applicationId}).`,
          });
          return;
        } catch (notifyErr) {
          console.error("application-accepted API error:", notifyErr);
          setMessage({
            type: "success",
            text: "Estado actualizado, pero hubo un error al enviar la notificacion.",
          });
          return;
        }
      }

      setMessage({ type: "success", text: "Estado del postulante actualizado." });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("setApplicationStatus error:", messageText);
      if (messageText.includes("APPLICATION_STATUS_ERROR")) {
        setMessage({ type: "error", text: "No se pudo actualizar el estado del postulante." });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleBack = () => router.push("/dashboard/recruiter");

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!recruiter) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Postulaciones</h1>
            <div className="flex items-center gap-3">
              <button className="text-sm text-gray-600" onClick={() => router.push("/dashboard/recruiter")}>Regresar</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <p className="text-sm text-gray-600">No se encontró el perfil del reclutador. Verifica que estés autenticado.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Postulaciones</h1>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600" onClick={handleBack}>Regresar</button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vacante</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map(app => (
                <tr key={app.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{app.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{(app.jobs && app.jobs[0] && app.jobs[0].title) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{app.student_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{app.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex gap-2">
                      <button
                        disabled={processingId === app.id}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                        onClick={() => handleSetStatus(app.id, 'ACEPTADO')}
                      >
                        {processingId === app.id ? 'Procesando...' : 'Aceptar'}
                      </button>

                      <button
                        disabled={processingId === app.id}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                        onClick={() => handleSetStatus(app.id, 'RECHAZADO')}
                      >
                        {processingId === app.id ? 'Procesando...' : 'Rechazar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No hay postulaciones.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
