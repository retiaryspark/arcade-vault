# 03 — Envío real de correo en el formulario de Contacto (Resend)

**Estado:** Aprobado
**Depende de:** SPEC 02
**Fecha:** 2026-09-13

**Objetivo:** Conectar el formulario de contacto ya existente en `/acerca-de` a un envío real de correo usando Resend, en vez de la simulación local actual, manteniendo intacto el diseño y la validación de vacíos ya implementados.

---

## Alcance

**Incluye:**

- Un Server Action (`app/acerca-de/actions.ts`, con `'use server'`) que recibe nombre, correo y mensaje, y envía el correo con el SDK de Resend (`resend.emails.send`).
- Correo enviado `to: robertu131@gmail.com`, `from: onboarding@resend.dev` (remitente sandbox de Resend, ya que no hay dominio propio verificado todavía), `reply-to` con el correo escrito por el usuario en el formulario, y `subject`/cuerpo con el nombre y el mensaje recibidos.
- Nueva dependencia `resend` en `package.json`.
- Variable de entorno `RESEND_API_KEY`, leída en el Server Action con `process.env.RESEND_API_KEY`, documentada en un nuevo `.env.local.example` (sin valores reales — `.env*` ya está en `.gitignore`, así que la clave real nunca se commitea).
- Validación de formato de correo (regex simple, ej. `/^\S+@\S+\.\S+$/`) añadida a la validación de campos vacíos que ya existe en `app/acerca-de/page.tsx`, disparando el mismo `shake` si el formato es inválido.
- Nuevo estado de carga en el botón de envío ("ENVIANDO…", deshabilitado) mientras el Server Action está en curso.
- Nuevo estado de error visible en el formulario (mensaje de texto simple, sin rediseñar el formulario) cuando el Server Action falla o Resend responde con error; en ese caso **no** se muestra la terminal de "enviado". El usuario puede corregir y reintentar.
- La terminal de éxito (`terminal-success`) solo se muestra si el correo se envió correctamente de verdad.

**Explícitamente fuera de alcance (no en este spec):**

- Dominio propio verificado en Resend / remitente con dominio de Arcade Vault. Mientras no exista, se usa el sandbox `onboarding@resend.dev`. Cambiar el `from` cuando haya un dominio verificado es un ajuste de una línea, no un spec nuevo.
- Cualquier protección anti-spam (honeypot, rate limiting, captcha). Queda documentado como riesgo; se aborda en un spec aparte si se vuelve un problema real.
- Correo de autoconfirmación al usuario que escribió el mensaje (auto-reply). Solo se notifica a `robertu131@gmail.com`.
- Persistencia de los mensajes de contacto (no se guardan en ninguna base de datos ni archivo; si Resend los envía, quedan solo en la bandeja de entrada del destinatario).
- Cambios al resto del formulario, del diseño de `/acerca-de`, o a cualquier otra pantalla del sitio.
- Plantillas HTML de correo elaboradas: el cuerpo del correo es texto simple con nombre, correo y mensaje.

---

## Modelo de datos

No se introduce un modelo de datos persistente. La única "estructura" nueva es el payload que el Server Action arma para Resend, en memoria durante la request:

```ts
// app/acerca-de/actions.ts
type ContactPayload = {
  name: string;
  email: string;
  message: string;
};
```

No hay tabla, archivo ni `lib/data.ts` involucrado.

---

## Plan de implementación

1. **Instalar la dependencia.** Agregar `resend` a `package.json` (`npm install resend`). Verificación: `npm install` corre sin errores.
2. **Documentar la variable de entorno.** Crear `.env.local.example` con `RESEND_API_KEY=` (vacío) y un comentario indicando que se obtiene en resend.com/api-keys. Verificación: el archivo existe, no contiene ninguna clave real, y `.env.local` (con la clave real que el usuario agregue localmente) sigue ignorado por git.
3. **Server Action de envío.** Crear `app/acerca-de/actions.ts` con `'use server'` y una función `sendContactMessage(data: ContactPayload)` que valida servidor-side que los tres campos no estén vacíos y que el correo tenga formato válido (defensa en profundidad, aunque el cliente ya valida), instancia `new Resend(process.env.RESEND_API_KEY)` y llama a `resend.emails.send({...})`; retorna `{ ok: true }` o `{ ok: false, error: string }` sin lanzar excepciones no controladas. Verificación: se puede invocar manualmente (o desde el paso 4) y devuelve `{ ok: true }` con una `RESEND_API_KEY` válida real.
4. **Conectar el formulario.** En `app/acerca-de/page.tsx`, reemplazar el `onSubmit` simulado: agregar validación de formato de correo (regex) junto a la de vacíos, añadir estado `sending`/`error`, invocar `sendContactMessage` al enviar, mostrar "ENVIANDO…" mientras está en curso, mostrar el mensaje de error si `ok: false`, y solo mostrar la terminal de éxito (`setSent`) si `ok: true`. Verificación manual: con una `RESEND_API_KEY` real, enviar el formulario hace llegar un correo de verdad a `robertu131@gmail.com`; con la clave inválida o ausente, se muestra el error y no la terminal.
5. **Pulido y verificación final.** Confirmar que campo vacío o correo mal formado siguen disparando el shake sin llamar al Server Action (no se gasta cuota de Resend en validaciones que ya fallan en cliente); `npm run lint` limpio. Verificación: recorrido manual completo del formulario en los tres casos (vacío → shake, formato inválido → shake, válido → envío real).

---

## Criterios de aceptación

- [ ] `npm run dev` levanta la app sin errores y `npm run lint` pasa limpio.
- [ ] Enviar el formulario con campos vacíos dispara el shake y no llama al Server Action.
- [ ] Enviar el formulario con un correo mal formado (ej. `"abc"`) dispara el shake y no llama al Server Action.
- [ ] Enviar el formulario con datos válidos y una `RESEND_API_KEY` real hace llegar un correo a `robertu131@gmail.com` con el nombre, correo (como reply-to) y mensaje del usuario, y solo entonces se muestra la terminal de "enviado".
- [ ] Si el envío falla (clave inválida/ausente, o error de Resend), se muestra un mensaje de error en el formulario y no se muestra la terminal de éxito; el usuario puede reintentar sin recargar la página.
- [ ] Mientras el envío está en curso, el botón muestra "ENVIANDO…" y no se puede volver a enviar en paralelo.
- [ ] `RESEND_API_KEY` no está hardcodeada en ningún archivo versionado; `.env.local.example` documenta la variable sin valor real.

---

## Decisiones tomadas y descartadas

- **Server Action en vez de Route Handler (`app/api/.../route.ts`).** Motivo: el formulario ya es un `<form onSubmit>` de un client component sencillo; un Server Action evita crear una capa de API pública extra para un solo consumidor interno. Next 16 sigue soportando Route Handlers si en el futuro se necesita un endpoint público (ej. un webhook de Resend).
- **Remitente sandbox `onboarding@resend.dev`, no un dominio propio.** Motivo: no hay dominio verificado en Resend todavía; verificar uno es un trámite de DNS fuera del alcance de este spec. Cambiarlo después es una constante, no un rediseño.
- **Sin auto-reply al usuario.** Motivo: el copy actual del formulario ("RESPUESTA EN 24-48H") ya implica respuesta manual del equipo, no automática; agregar un segundo correo sería una feature nueva no pedida.
- **Sin protección anti-spam en este spec.** Motivo: es un MVP; agregar rate limiting o captcha antes de tener evidencia de abuso real sería trabajo especulativo. Se documenta como riesgo abajo.
- **Validación de formato de correo con una regex simple, no una librería de validación.** Motivo: es la única validación adicional que se necesita y ya hay un patrón de validación mínima (campos vacíos) en el mismo componente; agregar una dependencia de validación sería sobre-ingeniería para un caso de uso tan chico.
- **El Server Action también valida server-side (no solo el cliente).** Motivo: el cliente es un límite de confianza — cualquiera puede invocar el Server Action directamente con un POST, saltándose la UI. Duplicar la validación mínima en el servidor no es opcional aquí.

---

## Riesgos identificados

- **Formulario público sin protección anti-spam puede recibir mensajes automatizados que consuman la cuota gratuita de Resend o llenen la bandeja de `robertu131@gmail.com`.** Mitigación: aceptado como riesgo conocido de este MVP; si se vuelve un problema, un spec futuro puede agregar honeypot o rate limiting sin tocar el resto del flujo.
- **El sandbox `onboarding@resend.dev` de Resend puede tener restricciones de envío (ej. solo a la cuenta verificada) que cambien según la política de Resend.** Mitigación: si el envío falla por esta razón, el usuario lo ve como el error genérico de envío fallido definido en este spec; verificar el dominio propio en Resend resuelve esto de forma permanente en un ajuste futuro.
- **Si `RESEND_API_KEY` no está configurada en el entorno de despliegue, todo envío fallará silenciosamente para el visitante (verá el mensaje de error) sin que nadie del equipo se entere.** Mitigación: fuera de alcance un sistema de alertas; queda como responsabilidad operativa configurar la variable en cada entorno (local y producción) antes de considerar la feature "en vivo".
