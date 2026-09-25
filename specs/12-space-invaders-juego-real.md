# 12 — Space Invaders: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real), SPEC 05 (índice/confirmación de `scores` genérico por `game_id`)
**Fecha:** 2026-09-25
**Objetivo:** Diseñar e implementar el motor real de Space Invaders (sin fuente de referencia en `resources/started-games/`) con leaderboard en Supabase, siguiendo exactamente el mismo patrón técnico que Asteroids y Tetris, incluyendo soporte de skins.

---

## Alcance

**Incluye:**

- Motor del juego en `components/games/space-invaders/SpaceInvadersGame.ts`, con el mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`: `constructor(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado (`Math.min((ts - last) / 1000, 0.05)`); `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió). Canvas fijo `800×600`, sin HUD de texto dibujado — el HUD (Puntuación/Vidas/Nivel) sigue siendo 100% externo, en `GamePlayer`.
- Mecánica del juego, diseñada desde cero por ser un clon sin fuente portable (ver "Decisiones tomadas y descartadas"):
  - **Formación:** grilla de `5 filas × 8 columnas` = 40 enemigos en la oleada 1 (`ROWS = Math.min(5 + (level - 1), 7)`, `COLS = 8` fijo — la formación crece hasta un tope de 7 filas a medida que sube el nivel). Cada enemigo mide `32×24`, con espaciado `dx = 48`, `dy = 40`, origen en `x = 200, y = 80`.
  - **Desplazamiento:** la formación se mueve en bloque horizontal a `speed = (BASE_SPEED + (totalOleada - vivos) * SPEED_PER_KILL) * (1 + (level - 1) * 0.15)` px/s, con `BASE_SPEED = 40`, `SPEED_PER_KILL = 3`. Al tocar cualquier enemigo vivo el borde horizontal del canvas (`x <= 20` o `x + 32 >= 780`), la formación completa invierte de dirección y baja `STEP_DOWN = 20` px. Esto reproduce la aceleración clásica del género: cuantos menos enemigos quedan vivos, más rápido se mueve el resto.
  - **Cañón del jugador:** rectángulo `40×20` en `y = 560`, se mueve solo en horizontal con `ArrowLeft`/`ArrowRight` a `PLAYER_SPEED = 300` px/s, acotado a los bordes del canvas.
  - **Disparo del jugador:** bala `4×16`, `vy = -500` px/s, cadencia limitada a un disparo cada `PLAYER_FIRE_COOLDOWN = 0.35` s (tecla espacio; mantener presionado no dispara más rápido que el cooldown).
  - **Disparo de los enemigos:** cada `ENEMY_FIRE_INTERVAL` segundos (`1.4 - (level - 1) * 0.1`, con piso `0.5`), se elige al azar una columna con enemigos vivos y dispara el enemigo más bajo de esa columna (única bala por disparo, `4×16`, `vy = +260` px/s), evitando fuego "a través" de enemigos ya destruidos debajo.
  - **Puntuación por fila** (estándar del género, más valor cuanto más arriba/difícil de alcanzar): fila `0` (superior) = 30 pts, filas `1`–`2` = 20 pts, filas `3`+ = 10 pts, sumado a `score` al destruir cada enemigo.
  - **Vidas y condición de derrota:** el jugador arranca con `lives = 3`. Ser alcanzado por una bala enemiga resta 1 vida y respawnea el cañón centrado con invencibilidad temporal breve (`1s`, mismo patrón que la reaparición de la nave en Asteroids); al llegar a `lives = 0`, `onGameOver(score)`. Independientemente de las vidas restantes, si cualquier enemigo vivo alcanza la "línea base" (`enemigo.y + 24 >= LINE_BASE_Y = 520`, cerca del cañón), es derrota instantánea (`onGameOver(score)` inmediato) — la invasión llegó a la superficie, regla clásica del género que no depende de vidas.
  - **Nivel / oleadas:** al destruir el último enemigo vivo de la formación (`vivos === 0`), incrementa `level`, se resetean posición/dirección/velocidad base y se genera una formación nueva con `ROWS` recalculado (más numerosa hasta el tope de 7 filas) y velocidad base ya más alta por el multiplicador de nivel — vidas y puntuación no se resetean entre oleadas.
- **Soporte de skins obligatorio** (a diferencia de SPEC 09/Arkanoid, que lo dejó fuera): el motor implementa `setSkin(skin: GameSkin)` y un mapa `PALETTES` interno con entradas para `"clasico" | "neon" | "retro"`, igual patrón que `components/games/asteroids/AsteroidsGame.ts` (`private palette: Palette; this.palette = PALETTES[callbacks.skin ?? "clasico"]; setSkin(skin) { this.palette = PALETTES[skin]; }`). `"clasico"` reproduce la paleta neón base del motor (cañón/balas del jugador en cian `#00f5ff`/`var(--cyan)`, enemigos/balas enemigas en magenta `#ff006e`/`var(--magenta)`); `"neon"` y `"retro"` son variantes de color sobre los mismos elementos (cañón/balas propias vs. enemigos/balas enemigas), sin tocar tamaños, velocidades ni hitboxes.
- Wrapper `components/games/space-invaders/SpaceInvadersCanvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs, listeners de teclado en `window` (`ArrowLeft`/`ArrowRight`/`Space`) con `preventDefault` (guard `isTextInput`), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`. Recibe la prop `skin` y la propaga con `gameRef.current?.setSkin(skin ?? "clasico")` en un `useEffect([skin])`, igual que `AsteroidsCanvas.tsx`.
- Registro: una sola línea nueva en `components/games/registry.ts` → `"space-invaders": SpaceInvadersCanvas`. Único punto de integración; `lib/scores.ts` ya es genérico por `game_id`, no se toca infraestructura.

**Explícitamente fuera de alcance (no en este spec):**

- Sin audio; sin controles táctiles/móviles (solo teclado; en móvil `/juego/space-invaders/jugar` no es jugable); sin migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sin deduplicar el ranking de `scores` por jugador; sin vincular la sesión anónima de Supabase con `lib/session-context.tsx`; no tocar `lib/scores.ts`/`lib/supabase/client.ts`/`components/GamePlayer.tsx`/`app/juego/[id]/page.tsx`/`app/salon/page.tsx`/esquema `scores`/`profiles`/RLS/índice compuesto; no convertir ningún otro juego del catálogo en real.
- Búnkeres/escudos destructibles del Space Invaders original: no forman parte de la descripción de mecánica de este spec (formación + cañón + disparos); se documentan como decisión explícita, no como omisión accidental.
- Nave/OVNI bonus que cruza la parte superior del canvas: tampoco descrita en el diseño de este spec; se deja fuera con el mismo criterio.
- Control por mouse: no existe en el diseño (solo flechas + espacio), consistente con Asteroids/Tetris/Arkanoid.
- Cambiar el contrato compartido `RealGameProps`/`RealGameHandle`/`RealGameState` (`GameSkin`/`SKINS` ya existen en `registry.ts`, no se modifican).

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `public.scores` ya existe (SPEC 02) y es genérico por `game_id` (SPEC 05):

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

Estado interno del motor (no persistido):

```ts
// components/games/space-invaders/SpaceInvadersGame.ts (interno, no exportado)
// player: { x, y: 560, w: 40, h: 20, invincibleUntil }
// enemies: { row, col, x, y, w: 32, h: 24, alive }[]   — grilla ROWS×8
// formation: { dir: 1 | -1, speed }                     — velocidad recalculada por vivos/nivel
// playerBullets: { x, y, w: 4, h: 16, vy: -500 }[]
// enemyBullets: { x, y, w: 4, h: 16, vy: 260 }[]
// score, lives (arranca en 3), level (arranca en 1)
// palette: Palette                                      — según setSkin(skin)
```

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  "space-invaders": SpaceInvadersCanvas, // nuevo
};
```

`SpaceInvadersGame` reutiliza `RealGameProps`/`RealGameHandle`/`RealGameState`/`GameSkin` sin cambios de interfaz.

---

## Plan de implementación

1. **Motor de Space Invaders.** Crear `components/games/space-invaders/SpaceInvadersGame.ts`: formación 5×8 inicial, movimiento en bloque con rebote/bajada de fila, cañón del jugador, disparo del jugador con cooldown, disparo aleatorio de enemigos, colisiones bala-enemigo y bala-jugador, puntuación por fila, vidas con invencibilidad temporal al reaparecer, condición de derrota por línea base, incremento de nivel/oleada al limpiar la formación, `PALETTES` (`clasico`/`neon`/`retro`) y `setSkin(skin)`. Sin HUD de texto dibujado. Loop propio con `dt` acotado; `onStateChange`/`onGameOver` según contrato. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/space-invaders/SpaceInvadersCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx` (incluida la propagación de `skin` vía `useEffect([skin])`): `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado (`ArrowLeft`/`ArrowRight`/`Space`) con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause/resume/forceGameOver`. Agregar `"space-invaders": SpaceInvadersCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/space-invaders/jugar` es Space Invaders real y jugable con teclado; el HUD externo refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; cambiar de skin en el selector recolorea cañón/enemigos sin reiniciar la partida; los demás juegos siguen idénticos.
3. **Verificar leaderboard real (sin cambios de código).** Jugar una partida de Space Invaders hasta el fin (perder las 3 vidas, o dejar que un enemigo alcance la línea base) y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'space-invaders'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/space-invaders` y la pestaña SPACE INVADERS de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), sin la fila "TU MEJOR MARCA". Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/space-invaders/jugar` es Space Invaders real y jugable con teclado: mover el cañón con `ArrowLeft`/`ArrowRight`, disparar con espacio respetando el cooldown de `0.35s`.
- [ ] La formación de enemigos se desplaza en bloque, rebota e invierte dirección bajando una fila al tocar un borde, y acelera a medida que quedan menos enemigos vivos y sube el nivel.
- [ ] Los enemigos disparan periódicamente hacia abajo desde una columna aleatoria con enemigos vivos.
- [ ] Ser alcanzado por una bala enemiga resta 1 vida y respawnea al jugador con invencibilidad temporal; llegar a 0 vidas termina la partida.
- [ ] Un enemigo que alcanza la línea base (`y >= 520`) termina la partida de inmediato, sin importar las vidas restantes.
- [ ] Destruir un enemigo suma puntos según su fila (30/20/10), y limpiar toda la formación genera una nueva oleada más numerosa (hasta 7 filas) y más rápida, incrementando `level`.
- [ ] El cañón y sus balas se ven en cian; los enemigos y sus balas, en magenta (skin `"clasico"`); cambiar a `"neon"`/`"retro"` recolorea ambos grupos sin alterar velocidades ni hitboxes.
- [ ] El HUD externo del reproductor refleja el estado real (Puntuación, Vidas, Nivel); el canvas no dibuja su propio texto de HUD.
- [ ] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'space-invaders'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/space-invaders` y la pestaña SPACE INVADERS de `/salon` muestran el leaderboard real de `space-invaders` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Las flechas y la barra espaciadora no hacen scroll de la página mientras se juega Space Invaders.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** diseñar Space Invaders como clon desde cero, sin fuente portable. **No:** buscar/forzar un mapeo a `resources/started-games/`. Motivo: solo existen `02-asteroids`, `03-tetris` y `04-arkanoid` en esa carpeta (confirmado con `Glob`); no hay ningún `game.js` de Space Invaders que portar.
- **Sí:** formación `5×8` (40 enemigos) en la oleada 1, creciendo hasta un tope de 7 filas por nivel. **No:** la grilla `5×11` del arcade original ni una formación sin tope. Motivo: 8 columnas caben cómodas en el canvas de 800px con espaciado legible; un tope evita que oleadas avanzadas saturen el canvas o degraden el framerate con cientos de entidades.
- **Sí:** la velocidad de la formación aumenta tanto por enemigos restantes (`SPEED_PER_KILL`) como por nivel (`× (1 + (level-1)*0.15)`). **No:** velocidad fija por oleada. Motivo: es la aceleración clásica y reconocible del género (la formación se pone más rápida y tensa a medida que se vacía), documentada aquí como fórmula concreta y revisable en vez de dejarla implícita.
- **Sí:** condición de derrota dual — bala enemiga resta 1 vida (con respawn e invencibilidad temporal, igual que Asteroids), pero un enemigo que alcanza la línea base termina la partida al instante sin importar las vidas. **No:** una sola condición de derrota (todo por vidas, o todo instantáneo). Motivo: preserva la tensión del original (la invasión que "llega" es game over inmediato) sin volver el juego injustamente frágil ante un solo disparo enemigo.
- **Sí:** puntuación por fila (30/20/10, más arriba = más puntos). **No:** puntaje uniforme por enemigo. Motivo: es la variación estándar del género y le da sentido a apuntar a las filas superiores, más difíciles de alcanzar antes de que la formación baje.
- **Sí:** cadencia de disparo del jugador limitada por cooldown (`0.35s`) y de los enemigos por intervalo aleatorio decreciente con el nivel (`1.4s → piso 0.5s`). **No:** disparo ilimitado del jugador ni fuego enemigo simultáneo de toda la formación. Motivo: mantiene el ritmo jugable del género (un disparo a la vez, presión creciente por nivel) sin saturar la pantalla de proyectiles.
- **Sí:** soporte de skins obligatorio desde este spec (`setSkin`/`PALETTES`, mismo patrón que `AsteroidsGame.ts`). **No:** dejarlo fuera como hizo SPEC 09/Arkanoid. Motivo: pedido explícito de este spec — a diferencia de Arkanoid, Space Invaders no hereda ambigüedad sobre skins; se implementa desde el día uno para no repetir la deuda documentada por el agente `skin-designer` en el otro juego.
- **Sí:** sin búnkeres/escudos destructibles ni nave/OVNI bonus. **No:** portar esas mecánicas adicionales del Space Invaders original. Motivo: no están descritas en el diseño de mecánica de este spec (formación + cañón + disparos); agregarlas sería inventar alcance no pedido, revisable en un spec futuro si se decide sumarlas.
- **Sí:** solo teclado (`ArrowLeft`/`ArrowRight`/espacio), sin mouse ni controles táctiles. **No:** agregar botones en pantalla para móvil. Motivo: consistente con Asteroids/Tetris/Arkanoid; en móvil la pantalla de jugar simplemente no es jugable, riesgo aceptado y documentado.
- **Sí:** reutilizar `lib/scores.ts`/`REAL_GAMES`/`GamePlayer` sin cambios, una sola línea nueva en `REAL_GAMES`. **No:** tocar la infraestructura genérica. Motivo: SPEC 04/05 ya la dejaron genérica por `game_id`; agregar `space-invaders` al mapa basta para que guardado y ambos leaderboards funcionen.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los valores de balance (velocidades, cooldowns, incremento por nivel) son inventados por no haber fuente original que portar; pueden sentirse muy fáciles o muy difíciles en la primera jugada.              | Quedan documentados como fórmulas y constantes concretas en este spec, fáciles de ajustar en una sola clase (`SpaceInvadersGame.ts`) sin tocar el contrato externo; se ajustan en revisión manual del paso 2 antes de dar el motor por cerrado. |
| Tres paletas de color distintas (`clasico`/`neon`/`retro`) sobre una formación de 40+ enemigos pueden volverse ilegibles si el contraste entre "enemigos" y "balas enemigas" es muy bajo en alguna variante. | Revisión visual manual de las 3 skins en el paso 2, mismo criterio que la revisión de niveles en SPEC 09; ajustar solo el color, nunca el tamaño/hitbox.                                                                                    |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop, los listeners o el timer de disparo enemigo si el cleanup no cancela todo.             | Copiar el patrón ya probado de `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 2.                 |
| En móvil `/juego/space-invaders/jugar` no es jugable (solo teclado).                                                                                                                                              | Aceptado y documentado como fuera de alcance, igual que en Asteroids/Tetris/Arkanoid.                                                                                                                                                   |
