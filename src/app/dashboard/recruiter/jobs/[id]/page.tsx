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

  // Nuevos campos
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

  // Campos base
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [degreeRequired, setDegreeRequired] = useState("");
  const [salary, setSalary] = useState<number | "">("");
  const [status, setStatus] = useState("ABIERTA");
  const [savingInfo, setSavingInfo] = useState(false);

  // Nuevos campos
  const [area, setArea] = useState<string | "">("");
  const [nivelPuesto, setNivelPuesto] = useState<string | "">("");
  const [tipoPrograma, setTipoPrograma] = useState<string | "">("");
  const [nivelEducativo, setNivelEducativo] = useState<string | "">("");
  const [semestreMinimo, setSemestreMinimo] = useState<number | "">("");
  const [modalidadTrabajo, setModalidadTrabajo] = useState<string | "">("");
  const [horarioTrabajo, setHorarioTrabajo] = useState<string | "">("");
  const [salarioMinimo, setSalarioMinimo] = useState<number | "">("");
  const [salarioMaximo, setSalarioMaximo] = useState<number | "">("");
  const [moneda, setMoneda] = useState<string>("MXN");
  const [beneficios, setBeneficios] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");

  // Cupos
  const [newSlots, setNewSlots] = useState<number | "">("");

  /* =============== HELPERS =============== */

  const parseTagsToArray = (text: string): string[] =>
    text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

  /* =============== CARGA DE VACANTE =============== */

  const fetchJob = async () => {
    if (isNew) return;

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
        setMessage({ type: "error", text: "No se encontró la vacante." });
        return;
      }

      const j = data as Job;
      setJob(j);

      // Campos base
      setTitle(j.title || "");
      setPosition(j.position || "");
      setDescription(j.description || "");
      setDegreeRequired(j.degree_required || "");
      setSalary(typeof j.salary === "number" ? j.salary : "");
      setStatus(j.status || "ABIERTA");
      setNewSlots(typeof j.available_slots === "number" ? j.available_slots : "");

      // Nuevos campos
      setArea(j.area ?? "");
      setNivelPuesto(j.nivel_puesto ?? "");
      setTipoPrograma(j.tipo_programa ?? "");
      setNivelEducativo(j.nivel_educativo_requerido ?? "");
      setSemestreMinimo(typeof j.semestre_minimo === "number" ? j.semestre_minimo : "");
      setModalidadTrabajo(j.modalidad_trabajo ?? "");
      setHorarioTrabajo(j.horario_trabajo ?? "");
      setSalarioMinimo(typeof j.salario_minimo === "number" ? j.salario_minimo : "");
      setSalarioMaximo(typeof j.salario_maximo === "number" ? j.salario_maximo : "");
      setMoneda(j.moneda ?? "MXN");
      setBeneficios(j.beneficios ?? "");
      setTagsInput(Array.isArray(j.tags) ? j.tags.join(", ") : "");
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
        // defaults creación
        setTitle("");
        setPosition("");
        setDescription("");
        setDegreeRequired("");
        setSalary("");
        setStatus("ABIERTA");
        setNewSlots("");

        setArea("");
        setNivelPuesto("");
        setTipoPrograma("");
        setNivelEducativo("");
        setSemestreMinimo("");
        setModalidadTrabajo("");
        setHorarioTrabajo("");
        setSalarioMinimo("");
        setSalarioMaximo("");
        setMoneda("MXN");
        setBeneficios("");
        setTagsInput("");
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdParam]);

  /* =============== GUARDAR VACANTE (CREATE / UPDATE) =============== */

  const handleSaveJobInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSavingInfo(true);

    if (salary !== "" && Number.isNaN(Number(salary))) {
      setMessage({ type: "error", text: "El salario debe ser un número válido." });
      setSavingInfo(false);
      return;
    }
    if (semestreMinimo !== "" && Number.isNaN(Number(semestreMinimo))) {
      setMessage({
        type: "error",
        text: "El semestre mínimo debe ser un número válido.",
      });
      setSavingInfo(false);
      return;
    }
    if (salarioMinimo !== "" && Number.isNaN(Number(salarioMinimo))) {
      setMessage({
        type: "error",
        text: "El salario mínimo debe ser un número válido.",
      });
      setSavingInfo(false);
      return;
    }
    if (salarioMaximo !== "" && Number.isNaN(Number(salarioMaximo))) {
      setMessage({
        type: "error",
        text: "El salario máximo debe ser un número válido.",
      });
      setSavingInfo(false);
      return;
    }

    const numericSalary =
      typeof salary === "number" ? salary : salary === "" ? null : Number(salary);

    const numericSemestre =
      semestreMinimo === "" ? null : Number(semestreMinimo);

    const numericSalMin =
      salarioMinimo === "" ? null : Number(salarioMinimo);

    const numericSalMax =
      salarioMaximo === "" ? null : Number(salarioMaximo);

    const tagsArray = parseTagsToArray(tagsInput);

    try {
      if (isNew) {
        // CREAR
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

            area: area === "" ? null : area,
            nivel_puesto: nivelPuesto === "" ? null : nivelPuesto,
            tipo_programa: tipoPrograma === "" ? null : tipoPrograma,
            nivel_educativo_requerido: nivelEducativo === "" ? null : nivelEducativo,
            semestre_minimo: numericSemestre,
            modalidad_trabajo: modalidadTrabajo === "" ? null : modalidadTrabajo,
            horario_trabajo: horarioTrabajo === "" ? null : horarioTrabajo,
            salario_minimo: numericSalMin,
            salario_maximo: numericSalMax,
            moneda: moneda?.trim() || "MXN",
            beneficios: beneficios.trim() || null,
            tags: tagsArray,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("insert job error:", insertErr);
          setMessage({ type: "error", text: "No se pudo crear la vacante." });
          setSavingInfo(false);
          return;
        }

        const newJobId = inserted?.id as number;
        setMessage({ type: "success", text: "Vacante creada correctamente." });
        router.push(`/dashboard/recruiter/jobs/${newJobId}`);
        return;
      }

      // ACTUALIZAR
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

          area: area === "" ? null : area,
          nivel_puesto: nivelPuesto === "" ? null : nivelPuesto,
          tipo_programa: tipoPrograma === "" ? null : tipoPrograma,
          nivel_educativo_requerido: nivelEducativo === "" ? null : nivelEducativo,
          semestre_minimo: numericSemestre,
          modalidad_trabajo: modalidadTrabajo === "" ? null : modalidadTrabajo,
          horario_trabajo: horarioTrabajo === "" ? null : horarioTrabajo,
          salario_minimo: numericSalMin,
          salario_maximo: numericSalMax,
          moneda: moneda?.trim() || "MXN",
          beneficios: beneficios.trim() || null,
          tags: tagsArray,
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
              area: area === "" ? null : area,
              nivel_puesto: nivelPuesto === "" ? null : nivelPuesto,
              tipo_programa: tipoPrograma === "" ? null : tipoPrograma,
              nivel_educativo_requerido: nivelEducativo === "" ? null : nivelEducativo,
              semestre_minimo: numericSemestre,
              modalidad_trabajo: modalidadTrabajo === "" ? null : modalidadTrabajo,
              horario_trabajo: horarioTrabajo === "" ? null : horarioTrabajo,
              salario_minimo: numericSalMin,
              salario_maximo: numericSalMax,
              moneda: moneda?.trim() || "MXN",
              beneficios: beneficios.trim() || null,
              tags: tagsArray,
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

  /* =============== CUPOS =============== */

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

  /* =============== POSTULANTES =============== */

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
            {/* Formulario vacante */}
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
                      setSalary(e.target.value === "" ? "" : Number(e.target.value))
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

                {/* Nuevos campos */}
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Área</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="frontend">frontend</option>
                    <option value="backend">backend</option>
                    <option value="fullstack">fullstack</option>
                    <option value="qa">qa</option>
                    <option value="datos">datos</option>
                    <option value="soporte">soporte</option>
                    <option value="devops">devops</option>
                    <option value="ui-ux">ui-ux</option>
                    <option value="otro">otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Nivel del puesto</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={nivelPuesto}
                    onChange={(e) => setNivelPuesto(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="trainee">trainee</option>
                    <option value="junior">junior</option>
                    <option value="semisenior">semisenior</option>
                    <option value="sin-experiencia">sin-experiencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Tipo de programa</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={tipoPrograma}
                    onChange={(e) => setTipoPrograma(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="practicas-profesionales">practicas-profesionales</option>
                    <option value="servicio-social">servicio-social</option>
                    <option value="residencias">residencias</option>
                    <option value="proyecto-temporal">proyecto-temporal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Nivel educativo requerido
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={nivelEducativo}
                    onChange={(e) => setNivelEducativo(e.target.value)}
                  >
                    <option value="">Cualquiera</option>
                    <option value="SECUNDARIA">SECUNDARIA</option>
                    <option value="BACHILLERATO">BACHILLERATO</option>
                    <option value="UNIVERSIDAD">UNIVERSIDAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Semestre mínimo (opcional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={semestreMinimo === "" ? "" : semestreMinimo}
                    onChange={(e) =>
                      setSemestreMinimo(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Modalidad</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={modalidadTrabajo}
                    onChange={(e) => setModalidadTrabajo(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="remoto">remoto</option>
                    <option value="hibrido">hibrido</option>
                    <option value="presencial">presencial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Horario</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={horarioTrabajo}
                    onChange={(e) => setHorarioTrabajo(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="medio-tiempo">medio-tiempo</option>
                    <option value="tiempo-completo">tiempo-completo</option>
                    <option value="horario-flexible">horario-flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Salario mínimo (opcional)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={salarioMinimo === "" ? "" : salarioMinimo}
                    onChange={(e) =>
                      setSalarioMinimo(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Salario máximo (opcional)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={salarioMaximo === "" ? "" : salarioMaximo}
                    onChange={(e) =>
                      setSalarioMaximo(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Moneda</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    placeholder="MXN"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-700 mb-1">
                    Beneficios y prestaciones
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 min-h-[80px]"
                    value={beneficios}
                    onChange={(e) => setBeneficios(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-700 mb-1">
                    Tags (separados por comas)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder='Ej. "frontend, trainee, practicas-profesionales, remoto"'
                  />
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

            {/* Cupos + Postulantes solo edición */}
            {!isNew && job && (
              <>
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
