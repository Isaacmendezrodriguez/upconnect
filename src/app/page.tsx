"use client";

import React from "react";
// importa aquí lo que ya usabas: useState, supabase, etc.

export default function LoginPage() {
  // aquí deja tu lógica actual: estados, handleSubmit, toggle alumno/reclutador, etc.

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-8 py-10">
          {/* Logo + título */}
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-sky-500 uppercase">
              Plataforma
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-sky-700">
              UPICONNECT
            </p>
          </div>

          {/* Toggle Alumno / Reclutador */}
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {/* Botón Alumno: pon aquí la condición de seleccionado */}
              <button
                type="button"
                className="
                  flex-1 px-4 py-2 text-xs sm:text-sm font-medium rounded-full
                  bg-sky-600 text-white shadow-sm
                "
              >
                Login Alumno
              </button>

              {/* Botón Reclutador: cuando esté activo, ponle las clases azules */}
              <button
                type="button"
                className="
                  flex-1 px-4 py-2 text-xs sm:text-sm font-medium rounded-full
                  text-slate-500 hover:text-slate-800 hover:bg-slate-200
                "
              >
                Login Reclutador
              </button>
            </div>
          </div>

          {/* Formulario de login */}
          <form className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email institucional
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="
                  w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm
                  text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                "
                placeholder="tucorreo@upi.edu.mx"
                // value={email}
                // onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="
                  w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm
                  text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                "
                placeholder="••••••••"
                // value={password}
                // onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Botón login */}
            <button
              type="submit"
              className="
                mt-2 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold
                text-white shadow-md shadow-sky-500/30
                hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white
                transition-colors
              "
            >
              Iniciar sesión
            </button>
          </form>

          {/* Links registro */}
          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-slate-500">
              ¿No tienes cuenta?
            </p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className="text-sky-600 hover:text-sky-700 font-medium"
                // onClick={() => router.push("/auth/register-student")}
              >
                Registrarme como Alumno
              </button>
              <button
                type="button"
                className="text-sky-600 hover:text-sky-700 font-medium"
                // onClick={() => router.push("/auth/register-recruiter")}
              >
                Registrarme como Reclutador
              </button>
            </div>
          </div>
        </div>

        {/* Pie de página pequeño */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          UPICONNECT · Vinculación alumnos — empresas
        </p>
      </div>
    </main>
  );
}
