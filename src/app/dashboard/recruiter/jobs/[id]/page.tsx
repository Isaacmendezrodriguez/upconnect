"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { updateJobAvailability, setApplicationStatus } from "@/domain/jobs/jobService";

type Job = {
  id: number;
  title: string;
  position: string;
  description?: string | null;
  degree_required?: string | null;
  salary?: number | null;
  available_slots?: number | null;
  status?: string | null;
};

type Application = {
  id: number;
  job_id: number;
  student_id: string;
  status: string;
};

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const jobIdParam = params?.id;
  const isNew = jobIdParam === "new";
  const jobId = !isNew && jobIdParam ? Number(jobIdParam) : NaN;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Campos editables
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [degreeRequired, setDegreeRequired] = useState("");
  const [salary, setSalary] = useState<number | "">("");
  const [status, setStatus] = useState("ABIERTA");
  const [savingInfo, setSavingInfo] = useState(false);

  // Cupos (solo para modo edición)
  const [newSlots, setNewSlots] = useState<number | "">("");

  /* =============== CARGA DE VACANTE EXISTENTE =============== */

  const fetchJob = async () => {
    if (isNew) return; // en modo creación no buscamos en BD

    if (!jobId || Number.isNaN(jobId)) {
      setMessage({ type: "error", text: "Id de vacante inválido." });
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        console.error("fetchJob error:", error);
        setMessage({ type: "error", text: "No fue posible cargar la vacante." });
        setJob(null);
        return;
      }

      if (!data) {
        setJob(null);
        setMessage({
          type: "error",
          text: "No se encontró la vacante.",
        });
        return;
      }

      const j = data as Job;
      setJob(j);

      // Inicializar campos de edición
      setTitle(j.title || "");
      setPosition(j.position || "");
      setDescription(j.description || "");
      setDegreeRequired(j.degree_required || "");
      setSalary(typeof j.salary === "number" ? j.salary : "");
      setStatus(j.status || "ABIERTA");
      setNewSlots(
        typeof j.available_slots === "number" ? j.available_slots : ""
      );
    } catch (err) {
      console.error("fetchJob error:", err);
      setMessage({ type: "error", text: "No fue posible cargar la vacante." });
      setJob(null);
    }
  };

  const fetchApplications = async () => {
    if (isNew || !jobId || Number.isNaN(jobId)) return;

    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, student_id, job_id")
        .eq("job_id", jobId);

      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (err) {
      console.error("fetchApplications error:", err);
      setApplications([]);
      setMessage({
        type: "error",
        text: "No fue posible cargar los postulantes.",
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage(null);

      if (!isNew) {
        await fetchJob();
        await fetchApplications();
      } else {
        // modo creación: aseguramos valores por defecto
        setTitle("");
        setPosition("");
        setDescription("");
        setDegreeRequired("");
        setSalary("");
        setStatus("ABIERTA");
        setNewSlots("");
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdParam]);

  /* =============== GUARDAR INFORMACIÓN (CREATE / UPDATE) =============== */

  const handleSaveJobInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSavingInfo(true);

    // Validar salario
    if (salary !== "" && Number.isNaN(Number(salary))) {
      setMessage({
        type: "error",
        text: "El salario debe ser un número válido.",
      });
      setSavingInfo(false);
      return;
    }

    const numericSalary =
      typeof salary === "number" ? salary : salary === "" ? null : Number(salary);

    try {
      if (isNew) {
        // ===== CREAR NUEVA VACANTE =====
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user?.id) {
          console.error("auth getUser error:", authError);
          setMessage({
            type: "error",
            text: "No se pudo obtener el usuario autenticado para crear la vacante.",
          });
          setSavingInfo(false);
          return;
        }

        const recruiterId = authData.user.id;

        // available_slots al crear (opcionalmente usar newSlots si lo quisieras)
        const slotsValue =
          typeof newSlots === "number"
            ? newSlots
            : newSlots === ""
            ? null
            : Number(newSlots);

        const { data: inserted, error: insertErr } = await supabase
          .from("jobs")
          .insert({
            recruiter_id: recruiterId,
            title: title.trim(),
            position: position.trim(),
            description: description.trim() || null,
            degree_required: degreeRequired.trim() || null,
            salary: numericSalary,
            status: status || "ABIERTA",
            available_slots: slotsValue,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("insert job error:", insertErr);
          setMessage({
            type: "error",
            text: "No se pudo crear la vacante.",
          });
          setSavingInfo(false);
          return;
        }

        const newJobId = inserted?.id as number;
        setMessage({
          type: "success",
          text: "Vacante creada correctamente.",
        });

        // Redirigir al detalle de la nueva vacante (modo edición)
        router.push(`/dashboard/recruiter/jobs/${newJobId}`);
        return;
      }

      // ===== ACTUALIZAR VACANTE EXISTENTE =====
      if (!job || !jobId || Number.isNaN(jobId)) {
        setMessage({
          type: "error",
          text: "No se encontró la vacante para actualizar.",
        });
        setSavingInfo(false);
        return;
      }

      const { error } = await supabase
        .from("jobs")
        .update({
          title: title.trim(),
          position: position.trim(),
          description: description.trim() || null,
          degree_required: degreeRequired.trim() || null,
          salary: numericSalary,
          status: status || null,
        })
        .eq("id", jobId);

      if (error) {
        console.error("update job info error:", error);
        setMessage({
          type: "error",
          text: "No se pudo actualizar la información de la vacante.",
        });
        setSavingInfo(false);
        return;
      }

      // Actualizar estado local
      setJob((prev) =>
        prev
          ? {
              ...prev,
              title: title.trim(),
              position: position.trim(),
              description: description.trim() || null,
              degree_required: degreeRequired.trim() || null,
              salary: numericSalary,
              status: status || null,
            }
          : prev
      );

      setMessage({
        type: "success",
        text: "Información de la vacante actualizada correctamente.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("handleSaveJobInfo error:", msg);
      setMessage({
        type: "error",
        text: "Error inesperado al guardar la vacante.",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  /* =============== CUPOS (solo edición) =============== */

  const handleUpdateSlots = async () => {
    setMessage(null);
    if (isNew || !job || !jobId || Number.isNaN(jobId)) return;

    const slots =
      typeof newSlots === "number" ? newSlots : Number(newSlots);

    if (Number.isNaN(slots)) {
      setMessage({
        type: "error",
        text: "Ingresa un número válido de cupos.",
      });
      return;
    }

    try {
      await updateJobAvailability(jobId, slots);
      setJob((prev) =>
        prev ? { ...prev, available_slots: slots } : prev
      );
      setMessage({ type: "success", text: "Disponibilidad actualizada." });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("updateJobAvailability error:", messageText);
      if (messageText.includes("JOB_AVAILABILITY_ERROR")) {
        setMessage({
          type: "error",
          text: "No se pudo actualizar la disponibilidad.",
        });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    }
  };

  /* =============== POSTULANTES (solo edición) =============== */

  const handleSetApplicationStatus = async (
    applicationId: number,
    newStatus: "ACEPTADO" | "RECHAZADO"
  ) => {
    setMessage(null);
    try {
      await setApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: newStatus } : a
        )
      );
      setMessage({
        type: "success",
        text: "Estado del postulante actualizado.",
      });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("setApplicationStatus error:", messageText);
      if (messageText.includes("APPLICATION_STATUS_ERROR")) {
        setMessage({
          type: "error",
          text: "No se pudo actualizar el estado del postulante.",
        });
      } else {
        setMessage({ type: "error", text: messageText });
      }
    }
  };

  /* =============== RENDER =============== */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">
            {isNew ? "Preparando formulario de vacante…" : "Cargando vacante…"}
          </p>
        </div>
      </main>
    );
  }

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
              {isNew ? "Nueva vacante" : "Detalle de vacante"}
            </h1>
          </div>
          <button
            className="text-sm text-sky-300 hover:text-sky-100 underline-offset-2"
            onClick={() => router.push("/dashboard/recruiter")}
          >
            Regresar al dashboard
          </button>
        </div>

        {/* Mensajes */}
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

        {/* Si es edición y realmente no encontramos la vacante */}
        {!isNew && !job ? (
          <div className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-8 text-center">
            <p className="text-sm text-slate-700 mb-2">
              No se encontró la vacante.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Verifica que la vacante exista o regresa al listado.
            </p>
            <button
              onClick={() => router.push("/dashboard/recruiter")}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700"
            >
              Volver al dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información editable */}
            <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {isNew ? "Información de la nueva vacante" : "Información de la vacante"}
              </h2>

              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={handleSaveJobInfo}
              >
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-700 mb-1">
                    Título
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Puesto
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Título requerido
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={degreeRequired}
                    onChange={(e) => setDegreeRequired(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Salario (opcional)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={salary === "" ? "" : salary}
                    onChange={(e) =>
                      setSalary(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ABIERTA">ABIERTA</option>
                    <option value="CERRADA">CERRADA</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 min-h-[100px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-2 justify-end mt-2">
                  <button
                    type="submit"
                    disabled={savingInfo}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700 disabled:opacity-60"
                  >
                    {savingInfo
                      ? isNew
                        ? "Creando…"
                        : "Guardando…"
                      : isNew
                      ? "Crear vacante"
                      : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </section>

            {/* Cupos y postulantes solo en modo edición */}
            {!isNew && job && (
              <>
                {/* Cupos */}
                <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Disponibilidad de cupos
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                      value={newSlots === "" ? "" : newSlots}
                      onChange={(e) =>
                        setNewSlots(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                    <button
                      onClick={handleUpdateSlots}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      Actualizar cupos
                    </button>
                    <p className="text-xs text-slate-500">
                      Cupos actuales:{" "}
                      <span className="font-semibold">
                        {job.available_slots ?? "—"}
                      </span>
                    </p>
                  </div>
                </section>

                {/* Postulantes */}
                <section className="rounded-2xl bg-white/95 shadow-xl border border-slate-100 px-6 py-5 mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Postulantes
                  </h3>
                  {applications.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay postulantes aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {applications.map((app) => (
                        <div
                          key={app.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm text-slate-800">
                              Student ID:{" "}
                              <span className="font-mono text-xs">
                                {app.student_id}
                              </span>
                            </p>
                            <p className="text-xs text-slate-600">
                              Estado actual: {app.status}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              onClick={() =>
                                handleSetApplicationStatus(app.id, "ACEPTADO")
                              }
                            >
                              Aceptar
                            </button>
                            <button
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                              onClick={() =>
                                handleSetApplicationStatus(app.id, "RECHAZADO")
                              }
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
