"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "student" | "recruiter";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage({
        type: "error",
        text: "Por favor ingresa correo y contraseña.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1) Login contra Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Error directo de autenticación (correo/contraseña mal)
        console.error("auth signIn error:", error);
        setMessage({
          type: "error",
          text:
            mode === "recruiter"
              ? "Credenciales incorrectas para Reclutador."
              : "Credenciales incorrectas.",
        });
        return;
      }

      const user = data.user;
      if (!user?.id) {
        setMessage({
          type: "error",
          text: "No se pudo obtener el usuario autenticado.",
        });
        return;
      }

      // 2) Si es login de RECLUTADOR, validamos que tenga fila en recruiters
      if (mode === "recruiter") {
        const { data: recData, error: recErr } = await supabase
          .from("recruiters")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (recErr) {
          console.error("fetch recruiter on login error:", recErr);
          setMessage({
            type: "error",
            text:
              "Ocurrió un error al validar tu perfil de reclutador. Intenta de nuevo.",
          });
          return;
        }

        if (!recData) {
          // Usuario existe en auth, pero no tiene registro en recruiters
          setMessage({
            type: "error",
            text:
              "Tu usuario está registrado, pero no tiene perfil de reclutador. Regístrate como reclutador primero.",
          });
          return;
        }

        // OK → mandamos al dashboard de reclutador
        router.push("/dashboard/recruiter");
        return;
      }

      // 3) Si es login de ALUMNO, validamos que exista en students
      if (mode === "student") {
        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (stuErr) {
          console.error("fetch student on login error:", stuErr);
          setMessage({
            type: "error",
            text:
              "Ocurrió un error al validar tu perfil de alumno. Intenta de nuevo.",
          });
          return;
        }

        if (!stuData) {
          setMessage({
            type: "error",
            text:
              "Tu usuario está registrado, pero no tiene perfil de alumno. Regístrate como alumno primero.",
          });
          return;
        }

        router.push("/dashboard/student");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("handleLogin unexpected error:", msg);
      setMessage({
        type: "error",
        text: "Error inesperado al iniciar sesión.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
        {/* Encabezado plataforma */}
        <div className="mb-4 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
            Plataforma
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium tracking-wide text-sky-700">
            UPICONNECT
          </p>
        </div>

        {/* Tabs Alumno / Reclutador */}
        <div className="mb-4 flex rounded-full bg-slate-100 p-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("student");
              setMessage(null);
            }}
            className={`flex-1 rounded-full py-1.5 font-semibold transition ${
              mode === "student"
                ? "bg-white shadow-sm text-sky-700"
                : "text-slate-500"
            }`}
          >
            Login Alumno
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("recruiter");
              setMessage(null);
            }}
            className={`flex-1 rounded-full py-1.5 font-semibold transition ${
              mode === "recruiter"
                ? "bg-white shadow-sm text-sky-700"
                : "text-slate-500"
            }`}
          >
            Login Reclutador
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

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Iniciando sesión…" : "Iniciar Sesión"}
          </button>
        </form>

        {/* Links registro */}
        <div className="mt-4 text-center text-xs text-slate-600">
          <p className="mb-1">¿No tienes cuenta?</p>
          <div className="flex flex-col gap-1">
            <a
              href="/register-student"
              className="text-sky-600 hover:text-sky-700"
            >
              Registrarme como Alumno
            </a>
            <a
              href="/register-recruiter"
              className="text-sky-600 hover:text-sky-700"
            >
              Registrarme como Reclutador
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          UPICONNECT · Vinculación alumnos — empresas
        </p>
      </div>
    </main>
  );
}
