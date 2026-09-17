# 02 — Integración de Supabase (auth y puntuaciones)

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-09-14

**Objetivo:** Reemplazar la sesión en memoria y las puntuaciones simuladas del MVP por autenticación real (correo/contraseña, invitado anónimo, Google y GitHub) y persistencia real de puntuaciones, usando el proyecto de Supabase ya conectado (`jvymmtckgwfhbffzmljo`, actualmente sin tablas).

---

## Alcance

**Incluye:**

- Autenticación real con Supabase Auth: correo/contraseña (login y registro), invitado real vía `signInAnonymously`, y OAuth real con Google y GitHub.
- Persistencia real de puntuaciones en una tabla `scores`: el botón GUARDAR PUNTUACIÓN del reproductor inserta una fila real, solo disponible con sesión activa (cuenta, invitado real u OAuth).
- Perfil mínimo por usuario (tabla `profiles` con `username` único), creado automáticamente al registrarse por correo o al entrar por primera vez con OAuth. Los usuarios anónimos (invitado) no tienen fila en `profiles`.
- El Salón de la Fama (`/salon`) y el panel "MEJORES PUNTUACIONES" del Detalle (`/juego/[id]`) consultan la tabla `scores` real en vez de `seededScores`, con estado vacío explícito cuando un juego todavía no tiene puntuaciones.
- La fila "TU MEJOR MARCA" del Salón de la Fama consulta la mejor puntuación real del usuario logueado para ese juego, y solo aparece si existe.
- Creación de las apps OAuth necesarias en Google Cloud Console y GitHub Developer Settings, y su configuración en el dashboard de Supabase (Authentication > Providers).
- Habilitar el proveedor de inicio de sesión anónimo en el proyecto de Supabase.
- `middleware.ts` de Next.js para mantener la sesión de Supabase sincronizada entre servidor y cliente (cookies), reemplazando el `SessionProvider` en memoria de `lib/session-context.tsx`.
- Políticas de Row Level Security en `profiles` y `scores` que imponen a nivel de base de datos las reglas anteriores (lectura pública, escritura solo del propio usuario).

**Explícitamente fuera de alcance (no en este spec):**

- Realtime de Supabase (actualizar el Salón de la Fama en vivo sin recargar). El usuario ya lo mencionó como algo "a futuro"; queda para un spec aparte.
- Edge Functions. Mismo caso: spec aparte cuando haga falta.
- Mover el catálogo de juegos (`GAMES` en `lib/data.ts`) a una tabla de Supabase; se queda como mock/contenido fijo del sitio. Los campos `best` y `plays` de cada juego siguen siendo valores decorativos fijos, no se recalculan desde `scores`.
- Deduplicar el ranking por usuario (mostrar solo la mejor puntuación de cada jugador). El Salón y el Detalle muestran filas de `scores` ordenadas por puntuación tal cual, igual de simple que hoy con `seededScores`.
- Recuperación de contraseña, verificación de correo obligatoria, o cualquier flujo de cuenta más allá de registro/login/logout.
- Edición de perfil (cambiar username, avatar, borrar cuenta).
- Validación de formularios más allá de la que ya provee Supabase Auth (campos vacíos, formato de contraseña, etc.).

---

## Modelo de datos

```sql
-- profiles: un perfil por usuario con cuenta real (no aplica a invitados anónimos)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

-- scores: una fila por partida guardada
create table scores (
  id bigint generated always as identity primary key,
  game_id text not null,        -- coincide con Game.id de lib/data.ts; sin FK porque el catálogo no vive en la base de datos
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,    -- iniciales tecleadas en el modal de fin de juego, no necesariamente el username del perfil
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
```

Trigger `handle_new_user` (`after insert on auth.users`):

- Si `NEW.is_anonymous` es `false` y viene de registro por correo, inserta en `profiles` usando `NEW.raw_user_meta_data->>'username'` (pasado por el cliente en `signUp({ options: { data: { username } } })`).
- Si viene de OAuth (sin username propio), genera uno con `split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)` — el sufijo del id hace la colisión con otro username prácticamente imposible sin necesitar reintentos.
- Si `NEW.is_anonymous` es `true`, no inserta fila en `profiles`. La UI trata cualquier sesión anónima como `"INVITADO"`, igual que hoy en `lib/session-context.tsx`.

Row Level Security:

- `profiles`: `select` público (`using (true)`, necesario para mostrar nombres en el leaderboard); `insert`/`update` solo de la propia fila (`auth.uid() = id`).
- `scores`: `select` público (`using (true)`); `insert` solo si `auth.uid() = user_id` (impone "requiere sesión activa" también a nivel de base de datos, no solo en la UI); sin políticas de `update`/`delete` — las puntuaciones son inmutables una vez guardadas.

---

## Plan de implementación

1. **Clientes de Supabase y variables de entorno.** Instalar `@supabase/supabase-js` y `@supabase/ssr`. Crear `lib/supabase/client.ts` (cliente de navegador) y `lib/supabase/server.ts` (cliente de servidor con cookies de `next/headers`). Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.local` (gitignored) con los valores del proyecto ya conectado. Verificación: `npm run dev` sigue funcionando exactamente igual que antes (nada usa Supabase todavía), sin errores en consola.
2. **Esquema de base de datos.** Aplicar la migración con el esquema de `profiles` y `scores`, el trigger `handle_new_user` y las políticas RLS descritas arriba. Verificación: `mcp__supabase__list_tables` muestra `profiles` y `scores`; `mcp__supabase__get_advisors` no reporta alertas de seguridad críticas (RLS habilitado en ambas tablas).


---

## Criterios de aceptación

- [ ] `npm run dev` levanta la app sin errores y `npm run lint` pasa limpio.
- [ ] `profiles` y `scores` existen en el proyecto de Supabase con RLS habilitado y las políticas descritas en el modelo de datos.
---

## Decisiones tomadas y descartadas

- **Sí:** el catálogo de juegos (`GAMES`) se queda en `lib/data.ts`. **No:** moverlo a una tabla de Supabase. Motivo: es contenido fijo del sitio, no datos de usuario; menos migración y menos riesgo.
- **Sí:** agregar un campo de correo al formulario de "iniciar sesión". **No:** buscar el correo a partir del username antes de autenticar. Motivo: Supabase Auth con correo/contraseña necesita el correo directamente; buscarlo primero añade una consulta extra y un punto de fallo.
- **Sí:** crear las apps OAuth de Google y GitHub como parte de este spec. Motivo: los botones ya existen en la UI del MVP como decorativos; el usuario los quiere funcionales ahora, no en un spec futuro.
- **Sí:** invitado = `signInAnonymously` real de Supabase. **No:** mantenerlo como estado en memoria. Motivo: así puede guardar puntuaciones reales cumpliendo la regla de "requiere sesión activa" sin forzar un registro.
- **Sí:** guardar una puntuación requiere sesión activa, impuesto también por RLS (`auth.uid() = user_id`), no solo validado en el cliente. Motivo: defensa en profundidad; un cliente modificado no puede insertar puntuaciones a nombre de otro usuario.
- **Sí:** estado vacío explícito en Salón/Detalle cuando no hay puntuaciones reales. **No:** rellenar con `seededScores` mientras no hay datos reales. Motivo: mezclar datos falsos con reales contradice el objetivo de este spec y confundiría qué es real.
- **Sí:** `username` único en `profiles`. Motivo: evita nombres duplicados confusos en el Salón de la Fama.
- **Sí:** `scores.player_name` guarda tal cual lo tecleado en el modal de fin de juego, no el `username` del perfil. Motivo: preserva el comportamiento arcade actual de "iniciales editables por partida" sin forzar un join a `profiles` para pintar el leaderboard.
- **No:** crear fila en `profiles` para usuarios anónimos. Motivo: evita colisiones de unicidad de username y no aporta nada que la UI no resuelva ya mostrando "INVITADO" fijo.
- **Fuera de este spec:** Realtime y Edge Functions. Motivo: mencionados por el usuario como trabajo "a futuro"; cada uno es suficientemente grande para su propio spec.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configurar OAuth (Google Cloud Console, GitHub Developer Settings, dashboard de Supabase) requiere pasos manuales fuera del código que las herramientas de este entorno no pueden automatizar. | Documentado como paso explícito del plan (paso 4); se verifica manualmente antes de dar el spec por terminado.                                                                                                                                                            |
| Habilitar el inicio de sesión anónimo es una opción de proyecto en el dashboard de Supabase, no una migración SQL.                                                                             | Paso explícito del plan (paso 3) con verificación manual de que el proveedor está activo.                                                                                                                                                                                 |
| El `middleware.ts` de sincronización de sesión es nuevo en este proyecto; una configuración incorrecta puede dejar la sesión desincronizada entre servidor y cliente.                          | Seguir la guía oficial de `@supabase/ssr` para Next.js App Router antes de escribir el archivo (consultar `node_modules/next/dist/docs/` para la API de middleware de esta versión de Next.js, según `AGENTS.md`); verificación manual de recarga de página en el paso 3. |
