# 06 — Tetris: juego real jugable

**Estado:** Implementado
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real: `REAL_GAMES`, `RealGameProps/Handle`, `GamePlayer`, `lib/scores.ts`), SPEC 05 (índice y confirmación de que `scores`/`getScores` ya son genéricos para cualquier `game_id`)
**Fecha:** 2026-09-17

**Objetivo:** Portar el clon de Tetris de `resources/started-games/03-tetris/game.js` a un motor real y jugable en `/juego/tetris/jugar`, reemplazando ahí la simulación visual del MVP, siguiendo exactamente el mismo patrón que Asteroids (motor TS + wrapper React + una línea en `REAL_GAMES`), sin tocar la infraestructura de leaderboard ya genérica.

---

## Alcance

**Incluye:**

- Motor del juego portado a TypeScript en `components/games/tetris/TetrisGame.ts`, con la misma física, balance y puntuación del original: tablero 10×20, las 8 piezas del original (las 7 estándar `I O T S Z J L` **más** la pieza extra "tuerca" `N`, un anillo 3×3, que el original incluye vía `randomPiece` sobre `1..8`), rotación horaria con wall kicks `[0, -1, 1, -2, 2]`, gravedad por `dropInterval = max(100, 1000 - (level-1) * 90)` ms, `soft drop` (+1 por fila), `hard drop` (+2 por celda), limpieza de líneas con `LINE_SCORES = [0, 100, 300, 500, 800]` multiplicado por el nivel, `nivel = floor(líneas / 10) + 1`, pieza fantasma (proyección al fondo), preview de la pieza siguiente, y fin de partida cuando una pieza recién generada colisiona al aparecer.
- Recoloreado a la paleta neón del sitio: la pieza activa que cae (la que controla el jugador), su fantasma y el preview de la pieza siguiente en cian (`#00f5ff`, `var(--cyan)`); los bloques ya fijados en el fondo (la pila que amenaza con toparte) en magenta (`#ff006e`, `var(--magenta)`). Fondo negro del canvas y rejilla tenue, sin cambios de mecánica.
- Motor con el mismo contrato técnico que `AsteroidsGame.ts`: clase con `constructor(canvas, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado; `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió).
- **Un solo `<canvas width={800} height={600}>`** que dibuja internamente las dos regiones del original (tablero 300×600 + panel de "SIGUIENTE" de la pieza próxima), porque `RealGameProps`/`RealGameHandle`/`REAL_GAMES` soportan un único componente por juego y esa interfaz compartida no se toca. El canvas no dibuja el HUD de texto (PUNTUACIÓN/NIVEL): eso se expone por callback y lo muestra el HUD externo de `GamePlayer`.
- Wrapper de React `components/games/tetris/TetrisCanvas.tsx` (`"use client"`, `forwardRef<RealGameHandle, RealGameProps>`), copiando el patrón de `AsteroidsCanvas.tsx`: callbacks guardados en refs para montar el motor con `useEffect` de deps vacías, listeners `window` de `keydown`/`keyup` con `preventDefault` en las teclas de control (con guard `isTextInput` para no romper el input de iniciales), cleanup que quita listeners y llama `destroy()`, y `useImperativeHandle` exponiendo `pause`/`resume`/`forceGameOver`.
- Registro: una línea nueva en `components/games/registry.ts` → `tetris: TetrisCanvas`. Es el único punto de integración.

**Explícitamente fuera de alcance (no en este spec):**

- Cualquier cambio a la infraestructura genérica ya existente, que **no se toca**: `lib/scores.ts` (`getScores`/`saveScore`), `lib/supabase/client.ts`, `components/GamePlayer.tsx`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx`, el esquema `scores`/`profiles`, sus políticas RLS, y el índice `(game_id, score desc)`. Ya son genéricos por `game.id` desde SPEC 04/05: al agregar `tetris` a `REAL_GAMES`, el detalle y el Salón leen su leaderboard real automáticamente, y el reproductor guarda con `saveScore("tetris", …)` sin cambios.
- Sonido / efectos de audio (el original tampoco tiene).
- Controles táctiles / móviles: se juega solo con teclado, igual que el original; en móvil `/juego/tetris/jugar` no es jugable.
- Cambiar el balance o las reglas del original (velocidades, tabla de puntuación, wall kicks, la pieza extra "tuerca", curva de nivel): se preserva tal cual.
- El toggle de tema claro/oscuro y el botón "reiniciar" del `index.html` original: reiniciar ya lo maneja el flujo de `GamePlayer` (modal de fin de juego); el tema lo maneja el sitio.
- Migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sigue siendo contenido fijo.
- Deduplicar el ranking de `scores` por jugador.
- Vincular la sesión anónima de Supabase con el `SessionProvider` en memoria (dos sistemas de sesión separados, igual que en SPEC 04).
- Convertir cualquiera de los otros juegos aún simulados en jugable real.

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `public.scores` ya existe (SPEC 02) y su esquema es genérico para cualquier `game_id`, confirmado por SPEC 05:

```sql
-- ya existe, sin cambios:
create table scores (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
-- RLS: select público; insert solo si auth.uid() = user_id
-- índice scores_game_id_score_idx (game_id, score desc) — SPEC 05
```

El estado interno del motor (no persistido) sigue el modelo del original:

```ts
// components/games/tetris/TetrisGame.ts (interno, no exportado)
// board: number[][]  — 20 filas × 10 columnas; 0 = vacío, 1..8 = índice de pieza
// current / next: { type: number; shape: number[][]; x: number; y: number }
// score, lines, level, dropInterval (ms), dropAccum (ms)
```

`tetris` reutiliza la interfaz compartida de SPEC 04 sin cambios. `RealGameState` no tiene un campo de "líneas": las líneas siguen siendo un valor interno que alimenta `score` y `level`, pero no se muestran en el HUD externo. El campo `lives` se reporta fijo en `1` (Tetris es una sola partida; el fin llega cuando la pila topa arriba), para no modificar `RealGameState`.

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Motor de Tetris portado.** Crear `components/games/tetris/TetrisGame.ts` con toda la lógica de `resources/started-games/03-tetris/game.js` (`createBoard`, `randomPiece` sobre `1..8` incluyendo la pieza "tuerca", `collide`, `rotateCW` + `tryRotate` con los mismos kicks, `merge`, `clearLines`, `ghostY`, `softDrop`, `hardDrop`, `lockPiece`, `spawn`), recibiendo el canvas por parámetro (sin `document.getElementById`), sin dibujar HUD de texto, y recoloreada (pieza activa/fantasma/preview en cian; pila fijada en magenta). Dibuja en un solo canvas 800×600 las regiones de tablero y "SIGUIENTE". Loop propio con `dt` en ms acotado (p. ej. `Math.min(ts - last, 100)`) acumulado en `dropAccum` contra `dropInterval`. Expone `onStateChange({score, lives: 1, level})` deduplicado y `onGameOver(score)` una sola vez cuando `spawn` colisiona o al llamar `forceGameOver`. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/tetris/TetrisCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado con `preventDefault` sobre el set de control (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`) y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, y `useImperativeHandle` con `pause`/`resume`/`forceGameOver`. Mapear teclas como el original: izquierda/derecha mueven, `ArrowDown` es soft drop, `ArrowUp`/`KeyX` rotan, `Space` es hard drop; la PAUSA la controla el botón de `GamePlayer` (`pause()/resume()`), no una tecla. Agregar `tetris: TetrisCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/tetris/jugar` es Tetris real y jugable con teclado; el HUD externo (Puntuación/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; los demás juegos siguen idénticos.
3. **Verificar leaderboard real (sin cambios de código).** Jugar una partida de Tetris hasta el fin y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'tetris'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/tetris` y la pestaña TETRIS de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), y que la fila "TU MEJOR MARCA" no aparece para `tetris` (comportamiento genérico ya existente cuando `hasRealScores`). Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [x] `/juego/tetris/jugar` es Tetris real y jugable con teclado: mover izquierda/derecha, rotar (`ArrowUp`/`KeyX`), soft drop (`ArrowDown`), hard drop (`Space`), con gravedad que acelera por nivel.
- [x] Las 8 piezas del original aparecen (las 7 estándar más la pieza "tuerca" `N` en anillo 3×3), con la misma rotación, wall kicks y curva de velocidad `max(100, 1000 - (level-1)*90)` ms.
- [x] La puntuación coincide con el original: `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel, +2 por celda en hard drop, +1 por fila en soft drop; `nivel = floor(líneas / 10) + 1`.
- [x] La pieza activa, su fantasma y el preview "SIGUIENTE" se ven en cian; los bloques ya fijados en el fondo, en magenta.
- [x] Todo se dibuja en un único `<canvas width={800} height={600}>` (tablero + panel de siguiente pieza); el canvas no dibuja el texto de PUNTUACIÓN/NIVEL.
- [x] El HUD externo del reproductor refleja el estado real (Puntuación y Nivel); "Vidas" se muestra como 1 (partida única).
- [x] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [x] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'tetris'`, verificable con una consulta directa a la tabla.
- [x] `/juego/tetris` y la pestaña TETRIS de `/salon` muestran el leaderboard real de `tetris` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [x] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores`.
- [x] Las flechas y la barra espaciadora no hacen scroll de la página mientras se juega Tetris.
- [x] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [x] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** portar el `game.js` existente conservando su física, balance y puntuación tal cual. **No:** rediseñar las reglas de Tetris desde cero. Motivo: hay una fuente real en `resources/started-games/03-tetris/`; portar preserva el balance ya jugado, igual que hizo SPEC 04 con Asteroids.
- **Sí:** preservar la pieza extra "tuerca" (`N`, anillo 3×3) que el original incluye vía `randomPiece` sobre `1..8`. **No:** recortar a las 7 piezas clásicas. Motivo: es parte del balance del juego original; quitarla sería rebalancear, explícitamente fuera de alcance.
- **Sí:** dibujar tablero (300×600) y panel de "SIGUIENTE" en un solo `<canvas width={800} height={600}>`. **No:** dos canvas separados como el `index.html` original. Motivo: `RealGameProps`/`RealGameHandle`/`REAL_GAMES` soportan un único componente por juego y esa interfaz compartida (usada por Asteroids y `GamePlayer`) no se toca; el canvas único cabe holgado en 800×600.
- **Sí:** recolorear la pieza activa/fantasma/preview a cian y la pila fijada a magenta. **No:** conservar los 8 colores originales por pieza. Motivo: pedido de coherencia con la paleta neón del sitio (mismo criterio que Asteroids); el color en Tetris es cosmético, no cambia mecánica, así que no altera el balance. El mapeo cian=lo que controlas / magenta=la pila que te amenaza refuerza la lectura del peligro.
- **Sí:** reportar `lives: 1` fijo y dejar "líneas" como valor interno que alimenta score y nivel. **No:** cambiar `RealGameState` para añadir un campo de líneas o de "sin vidas". Motivo: la interfaz compartida de SPEC 04 no se toca; Tetris no tiene vidas y las líneas ya se reflejan indirectamente en score/nivel.
- **Sí:** la PAUSA la controla el botón de `GamePlayer` (`pause()/resume()`), no la tecla `P` del original. **No:** reimplementar `KeyP` dentro del motor. Motivo: el patrón de SPEC 04 ya centraliza PAUSA/FIN en el HUD externo para todos los juegos reales.
- **Sí:** una sola línea nueva en `REAL_GAMES` como único punto de integración. **No:** tocar `GamePlayer`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx` ni `lib/scores.ts`. Motivo: SPEC 04/05 dejaron esa infraestructura genérica por `game.id`; agregar `tetris` al mapa basta para que el guardado y ambos leaderboards funcionen.
- **Sí:** solo teclado, sin controles táctiles. **No:** botones en pantalla para móvil. Motivo: el original tampoco los tiene y no fue pedido; queda documentado como riesgo conocido.

---

## Riesgos identificados

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recolorear cada `draw` portado del original puede dejar colado un color viejo (los 8 `COLORS` originales) en algún elemento.                                        | Revisión visual manual en el paso 1 de cada elemento (pieza activa, fantasma, pila fijada, preview) antes de conectar el HUD en el paso 2.                                                                |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners si el cleanup no cancela todo. | Copiar el patrón ya probado de `AsteroidsCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 2. |
| El original avanza la gravedad por `dt` en ms; tras perder foco de la pestaña o al reanudar, un `dt` enorme podría precipitar varias caídas de golpe.               | Acotar `dt` en el loop (`Math.min(ts - last, 100)`) y resetear el reloj en `resume()` (`lastTime = null`), igual que hace `AsteroidsGame`.                                                                |
| En móvil `/juego/tetris/jugar` no es jugable (solo teclado).                                                                                                         | Aceptado y documentado como fuera de alcance, igual que en SPEC 04.                                                                                                                                       |
