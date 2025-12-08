"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Verificar que hay un token válido
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Escuchar cambios de estado de autenticación que ocurren cuando el link de recuperación es procesado
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setIsValidToken(true);
          return;
        }

        // Si no hay usuario aún, register a onAuthStateChange listener briefly to detect session created by Supabase
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            setIsValidToken(true);
          }
        });

        // remove listener after short timeout to avoid leaks
        setTimeout(() => {
          listener?.subscription?.unsubscribe?.();
        }, 3000);
      } catch (err) {
        setIsValidToken(false);
        setMessage({
          type: "error",
          text: "Error al verificar la sesión. Intenta de nuevo.",
        });
      }
    };

    checkToken();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password || !passwordConfirm) {
      setMessage({
        type: "error",
        text: "Por favor completa ambos campos de contraseña.",
      });
      return;
    }

    if (password !== passwordConfirm) {
      setMessage({
        type: "error",
        text: "Las contraseñas no coinciden.",
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
      // Verificar que hay una sesión activa (creada por el link de recuperación)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setMessage({
          type: "error",
          text: "La sesión ha expirado o no se detectó. Por favor, solicita un nuevo enlace de recuperación.",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Update password error:", error);
        setMessage({
          type: "error",
          text:
            error.message ||
            "No fue posible actualizar la contraseña. Intenta de nuevo.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Contraseña actualizada exitosamente. Redirigiendo al login...",
      });

      // Cerrar sesión y redirigir
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, 2000);
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

  if (!isValidToken) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Sesión inválida
            </p>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
              Enlace expirado
            </h1>
          </div>

          <div className="mb-4 rounded-md px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-100">
            <p className="mb-2">
              El enlace de recuperación ha expirado o no es válido.
            </p>
            <p>Por favor, solicita un nuevo enlace de recuperación.</p>
          </div>

          <div className="flex gap-2">
            <a
              href="/auth/forgot-password"
              className="flex-1 text-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
            >
              Solicitar nuevo enlace
            </a>
            <a
              href="/login"
              className="flex-1 text-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
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


  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
            Nueva contraseña
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
            Restablecer contraseña
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Crea una nueva contraseña para tu cuenta
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
        <form onSubmit={handleResetPassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>

        {/* Link volver */}
        <div className="mt-6 text-center text-xs text-slate-600">
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
