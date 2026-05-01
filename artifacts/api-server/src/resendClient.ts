// Resend email client — uses RESEND_API_KEY secret; sender defaults to onboarding@resend.dev
import { Resend } from "resend";

const DEFAULT_FROM = "onboarding@resend.dev";

export async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const fromEmail = DEFAULT_FROM;
  return { client: new Resend(apiKey), fromEmail };
}
