# 07 — Vado: alta al catálogo (MVP simulado)

**Estado:** Aprobado
**Depende de:** Ninguno (usa la simulación visual genérica ya existente de SPEC 01)
**Fecha:** 2026-09-20

**Objetivo:** Agregar "VADO" (PUZZLE, amarillo) al catálogo mock de `lib/data.ts` como un puzzle de planificación de cruces por turnos, jugable de inmediato con la simulación visual genérica del MVP.

---

## Alcance

**Incluye:**

- Una entrada nueva en `GAMES` (`lib/data.ts`): `id: "vado"`, `title: "VADO"`, categoría `PUZZLE`, color `yellow`, con `short`/`long` que describen la mecánica de planificación por turnos (sin nombrar carriles, autopistas, coches ni troncos — vocabulario reservado a Frogger).
- Una clase CSS de portada nueva, `.cover-vado`, en `app/globals.css`, siguiendo el patrón ya usado por `.cover-tetro`/`.cover-glot` (fondo con gradiente oscuro + elementos decorativos vía `::before`/`::after`): una grilla de baldosas tenue con acentos amarillos, evocando el tablero de planificación, sin imaginería de ruta/río.
- Con solo esos dos cambios, VADO aparece en `/biblioteca` (grid, buscador, chip de categoría PUZLE), tiene su propia página de detalle en `/juego/vado` (con `seededScores`, igual que los demás juegos aún no reales) y es jugable en `/juego/vado/jugar` a través de la simulación visual genérica ya existente (`game-arena`, HUD por `setInterval`), exactamente igual que `arkanoid`, `snake`, `pac-man`, `space-invaders`, `frogger` y `pong` hoy.

**Explícitamente fuera de alcance (no en este spec):**

- El motor real de planificación por turnos, su interfaz de cola de movimientos, el patrón de peligro cíclico y el leaderboard real: eso es SPEC 08, que depende de esta.
- Cualquier cambio a `components/games/registry.ts` o a `REAL_GAMES`: VADO no entra ahí en este spec.
- Cualquier cambio a otros juegos del catálogo, incluido Frogger.
- Sonido, controles táctiles/móviles.
- Migrar `GAMES` a Supabase.

---

## Modelo de datos

Este spec introduce una entrada nueva en la estructura `Game` ya existente (`lib/data.ts`), sin cambiar su forma:

```ts
// lib/data.ts — nueva entrada en GAMES
{
  id: "vado",
  title: "VADO",
  short: "Planifica tu cruce, paso a paso, antes de dar el primero.",
  long: "Un campo de baldosas de neón separa tu punto de partida de la meta, cruzado por franjas de peligro que laten en un ritmo fijo y visible. No hay reflejos que valgan: traza la ruta completa —cada salto, cada pausa— antes de mover una sola ficha. Ejecuta el plan y descubre si calculaste bien el ritmo del peligro.",
  cat: "PUZZLE",
  cover: "cover-vado",
  color: "yellow",
  best: 8600,
  plays: "1.8K",
},
```

`best`/`plays` son valores mock bajos, coherentes con un alta reciente al catálogo (mismo criterio que usaron entradas jóvenes como `pong` o `frogger`).

---

## Plan de implementación

1. **Portada.** Agregar la regla `.cover-vado` a `app/globals.css`, junto a las demás `.cover-*`: fondo oscuro con gradiente radial/lineal y un patrón de puntos/celdas en `var(--yellow)` vía `::after`/`::before`, sin imaginería de carretera/río. Verificación: no aplica todavía (sin entrada en `GAMES` que la use).
2. **Alta al catálogo.** Agregar la entrada `Game` de arriba a `GAMES` en `lib/data.ts`. Verificación: `/biblioteca` muestra la card VADO con el cover nuevo, el chip PUZLE la filtra correctamente y el buscador la encuentra por "vado"/"VADO".
3. **Confirmar el flujo genérico (sin cambios de código).** Navegar `/juego/vado` (detalle con `seededScores`, botón JUGAR) y `/juego/vado/jugar` (simulación `game-arena` genérica, HUD por `setInterval`, PAUSA/FIN/GUARDAR PUNTUACIÓN en modo simulado). Verificación: recorrido manual sin errores en consola; `npm run lint` limpio.

---

## Criterios de aceptación

- [ ] `GAMES` en `lib/data.ts` incluye la entrada `id: "vado"` con todos los campos de `Game` completos.
- [ ] `/biblioteca` muestra la card VADO, filtrable por el chip PUZLE y encontrable por el buscador.
- [ ] `.cover-vado` en `app/globals.css` renderiza una portada distinta a las 8 ya existentes, sin reutilizar imaginería de ruta/río de Frogger.
- [ ] `/juego/vado` muestra el detalle con `seededScores` (panel de mejores puntuaciones simulado).
- [ ] `/juego/vado/jugar` es jugable con la simulación visual genérica del MVP (mismo comportamiento que `arkanoid`/`pac-man`/etc.), sin entrada todavía en `REAL_GAMES`.
- [ ] `npm run dev` levanta sin errores y `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** nombre corto de una palabra, "VADO" (paso estrecho para cruzar un peligro), sin mencionar carriles, autopista, coches, troncos ni ranas. **No:** un nombre o copy que reutilice el vocabulario de Frogger. Motivo: restricción dura del encargo — debe leerse como puzzle de planificación, no como una skin de Frogger clásico.
- **Sí:** color `yellow`, único libre dentro de PUZLE (Tetris ya usa `magenta`). **No:** reusar magenta ni pedir un color fuera de la paleta de 4. Motivo: ángulo asignado explícito (PUZZLE/amarillo) y sin choque con el catálogo actual.
- **Sí:** cover propio con motivo de grilla/baldosas. **No:** reusar un cover existente o dejarlo sin decoración. Motivo: convención del repo — cada juego tiene su propia identidad visual en `GameCard`/`MiniGameCard`.
- **Sí:** separar alta al catálogo (esta spec) de motor real (SPEC 08), igual que el flujo general del repo separa "MVP simulado" de "juego real". **No:** implementar el motor ya en esta spec. Motivo: mantener cada spec en un solo objetivo verificable, y dejar que el motor real (más complejo) se diseñe con su propio contrato técnico en SPEC 08.

---

## Riesgos identificados

| Riesgo                                                                                                                                     | Mitigación                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un jugador puede percibir "cruzar un patrón de peligro hasta una meta" como una variante de Frogger solo por el tema "frogger" compartido. | Copy (`short`/`long`) y cover deliberadamente sin vocabulario ni imaginería de carretera/río; el spec de motor real (SPEC 08) refuerza la diferenciación con mecánica de planificación por turnos explícita en vez de cruce en tiempo real. |
