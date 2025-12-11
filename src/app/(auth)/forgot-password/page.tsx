"use client";

import React, { useState } from "react";
// import { useRouter } from "next/navigation"; // lo puedes borrar si no lo usas
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  // const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage({
        type: "error",
        text: "Por favor ingresa tu correo electrónico.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error("Reset password error:", error);
        setMessage({
          type: "error",
          text:
            error.message ||
            "No fue posible enviar el correo de recuperación. Intenta de nuevo.",
        });
        return;
      }

      setMessage({
        type: "success",
        text:
          "Se ha enviado un correo de recuperación a tu email. Revisa tu bandeja de entrada.",
      });
      setEmail("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("handleResetPassword error:", msg);
      setMessage({
        type: "error",
        text: "Error inesperado. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
            Recuperación
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Ingresa tu correo para recibir instrucciones
          </p>
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

        {/* Formulario */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar correo de recuperación"}
          </button>
        </form>

        {/* Link volver */}
        <div className="mt-6 text-center text-xs text-slate-600">
          <p className="mb-2">¿Recordaste tu contraseña?</p>
          <a href="/login" className="text-sky-600 hover:text-sky-700 font-medium">
            Volver al login
          </a>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          UPICONNECT · Vinculación alumnos — empresas
        </p>
      </div>
    </main>
  );
}
