"use server";

import { Resend } from "resend";

// Server Action del formulario de contacto de /acerca-de (spec 03).
// Envía el mensaje por correo con Resend; no persiste nada.

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

type SendResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const CONTACT_TO = "robertu131@gmail.com";
const CONTACT_FROM = "onboarding@resend.dev";

export async function sendContactMessage(data: ContactPayload): Promise<SendResult> {
  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();

  // Defensa en profundidad: el cliente ya valida, pero este action es un
  // endpoint público (cualquiera puede invocarlo con un POST directo).
  if (!name || !email || !message) {
    return { ok: false, error: "Faltan campos." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Correo inválido." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Envío no configurado." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `Contacto Arcade Vault — ${name}`,
      text: `De: ${name} <${email}>\n\n${message}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el mensaje." };
  }
}
