"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerRecruiter } from "@/domain/recruiters/recruiterService";

export default function RegisterRecruiterPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!companyName || !position || !email || !password) {
      setMessage({
        type: "error",
        text: "Por favor completa todos los campos.",
      });
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);
    try {
      await registerRecruiter({ email, password, companyName, position });

      // Si el registro en Supabase/Auth + tabla recruiters fue correcto:
      setMessage({
        type: "success",
        text: "Cuenta creada correctamente. Ahora puedes iniciar sesión.",
      });

      // Opcional: limpiar campos
      setCompanyName("");
      setPosition("");
      setEmail("");
      setPassword("");

      // Redirigir a login
      router.push("/login");
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({
        type: "error",
        text: text || "No fue posible registrar al reclutador.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
        {/* Encabezado */}
        <header className="mb-6 text-center">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-500 uppercase">
            UPICONNECT
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Registro de reclutador
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Crea tu cuenta para publicar vacantes y gestionar postulantes.
          </p>
        </header>

        {/* Mensajes */}
        {message && (
          <div
            className={`mb-4 rounded-md px-3 py-2 text-sm border ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la empresa
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej. INDEP Business Partner"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Puesto / Cargo
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ej. Coordinador de selección"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empresa@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Mínimo 6 caracteres.
            </p>
          </div>

          <button
            type="submit"
            className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5
                       text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700
                       disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Registrando…" : "Registrar reclutador"}
          </button>
        </form>

        {/* Link a login */}
        <p className="mt-5 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
