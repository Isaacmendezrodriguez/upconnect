"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerStudent } from "@/domain/students/studentService";

export default function RegisterStudentPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación básica antes de llamar al servicio
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !enrollmentNumber.trim()
    ) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await registerStudent({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        enrollmentNumber: enrollmentNumber.trim(),
      });

      // Registro exitoso → ir a login
      router.push("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // Patrón similar a Reclutador: traducimos errores de dominio
      if (msg.includes("STUDENT_INSERT_ERROR")) {
        setError("No se pudo guardar el perfil de estudiante. Intenta de nuevo.");
      } else if (msg.includes("AUTH_ERROR")) {
        setError(
          "No se pudo crear la cuenta de acceso. Verifica el correo o consulta la configuración de autenticación."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-7 py-8">
        {/* Encabezado tipo login/reclutador */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
            Plataforma
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
            Registro de alumno
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium tracking-wide text-sky-700">
            UPICONNECT
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Apellidos
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Matrícula / Boleta
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={enrollmentNumber}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5
                       text-sm font-semibold text-white shadow-md hover:bg-emerald-700
                       disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500
                       focus:ring-offset-2 focus:ring-offset-white"
          >
            {loading ? "Registrando…" : "Registrar Alumno"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
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
