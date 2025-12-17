"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Student = {
  id: string; // PK (igual a auth.users.id)
  user_id?: string;
  full_name?: string | null;
  degree?: string | null;

  // Nuevos campos
  boleta?: string | null;
  soft_skills?: string[] | null;
  tech_skills?: string[] | null;
};

const parseTagsToArray = (text: string): string[] =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toLowerCase());

// Sugerencias de actitudes
const DEFAULT_SOFT_SKILLS = [
  "capacidad de trabajo en equipo",
  "capacidad de comunicarse",
  "pensamiento crítico",
  "adaptabilidad",
  "responsabilidad",
];

// Sugerencias de habilidades técnicas
const DEFAULT_TECH_SKILLS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  "react",
  "node.js",
  "sql",
];

export default function StudentProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);

  const [fullName, setFullName] = useState("");
  const [degree, setDegree] = useState("");
  const [boleta, setBoleta] = useState("");

  const [softSkillsInput, setSoftSkillsInput] = useState("");
  const [techSkillsInput, setTechSkillsInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // ========= CARGA DEL PERFIL =========
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.error("auth error:", authErr);
        }

        const user = authData?.user;
        if (!user?.id) {
          console.warn("StudentProfile: no hay user.id");
          setStudent(null);
          setMessage({
            type: "error",
            text: "No estás autenticado. Inicia sesión para ver tu perfil.",
          });
          setLoading(false);
          return;
        }

        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (stuErr) {
          console.error("fetch student error:", stuErr);
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se pudo cargar tu perfil de estudiante.",
          });
          setLoading(false);
          return;
        }

        if (!stuData) {
          console.warn("StudentProfile: no hay fila en students para", user.id);
          setStudent(null);
          setMessage({
            type: "error",
            text: "No se encontró tu perfil de estudiante en la base de datos.",
          });
          setLoading(false);
          return;
        }

        const stu = stuData as Student;
        setStudent(stu);
        setFullName(stu.full_name ?? "");
        setDegree(stu.degree ?? "");
        setBoleta(stu.boleta ?? "");

        setSoftSkillsInput(
          Array.isArray(stu.soft_skills) ? stu.soft_skills.join(", ") : ""
        );
        setTechSkillsInput(
          Array.isArray(stu.tech_skills) ? stu.tech_skills.join(", ") : ""
        );
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        console.error("StudentProfile load error:", text);
        setStudent(null);
        setMessage({
          type: "error",
          text: "Error inesperado al cargar tu perfil.",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // ========= GUARDAR CAMBIOS =========
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setSaving(true);
    setMessage(null);

    // Validación de boleta: 8 caracteres alfanuméricos
    if (boleta.trim() !== "") {
      const regex = /^[A-Za-z0-9]{8}$/;
      if (!regex.test(boleta.trim())) {
        setSaving(false);
        setMessage({
          type: "error",
          text: "La boleta debe tener exactamente 8 caracteres alfanuméricos (letras y números).",
        });
        return;
      }
    }

    const softSkillsArray = parseTagsToArray(softSkillsInput);
    const techSkillsArray = parseTagsToArray(techSkillsInput);

    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: fullName.trim() || null,
          degree: degree.trim() || null,
          boleta: boleta.trim() || null,
          soft_skills: softSkillsArray,
          tech_skills: techSkillsArray,
        })
        .eq("id", student.id);

      if (error) {
        console.error("update student error:", error);
        setMessage({
          type: "error",
          text: "No se pudo actualizar tu perfil.",
        });
        return;
      }

      setStudent((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim() || null,
              degree: degree.trim() || null,
              boleta: boleta.trim() || null,
              soft_skills: softSkillsArray,
              tech_skills: techSkillsArray,
            }
          : prev
      );

      setMessage({
        type: "success",
        text: "Perfil actualizado correctamente.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error("handleSave error:", text);
      setMessage({
        type: "error",
        text: "Error inesperado al actualizar tu perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/student");
  };

  const addSoftSkill = (tag: string) => {
    const current = parseTagsToArray(softSkillsInput);
    if (!current.includes(tag.toLowerCase())) {
      const updated = [...current, tag.toLowerCase()];
      setSoftSkillsInput(updated.join(", "));
    }
  };

  const addTechSkill = (tag: string) => {
    const current = parseTagsToArray(techSkillsInput);
    if (!current.includes(tag.toLowerCase())) {
      const updated = [...current, tag.toLowerCase()];
      setTechSkillsInput(updated.join(", "));
    }
  };

  // ========= ESTADOS =========

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-700">Cargando perfil de estudiante…</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
                Estudiante
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                Perfil de estudiante
              </h1>
            </div>
          </header>

          <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-6 text-center">
            <p className="text-sm text-red-600 mb-2">
              No se encontró tu perfil de estudiante.
            </p>
            <p className="text-xs text-slate-600 mb-4">
              Inicia sesión de nuevo o pide a soporte que te den de alta en la
              tabla <span className="font-mono text-[11px]">students</span>.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-700"
              >
                Ir a login
              </button>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ========= UI PRINCIPAL =========
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Estudiante
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Perfil de estudiante
            </h1>
            <p className="mt-1 text-sm text-sky-100/80">
              Completa tu perfil para que los reclutadores entiendan mejor quién
              eres y qué sabes hacer.
            </p>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-sky-300 hover:text-sky-100 underline-offset-2"
          >
            Regresar al tablero
          </button>
        </header>

        {/* Mensaje global */}
        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm border ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Card principal */}
        <section className="bg-white/95 rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-6">
          {/* Datos básicos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Datos básicos
              </h2>
              <span className="text-[11px] text-slate-500">
                ID alumno:{" "}
                <span className="font-mono bg-slate-50 px-2 py-0.5 rounded">
                  {student.id.slice(0, 8)}…
                </span>
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez López"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Carrera / Programa
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="Ej. Ingeniería en Sistemas Computacionales"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Boleta
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  value={boleta}
                  onChange={(e) => setBoleta(e.target.value)}
                  placeholder="Ej. 2025AB12"
                  maxLength={8}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Debe tener exactamente 8 caracteres alfanuméricos (letras y
                  números).
                </p>
              </div>
            </div>
          </div>

          {/* Actitudes / Soft skills */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Actitudes y habilidades blandas
            </h2>
            <p className="text-xs text-slate-600 mb-2">
              Escribe tus actitudes separadas por comas o selecciona algunas
              sugerencias. Ejemplo:{" "}
              <span className="font-mono text-[11px]">
                trabajo en equipo, liderazgo, comunicación
              </span>
            </p>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={softSkillsInput}
              onChange={(e) => setSoftSkillsInput(e.target.value)}
              placeholder="trabajo en equipo, comunicación, responsabilidad"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_SOFT_SKILLS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addSoftSkill(tag)}
                  className="text-[11px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-sky-50 hover:border-sky-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Habilidades técnicas */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Habilidades técnicas (lenguajes / tecnologías)
            </h2>
            <p className="text-xs text-slate-600 mb-2">
              Escribe tus lenguajes y tecnologías separadas por comas. Ejemplo:{" "}
              <span className="font-mono text-[11px]">
                javascript, react, node.js
              </span>
            </p>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={techSkillsInput}
              onChange={(e) => setTechSkillsInput(e.target.value)}
              placeholder="javascript, typescript, react..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_TECH_SKILLS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTechSkill(tag)}
                  className="text-[11px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:bg-sky-50 hover:border-sky-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-wrap gap-3 pt-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setFullName(student.full_name ?? "");
                setDegree(student.degree ?? "");
                setBoleta(student.boleta ?? "");
                setSoftSkillsInput(
                  Array.isArray(student.soft_skills)
                    ? student.soft_skills.join(", ")
                    : ""
                );
                setTechSkillsInput(
                  Array.isArray(student.tech_skills)
                    ? student.tech_skills.join(", ")
                    : ""
                );
                setMessage(null);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Revertir cambios
            </button>
            <button
              type="submit"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sky-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          UPICONNECT · Perfil de estudiantes
        </p>
      </div>
    </main>
  );
}
