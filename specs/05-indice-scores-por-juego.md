# 05 — Índice de rendimiento para el top por juego

**Estado:** Implementado
**Depende de:** SPEC 02 (esquema `scores`), SPEC 04 (Asteroids real, `lib/scores.ts`)
**Fecha:** 2026-09-17

**Objetivo:** Agregar un índice compuesto a la tabla `scores` para que la consulta de "top por juego" (ya genérica y funcional para los 8 `game_id` del catálogo desde SPEC 02/04) siga siendo rápida al crecer, sin tocar código de aplicación.

---

## Alcance

**Incluye:**

- Migración SQL nueva en Supabase: índice compuesto `(game_id, score desc)` sobre `public.scores`, que es exactamente la forma de la consulta que ya usa `lib/scores.ts::getScores` (`.eq("game_id", ...).order("score", { ascending: false }).limit(...)`).
- Confirmación explícita (sin cambios de código) de que el esquema actual de `scores` — `game_id text not null`, sin FK ni `check` de valores permitidos — ya acepta cualquiera de los 8 `id` definidos en `lib/data.ts` (`arkanoid`, `tetris`, `snake`, `pac-man`, `space-invaders`, `asteroids`, `frogger`, `pong`), no solo `asteroids`.
- Verificación con `explain` de que la consulta de `getScores` usa el índice nuevo (`Index Scan`) en vez de recorrer toda la tabla (`Seq Scan`).
- Prueba de inserción/lectura con un `game_id` distinto de `asteroids` para confirmar en la práctica que el mismo `lib/scores.ts` ya funciona para cualquier juego del catálogo.

**Explícitamente fuera de alcance (no en este spec):**

- Una tabla física por juego (`scores_asteroids`, `scores_tetris`, etc.). Se descarta a favor de la tabla `scores` compartida ya existente: mismo resultado funcional (un top independiente por juego), sin duplicar esquema ni políticas RLS 8 veces.
- Conectar guardado/lectura real (`REAL_GAMES`, `saveScore`/`getScores` en el reproductor) para los 7 juegos que hoy usan la partida simulada (`GamePlayer.tsx`). Solo `asteroids` tiene motor real; los demás siguen fuera de alcance hasta que cada uno tenga su propio spec de "juego real", igual que SPEC 04 lo dejó explícito.
- Reemplazar `TOP_PLAYERS_TODAY` (el "TOP JUGADORES · HOY" hardcodeado en `app/page.tsx`) por una consulta real. Queda pendiente como trabajo futuro, fuera de este spec.
- Cambios a las políticas de Row Level Security de `scores` (select público; insert solo si `auth.uid() = user_id`) — siguen exactamente igual.
- Deduplicar el ranking por jugador, paginación, o cualquier otra optimización de lectura más allá del índice.
- Migrar o transformar datos existentes: la fila de Asteroids ya guardada en `scores` se conserva tal cual.

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `public.scores` ya existe con este esquema (SPEC 02, sin cambios):

```sql
-- ya existe, sin cambios de columnas:
create table scores (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
-- RLS: select público; insert solo si auth.uid() = user_id
```

Único cambio de este spec, una migración nueva:

```sql
create index if not exists scores_game_id_score_idx
  on public.scores (game_id, score desc);
```

Este índice calza exactamente con la consulta que ya hace `lib/scores.ts::getScores(gameId, limit)` para cualquiera de los 8 `game_id` del catálogo — no requiere ningún cambio en `lib/scores.ts`, `app/juego/[id]/page.tsx` ni `app/salon/page.tsx`.

---

## Plan de implementación

1. **Crear y aplicar el índice.** Migración `scores_game_id_score_idx`: índice compuesto `(game_id, score desc)` en `public.scores`. Verificación: `mcp__supabase__list_migrations` muestra la nueva migración aplicada; `select count(*) from scores` sigue devolviendo la(s) fila(s) ya existente(s) (no se truncó la tabla); una consulta a `pg_indexes` (`select indexname from pg_indexes where tablename = 'scores'`) muestra `scores_game_id_score_idx`. Nota: con tan pocas filas en la tabla, `explain` sobre la consulta de `getScores` puede seguir mostrando `Seq Scan` — es la elección correcta y esperada del planner de Postgres para tablas minúsculas, no una señal de que el índice esté mal creado.
2. **Confirmar que los 8 juegos ya funcionan sin cambios de código.** Insertar con `mcp__supabase__execute_sql` una fila de prueba con `game_id = 'tetris'` (o cualquier id distinto de `asteroids`) y un `user_id` válido; llamar `getScores('tetris', 10)` desde la consola del navegador (o una prueba manual equivalente) y confirmar que la fila aparece ordenada correctamente; luego borrar esa fila de prueba. Verificación: la fila aparece y desaparece según lo esperado; ningún archivo en `lib/`, `app/` o `components/` cambió durante este paso.

---

## Criterios de aceptación

- [x] Existe un índice compuesto `(game_id, score desc)` en `public.scores`, aplicado como migración de Supabase.
- [x] El índice `scores_game_id_score_idx` aparece en `pg_indexes` para la tabla `scores`. (Con el volumen de datos actual, `explain` puede seguir mostrando `Seq Scan` — comportamiento esperado del planner en tablas pequeñas, no una falla.)
- [x] La(s) fila(s) ya existente(s) en `scores` (incluida la de Asteroids) se conservan intactas.
- [x] Una inserción de prueba con `game_id` distinto de `asteroids` se guarda y se puede leer con `getScores`, confirmando que el esquema ya es genérico para los 8 juegos del catálogo sin cambios de código.
- [x] Ningún archivo de `lib/`, `app/` o `components/` cambió como parte de este spec.
- [x] Las políticas RLS de `scores` (select público; insert solo si `auth.uid() = user_id`) siguen exactamente igual que antes de este spec.

---

## Decisiones tomadas y descartadas

- **Sí:** una sola tabla `scores` compartida, filtrada por `game_id`, con un índice nuevo para rendimiento. **No:** una tabla física por juego. Motivo: la tabla compartida ya da un top independiente por juego (es lo que usa Asteroids hoy); una tabla por juego duplicaría esquema y políticas RLS 8 veces sin ninguna ventaja funcional.
- **Sí:** preparar solo la estructura de datos (índice) para que los 8 juegos del catálogo puedan usar `scores` sin cambios futuros de esquema. **No:** conectar guardado/lectura real en los 7 juegos que hoy usan la partida simulada. Motivo: esos 7 no tienen motor real todavía (explícitamente fuera de alcance también en SPEC 04); conectarlos ahora persistiría puntajes falsos generados por un `setInterval`, no partidas reales.
- **Sí:** conservar la fila existente de Asteroids en `scores`. **No:** truncar o recrear la tabla. Motivo: es una puntuación real ya jugada; no hay razón para descartarla.
- **Fuera de este spec:** reemplazar `TOP_PLAYERS_TODAY` (top hardcodeado del home) por una consulta real. Motivo: decidido explícitamente para no mezclar dos objetivos distintos en un spec enfocado solo en la estructura de datos por juego.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                         | Mitigación                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Con solo 1 fila real hoy (Asteroids), el índice nuevo no tiene volumen de datos para "demostrarse" por sí solo — es fácil dar el spec por probado sin verificar el comportamiento genérico con otro `game_id`. | El paso 2 del plan inserta y borra explícitamente una fila de prueba con un `game_id` distinto de `asteroids` antes de cerrar el spec.             |
| Los 7 juegos sin motor real seguirán mostrando `seededScores` (datos falsos) en Detalle y Salón; alguien podría interpretar este spec como "ya todos los juegos tienen top real", lo cual no es cierto.        | Documentado explícitamente en Alcance y en Criterios de aceptación: solo se prepara la estructura, no se conecta guardado real para esos 7 juegos. |
