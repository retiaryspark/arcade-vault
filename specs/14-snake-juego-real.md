# 14 — Snake: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real), SPEC 05 (índice/confirmación de `scores` genérico por `game_id`)
**Fecha:** 2026-09-25
**Objetivo:** Diseñar e implementar el motor real de Snake (sin fuente original en `resources/started-games/`) con leaderboard en Supabase, siguiendo exactamente el mismo patrón técnico que Asteroids y Tetris, e incorporando desde el día uno soporte de skins (`setSkin`/`PALETTES`).

---

## Alcance

**Incluye:**

- Motor nuevo en `components/games/snake/SnakeGame.ts`, clon de Snake diseñado desde cero (no hay `game.js` de referencia para este género en `resources/started-games/`), con las siguientes mecánicas concretas:
  - Grid interno de `40×30` celdas de `20×20` px, que encaja exacto en el canvas `800×600` sin resto ni márgenes muertos.
  - La serpiente arranca con 3 segmentos, centrada en el grid, moviéndose hacia la derecha.
  - Movimiento discreto por celda, gobernado por un acumulador de tiempo por tick (no por frame de `requestAnimationFrame`), para que la velocidad sea independiente del framerate: `tickAcc += dt; while (tickAcc >= tickInterval) { tickAcc -= tickInterval; step(); }`.
  - Las 4 flechas cambian la dirección; se ignora cualquier input que intente invertir 180° la dirección actual en el mismo tick (regla estándar de Snake: no se puede "girar sobre uno mismo" instantáneamente).
  - Un núcleo (comida) aparece en una celda libre aleatoria (no ocupada por el cuerpo). Comerlo hace crecer la serpiente un segmento, suma `+10` puntos y hace aparecer un núcleo nuevo en otra celda libre.
  - Velocidad progresiva: `tickInterval` arranca en `140ms` y baja `8ms` cada 5 núcleos comidos, con un piso de `60ms` (para que el juego siga siendo jugable en partidas largas).
  - `level` sube 1:1 en cada uno de esos mismos saltos de velocidad (`level = 1 + floor(núcleosComidos / 5)`), reutilizando el campo `level` ya genérico de `RealGameState` sin inventar uno nuevo.
  - Fin de partida: choque contra el borde del canvas **o** contra el propio cuerpo, ambos terminan la partida al instante (sin vidas múltiples, sin respawn) — fiel al Snake clásico. `RealGameState.lives` arranca en `1` y pasa a `0` en el choque, reutilizando el campo genérico sin agregar un concepto nuevo de "vidas".
  - El chequeo de colisión contra el cuerpo excluye la celda de la cola que se libera ese mismo tick cuando la serpiente no va a crecer (regla clásica de Snake: si no comió, la cola se mueve y esa celda queda libre para la cabeza en el mismo movimiento).
- Mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`: `constructor(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt` **y** el acumulador de tick, para no arrastrar tiempo pausado como un salto de varios pasos de golpe), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`). Loop propio con `dt` acotado (`Math.min((ts - last) / 1000, 0.05)`). `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió). Canvas fijo `800×600`, sin HUD de texto dibujado — el HUD sigue siendo 100% externo en `GamePlayer`.
- **Soporte de skins obligatorio** (a diferencia de Tetris y Arkanoid, que lo dejaron pendiente): `SnakeGame.ts` implementa un mapa `PALETTES: Record<GameSkin, Palette>` interno y `setSkin(skin: GameSkin)`, igual que `AsteroidsGame.ts` (constructor: `this.palette = PALETTES[callbacks.skin ?? "clasico"]`; método: `setSkin(skin) { this.palette = PALETTES[skin]; }`). `Palette` define al menos `primary` (cuerpo/cabeza de la serpiente) y `secondary` (núcleo). El selector de skins en `GamePlayer` (`SKINS`, ya genérico y ya renderizado para cualquier `REAL_GAMES[game.id]`) pasa la prop `skin` sin cambios; hoy solo Asteroids la honra de verdad, Snake será el segundo.
- Paleta `"clasico"`: cuerpo de la serpiente en cian (`#00f5ff` / `var(--cyan)`), núcleo en magenta (`#ff006e` / `var(--magenta)`) — coincide con el copy ya existente en `lib/data.ts` ("Una serpiente de luz recorre la grilla buscando núcleos magenta"). Paletas `"neon"` y `"retro"` con combinaciones alternativas análogas a las ya definidas en `AsteroidsGame.ts` (ej. `neon`: cuerpo `#39ff14` / núcleo `#faff00`; `retro`: cuerpo y núcleo en ámbar `#ffb000`).
- Wrapper `components/games/snake/SnakeCanvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs, listeners de teclado en `window` (las 4 flechas) con `preventDefault` (guard `isTextInput`), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`, y un segundo `useEffect([skin])` que llama `gameRef.current?.setSkin(skin ?? "clasico")` — mismo patrón que `AsteroidsCanvas.tsx`.
- Registro: una sola línea nueva en `components/games/registry.ts` → `snake: SnakeCanvas` (más el import correspondiente).
- Al agregar `snake` a `REAL_GAMES`, `/juego/snake` (Detalle) y la pestaña SNAKE de `/salon` leen su leaderboard real automáticamente vía `lib/scores.ts` (`getScores`/`saveScore`), sin tocar esa infraestructura genérica.

**Explícitamente fuera de alcance (no en este spec):**

- Sin audio; sin controles táctiles/móviles para los juegos reales; sin migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sin deduplicar el ranking de `scores` por jugador; sin vincular la sesión anónima de Supabase con `lib/session-context.tsx`; no tocar `lib/scores.ts`/`lib/supabase/client.ts`/`components/GamePlayer.tsx`/`app/juego/[id]/page.tsx`/`app/salon/page.tsx`/esquema `scores`/`profiles`/RLS/índice compuesto; no convertir ningún otro juego del catálogo en real.
- Wrap-around toroidal en los bordes del canvas (como sí tiene Asteroids): en Snake, tocar el borde termina la partida, no envuelve al otro lado.
- Vidas múltiples con respawn: Snake usa 1 vida (choque = fin inmediato), fiel al género; no se agrega un sistema de reaparición ni de invencibilidad temporal.
- Obstáculos adicionales, power-ups, múltiples núcleos simultáneos, modos de dificultad seleccionables o cualquier otra mecánica no descrita explícitamente arriba.
- Control por mouse o touch: solo las 4 flechas de teclado.
- Cambiar la puntuación/velocidad ya definidas en este spec una vez implementado, sin pasar por un spec/decisión nueva.
- Migrar el campo decorativo `best`/`plays` del catálogo (`lib/data.ts`) a datos reales: siguen siendo contenido mock del catálogo, sin relación con la tabla `scores`.

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `public.scores` ya existe (SPEC 02) y es genérico por `game_id` (confirmado por SPEC 05):

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

Estado interno del motor (no persistido), solo en memoria del navegador durante la partida:

```ts
// components/games/snake/SnakeGame.ts (interno, no exportado)
// grid: 40 cols × 30 rows, cellSize = 20 (encaja exacto en 800×600)
// snake: { x: number; y: number }[]  — índice 0 = cabeza
// direction / nextDirection: { x: -1|0|1; y: -1|0|1 }
// nucleo: { x: number; y: number }
// tickInterval: number   — arranca en 140, baja 8 cada 5 núcleos, piso 60
// tickAcc: number        — acumulador de tiempo (se resetea en resume())
// score, lives (arranca en 1, pasa a 0 al chocar), level (1 + floor(núcleosComidos/5))
// palette: Palette       — PALETTES[skin], con setSkin(skin) para cambiarla en caliente
```

`snake` reutiliza la interfaz compartida de SPEC 04 sin cambios:

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  snake: SnakeCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Motor de Snake diseñado desde cero.** Crear `components/games/snake/SnakeGame.ts`: grid `40×30`/`20px`, serpiente inicial de 3 segmentos, movimiento discreto por acumulador de tick (independiente del framerate), bloqueo de giro de 180° en el mismo tick, spawn de núcleo en celda libre aleatoria, crecimiento + `+10` puntos al comer, aceleración progresiva (`tickInterval` baja 8ms cada 5 núcleos, piso 60ms) con `level` ligado 1:1 a esos saltos, fin de partida por choque contra pared o contra el propio cuerpo (excluyendo la celda de cola que se libera ese tick si no crece). Implementar `PALETTES`/`setSkin` igual que `AsteroidsGame.ts` (cuerpo cian/núcleo magenta en `"clasico"`). Sin HUD de texto dibujado. `pause()`/`resume()` resetean `lastTime` y `tickAcc`. `onStateChange({score, lives, level})` deduplicado; `forceGameOver()` llama `onGameOver` una sola vez. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/snake/SnakeCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de `keydown`/`keyup` sobre las 4 flechas con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, segundo `useEffect([skin])` que llama `gameRef.current?.setSkin(skin ?? "clasico")`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`. Agregar `snake: SnakeCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/snake/jugar` es Snake real y jugable con las 4 flechas; el HUD externo (Puntuación/Vidas/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa sin saltos de tick; FIN abre el modal de fin de juego; cambiar de skin en el selector recolorea la serpiente/núcleo en caliente; los demás juegos siguen idénticos.
3. **Verificar leaderboard real (sin cambios de código).** Jugar una partida de Snake hasta chocar (contra el borde o contra el propio cuerpo) y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'snake'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/snake` y la pestaña SNAKE de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), y que la fila "TU MEJOR MARCA" no aparece (comportamiento genérico ya existente). Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/snake/jugar` es Snake real y jugable con las 4 flechas: la serpiente se mueve en pasos discretos sobre una grilla de `40×30` celdas dentro del canvas `800×600`.
- [ ] No se puede invertir la dirección 180° en el mismo tick (ej. ir a la derecha y presionar izquierda no gira instantáneamente sobre el segundo segmento).
- [ ] Comer un núcleo hace crecer la serpiente un segmento, suma `+10` puntos, y hace aparecer un núcleo nuevo en una celda libre distinta.
- [ ] La velocidad aumenta progresivamente (tick más corto) cada 5 núcleos comidos, con un piso mínimo; `level` sube en los mismos saltos.
- [ ] Chocar contra el borde del canvas o contra el propio cuerpo termina la partida al instante (1 vida, sin respawn).
- [ ] La serpiente se ve en cian y el núcleo en magenta con la skin `"clasico"`; cambiar de skin en el selector de `GamePlayer` recolorea ambos en caliente sin reiniciar la partida.
- [ ] El HUD externo del reproductor refleja el estado real (Puntuación, Vidas, Nivel); el canvas no dibuja su propio texto de HUD.
- [ ] PAUSA congela el juego por completo (incluido el acumulador de tick, sin saltos de varios pasos al reanudar) y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'snake'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/snake` y la pestaña SNAKE de `/salon` muestran el leaderboard real de `snake` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Las flechas no hacen scroll de la página mientras se juega Snake.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** diseñar un clon de Snake desde cero. **No:** portar un `game.js` de referencia. Motivo: `resources/started-games/` solo trae `02-asteroids`, `03-tetris` y `04-arkanoid` (confirmado por `Glob resources/started-games/*`); no existe fuente para snake/snake.
- **Sí:** grid de `40×30` celdas de `20×20` px. **No:** un tamaño de celda arbitrario. Motivo: encaja exacto en el canvas fijo `800×600` sin resto ni bordes muertos, y da suficiente resolución de juego (1200 celdas) para partidas largas antes de llenar el tablero.
- **Sí:** 1 vida, choque contra pared o contra el propio cuerpo termina la partida al instante, sin respawn. **No:** vidas múltiples con reaparición e invencibilidad temporal (como Asteroids). Motivo: fidelidad al género Snake clásico, donde cualquier choque siempre termina la partida; `RealGameState.lives` sigue siendo el campo genérico existente, solo que acá vale `1 → 0`.
- **Sí:** el borde del canvas también mata (sin wrap-around toroidal). **No:** envolver la serpiente al otro lado del tablero como sí hace Asteroids con los asteroides. Motivo: el Snake clásico termina la partida al tocar el borde; un wrap-around cambiaría sustancialmente la dificultad e identidad del juego frente al original que se está clonando.
- **Sí:** movimiento gobernado por un acumulador de tiempo por tick, independiente del `requestAnimationFrame`. **No:** mover un segmento cada frame o cada N frames fijos. Motivo: pedido explícito; evita que la velocidad de la serpiente dependa del framerate/monitor del jugador.
- **Sí:** bloquear cualquier input que invierta 180° la dirección actual en el mismo tick. **No:** permitir la inversión y dejar que la serpiente choque contra su segundo segmento. Motivo: regla estándar del género; evita una muerte "gratis" por un doble toque de flecha accidental.
- **Sí:** colisión contra el cuerpo excluye la celda de cola que se libera ese mismo tick cuando la serpiente no crece. **No:** chequear contra el array de cuerpo completo previo al movimiento. Motivo: regla clásica de Snake; sin esta excepción la serpiente "chocaría" contra su propia cola en cada movimiento normal sin haber comido.
- **Sí:** velocidad y `level` ligados 1:1 cada 5 núcleos comidos (`tickInterval -= 8ms`, piso `60ms`; `level = 1 + floor(núcleosComidos/5)`). **No:** una curva continua/exponencial o un `level` desacoplado de la velocidad. Motivo: simple, verificable a ojo durante una partida, y reutiliza el campo `level` ya genérico del HUD sin inventar uno nuevo.
- **Sí:** `+10` puntos fijos por núcleo comido, sin bonus por velocidad ni por longitud. **No:** puntuación variable o multiplicador por nivel. Motivo: mismo criterio flat que Arkanoid (`+10` por bloque roto), simple y fácil de verificar.
- **Sí:** implementar `setSkin`/`PALETTES` desde este spec, igual que `AsteroidsGame.ts`. **No:** dejarlo pendiente como hizo Arkanoid (SPEC 09). Motivo: pedido explícito de este spec; el selector de skins en `GamePlayer` ya es genérico para cualquier `REAL_GAMES[game.id]` pero hoy solo Asteroids lo honra de verdad — Snake es el segundo juego en implementarlo, evitando que el selector quede visualmente "roto" (mostrado pero sin efecto) para este juego.
- **Sí:** cuerpo de la serpiente en cian y núcleo en magenta para la skin `"clasico"`. **No:** otra asignación de color. Motivo: coincide directamente con el copy ya existente en `lib/data.ts` ("núcleos magenta"), sin necesidad de decidir nada nuevo sobre esa paleta base.
- **Sí:** reutilizar `lib/scores.ts`/`REAL_GAMES`/`GamePlayer` sin cambios, una sola línea nueva en `REAL_GAMES`. **No:** tocar la infraestructura genérica. Motivo: SPEC 04/05 ya la dejaron genérica por `game_id`; agregar `snake` al mapa basta para que guardado y ambos leaderboards funcionen.
- **Sí:** solo teclado (4 flechas), sin controles táctiles/audio. **No:** agregar botones en pantalla para móvil ni sonido. Motivo: ningún juego real del catálogo tiene audio ni controles táctiles hoy; consistente con Asteroids/Tetris/Arkanoid.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al no haber `game.js` de referencia, la velocidad inicial, la curva de aceleración y la puntuación son decisiones nuevas del equipo, no un balance ya jugado y validado en otro lado.                       | Quedan documentadas como decisiones explícitas y revisables en este spec antes de aprobarlo (mismo criterio que ya usa el agente `game-planner`/la skill `juego-real` para juegos sin fuente); si el balance no se siente bien jugando, es un ajuste de spec, no un bug.                           |
| Un acumulador de tick mal implementado (ej. no resetear `tickAcc` en `resume()`, o no acotar `dt` tras una pestaña en segundo plano) puede hacer que la serpiente avance varios pasos de golpe al reanudar. | `resume()` resetea explícitamente `lastTime` **y** `tickAcc` a 0 (no solo `lastTime` como en Asteroids/Tetris); `dt` acotado a `0.05s` por frame como los demás motores.                                                                                                                            |
| Si la serpiente llega a ocupar la totalidad de las 1200 celdas del grid, no queda celda libre para spawnear un núcleo nuevo.                                                                                | Caso extremo casi inalcanzable con 1 vida y sin wrap-around (requeriría una partida perfecta larguísima); si ocurre, el motor simplemente no coloca núcleo nuevo hasta que se libere una celda (no crashea), sin necesidad de una pantalla de "victoria" separada — fuera de alcance de este spec. |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners de teclado si el cleanup no cancela todo.                              | Copiar el patrón ya probado de `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 2.                                                                        |
| En móvil `/juego/snake/jugar` no es jugable (solo teclado, sin controles táctiles).                                                                                                                    | Aceptado y documentado como fuera de alcance, igual que en Asteroids/Tetris/Arkanoid.                                                                                                                                                                                                          |
