@AGENTS.md

# Arcade Vault

Sitio de arcade retro-neón en Next.js (App Router) + Supabase. Todo el copy en español.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`): auth (correo, invitado anónimo, Google, GitHub) y tabla `scores`/`profiles` con RLS.
- Resend (`app/acerca-de/actions.ts`, Server Action) para el envío real del formulario de contacto.

## Rutas

- `/` — Home (landing).
- `/biblioteca` — catálogo de juegos (grid, buscador, chips de categoría), mock en `lib/data.ts`.
- `/juego/[id]` — detalle + panel de mejores puntuaciones.
- `/juego/[id]/jugar` — reproductor (`GamePlayer.tsx`): simulación visual del MVP para la mayoría de juegos, o motor real si `game.id` está en `REAL_GAMES`.
- `/salon` — Salón de la Fama (podio + tabla + tabs por juego).
- `/auth` — login / registro / invitado.
- `/acerca-de` — misión + formulario de contacto (envío real vía Resend).

## Juegos reales (`components/games/`)

Patrón fijado en SPEC 04 y repetido en SPEC 06 para portar un juego del catálogo mock a jugable de verdad:

- Motor: clase TS vanilla `components/games/<id>/<Id>Game.ts`, constructor `(canvas, callbacks: RealGameProps)`, loop propio por `requestAnimationFrame` con `dt` acotado, métodos `handleKeyDown/handleKeyUp/pause/resume/forceGameOver/destroy`, `onStateChange({score,lives,level})` deduplicado. Canvas fijo 800×600, sin HUD dibujado (el HUD es externo, en `GamePlayer`). Paleta neón: jugador/aliados cian (`--cyan`/`#00f5ff`), enemigos/pila magenta (`--magenta`/`#ff006e`).
- Wrapper `components/games/<id>/<Id>Canvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, listeners de teclado en `window` con `preventDefault` (guard `isTextInput`), `useImperativeHandle` exponiendo `pause/resume/forceGameOver`.
- Único punto de integración: una línea en `components/games/registry.ts` (`REAL_GAMES`).
- Implementados hoy: `asteroids` (SPEC 04) y `tetris` (SPEC 06, con la pieza extra "tuerca" del original). El resto del catálogo (`arkanoid`, `snake`, `pac-man`, `space-invaders`, `frogger`, `pong`) sigue con la simulación del MVP.
- `lib/scores.ts` (`getScores`/`saveScore`) y el esquema `scores`/`profiles` ya son genéricos por `game_id`: agregar un juego a `REAL_GAMES` alcanza para que el leaderboard real funcione en Detalle y Salón, sin tocar infraestructura. Índice compuesto `(game_id, score desc)` en `scores` desde SPEC 05.

## Método de trabajo: specs

El proyecto sigue un flujo spec-driven en `specs/` (`specs/.spec-config.yml` controla si `/spec-impl` crea la rama automáticamente). Historial en `specs/01-*.md` … `specs/06-*.md`: cada uno con `Estado`/`Depende de`/`Objetivo`, `## Alcance` (incluye / explícitamente fuera), `## Modelo de datos`, `## Plan de implementación`, `## Criterios de aceptación`, `## Decisiones tomadas y descartadas`.

Skill de este repo para generar specs nuevos de "juego real": `.claude/skills/juego-real/SKILL.md` — redacta (no implementa) un spec para portar `<game-id>` del catálogo a motor real + leaderboard, siguiendo el patrón de SPEC 04/05/06. Uso: `/juego-real <game-id>`, luego revisar/aprobar y correr `/spec-impl <NN>-<game-id>-juego-real`.

Agente `.claude/agents/game-planner.md` — evalúa (no implementa) si una idea de juego nueva encaja con el catálogo (categoría, paleta de color, diferenciación frente a los 8 juegos existentes) y emite un veredicto en el mismo formato `Sí/No/Motivo` de los specs. Su memoria entre invocaciones vive en `planner.md` (raíz del repo): cada evaluación queda anexada ahí para no repetir análisis ni contradecir un veredicto anterior sin justificarlo.

## Fuentes de referencia para portar juegos

`resources/started-games/` trae el `game.js` original de juegos aún no portados (ej. `03-tetris` → `tetris`, `04-arkanoid` → `arkanoid`). Al portar, se preserva la física/balance/puntuación original tal cual, solo se recolorea a la paleta neón.

## Fuera de alcance recurrente (declarado explícitamente en cada spec)

Sin audio, sin controles táctiles/móviles para los juegos reales, sin migrar el catálogo (`lib/data.ts`) a Supabase, sin deduplicar el ranking por jugador, sin ligar la sesión anónima de Supabase con `lib/session-context.tsx`.
