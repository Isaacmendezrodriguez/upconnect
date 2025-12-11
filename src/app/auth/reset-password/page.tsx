import React from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center px-4">
          <div className="rounded-2xl bg-white/95 shadow-2xl border border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-700">Cargando…</p>
          </div>
        </main>
      }
    >
      {/* ResetPasswordClient usa hooks de cliente como useSearchParams */}
      <ResetPasswordClient />
    </React.Suspense>
  );
}
