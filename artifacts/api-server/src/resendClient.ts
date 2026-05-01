// Resend email client — uses RESEND_API_KEY and RESEND_FROM_EMAIL secrets
import { Resend } from "resend";

export async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!fromEmail) throw new Error("RESEND_FROM_EMAIL is not set");
  return { client: new Resend(apiKey), fromEmail };
}
