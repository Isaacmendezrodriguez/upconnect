import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required in .env.local");
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "mendezrodriguezisaac4@gmail.com",
    subject: "Prueba Resend desde script local",
    html: "<p>Hola, este es un correo de prueba.</p>",
  });

  console.log("Resend result:", result);
}

main().catch((error) => {
  console.error("Resend error:", error);
  process.exit(1);
});
