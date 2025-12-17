import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServiceClient";
import { resend } from "@/lib/emailClient";

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    // 1) Obtener la aplicación (job_id y student_id)
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("id, job_id, student_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr) {
      console.error("application-accepted: fetch application error", appErr);
      return NextResponse.json(
        { error: "No se pudo cargar la aplicación" },
        { status: 500 }
      );
    }

    if (!application) {
      return NextResponse.json(
        { error: "Aplicación no encontrada" },
        { status: 404 }
      );
    }

    // 2) Obtener email del estudiante desde Supabase Auth
    const { data: userResult, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(application.student_id);

    if (userErr || !userResult?.user?.email) {
      console.error("application-accepted: getUserById error", userErr);
      return NextResponse.json(
        { error: "No se pudo obtener el correo del estudiante" },
        { status: 500 }
      );
    }

    const studentEmail = userResult.user.email;

    // 3) Obtener info de la vacante (para el asunto)
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .select("title")
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobErr) {
      console.error("application-accepted: fetch job error", jobErr);
    }

    const jobTitle = job?.title ?? "una vacante";

    const { error: sendErr } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: studentEmail,
      subject: `Has sido preseleccionado para ${jobTitle}`,
      text: `Hola,

Tu perfil ha sido ACEPTADO como prospecto para ${jobTitle} en UPICONNECT.
La empresa se pondra en contacto contigo usando los datos que registraste en la plataforma.

Identificador de tu postulacion: ${application.id}

-- Equipo UPICONNECT`,
    });

    if (sendErr) {
      console.error("application-accepted: resend error", sendErr);
      return NextResponse.json(
        { error: "No se pudo enviar el correo de notificacion" },
        { status: 502 }
      );
    }


    // 5) Respuesta a la app (para mostrar en pantalla)
    return NextResponse.json({
      ok: true,
      applicationId: application.id,
      studentEmail,
    });
  } catch (err) {
    console.error("application-accepted route error:", err);
    return NextResponse.json(
      { error: "Error interno en la notificación" },
      { status: 500 }
    );
  }
}
