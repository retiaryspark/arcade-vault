# 11 — Pac-Man: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real), SPEC 05 (índice/confirmación de `scores` genérico por `game_id`)
**Fecha:** 2026-09-25
**Objetivo:** Diseñar desde cero (sin fuente de referencia en `resources/started-games/`) un motor real y jugable de Pac-Man —clon de Pac-Man con laberinto de grilla fija, píldora de poder y cuatro fantasmas con IA simple— en `/juego/pac-man/jugar`, con leaderboard real en Supabase y soporte de skins, siguiendo el mismo patrón técnico que Asteroids, Tetris y Arkanoid.

---

## Alcance

**Incluye:**

- Motor del juego en `components/games/pac-man/PacManGame.ts`, con mecánicas de Pac-Man diseñadas desde cero (no hay `game.js` de referencia para este género en `resources/started-games/`, que solo trae `02-asteroids`, `03-tetris` y `04-arkanoid`):
  - Laberinto fijo de grilla `32 columnas × 24 filas` de celdas de `25×25px` (encaja exacto en el canvas `800×600`), codificado como una matriz constante (paredes/pasillos/casa de fantasmas), igual criterio que el tablero fijo de `TetrisGame.ts` y los 5 niveles fijos de `ArkanoidGame.ts`.
  - Movimiento por celdas: el jugador se desplaza celda a celda a velocidad constante; la dirección solicitada (flechas) se encola y solo se aplica al llegar al centro de una celda transitable en esa dirección (giro únicamente en intersecciones), patrón clásico de Pac-Man en vez de movimiento libre continuo.
  - Pellets: ~150 pellets normales (`+10` puntos cada uno, uno por celda de pasillo transitable) y 4 píldoras de poder (`+50` puntos cada una) ubicadas una en cada esquina del laberinto.
  - Píldora de poder: al comerla, se activa el estado "frightened" durante `8s` (con parpadeo de advertencia cian/magenta en los últimos `2s` antes de expirar). Durante ese tiempo el jugador puede comer fantasmas; comerlos otorga puntaje en combo creciente `200 → 400 → 800 → 1600`, que se reinicia con cada píldora nueva (no acumula entre píldoras distintas).
  - 4 fantasmas con IA simple: en modo normal alternan entre **perseguir** (se mueven, en cada intersección, hacia la celda adyacente que minimiza la distancia Manhattan a la posición del jugador) y **dispersión** (cada ~7s de persecución alternan ~3s moviéndose hacia una esquina fija distinta por fantasma), igual patrón de movimiento para los 4 —sin IA individual tipo Blinky/Pinky/Inky/Clyde del original—, solo cambia su esquina de dispersión. En modo "frightened" invierten a huir (en cada intersección eligen, entre las direcciones válidas, la que maximiza la distancia al jugador) a velocidad reducida.
  - Velocidades: jugador `150px/s`; fantasmas en persecución/dispersión `130px/s`; fantasmas en frightened `90px/s`. Ambas escalan `+8%` por nivel (tope `1.5×` de la velocidad base) al subir de nivel.
  - Colisión jugador-fantasma sin frightened activo: resta 1 vida, jugador y los 4 fantasmas vuelven a su posición inicial, breve pausa antes de reanudar. Con `lives === 0`, fin de partida.
  - Fantasma comido durante frightened: vuelve a aparecer directamente en el centro de la casa de fantasmas (sin animación de "ojos" regresando del original), simplificación explícita documentada en Decisiones.
  - Condición de nivel: al comerse el último pellet/píldora del laberinto, `level += 1`, el laberinto se reinicia con todos los pellets de nuevo y la velocidad escalada del nivel nuevo; las vidas no se resetean entre niveles (igual criterio que Arkanoid).
  - Vidas iniciales: 3.
  - Motor con el mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`/`ArkanoidGame.ts`: `constructor(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado (`Math.min((ts-last)/1000, 0.05)`); `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió). El canvas no dibuja HUD de texto (PUNTUACIÓN/VIDAS/NIVEL); eso lo sigue mostrando el HUD externo de `GamePlayer`.
  - Canvas fijo `800×600`, dibujado con formas vectoriales (círculo para el jugador y los pellets, círculos/óvalos para fantasmas, rectángulos para paredes), sin sprites ni imágenes, mismo enfoque que los 3 juegos reales existentes.
- Recoloreado a la paleta neón del sitio: jugador (círculo glotón) y pellets/píldoras en cian (`#00f5ff`, `var(--cyan)`); los 4 fantasmas en magenta (`#ff006e`, `var(--magenta)`) en modo normal. Durante el frightened, los fantasmas cambian a **cian** (inversión visual de roles: son ahora la "presa", del mismo color que el jugador que los puede comer) con parpadeo alternando cian/magenta en los últimos 2 segundos de la píldora como advertencia de que el efecto está por terminar — sin salir de la paleta cian/magenta del sitio.
- **Soporte de skins obligatorio** (a diferencia de Arkanoid, que lo dejó fuera de alcance): el motor implementa `setSkin(skin: GameSkin)` y un mapa `PALETTES: Record<GameSkin, Palette>` interno, igual patrón que `components/games/asteroids/AsteroidsGame.ts` (líneas ~367-403: `private palette: Palette; this.palette = PALETTES[callbacks.skin ?? "clasico"]; setSkin(skin) { this.palette = PALETTES[skin]; }`), cubriendo los 3 `GameSkin` ya definidos en `components/games/registry.ts` (`clasico`/`neon`/`retro`) con sus propios colores de jugador/pellets/fantasmas/frightened. El wrapper recibe/pasa la prop `skin` y llama `gameRef.current?.setSkin(skin ?? "clasico")` en un `useEffect([skin])`, igual que `components/games/asteroids/AsteroidsCanvas.tsx`.
- Wrapper de React `components/games/pac-man/PacManCanvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs, listeners de teclado en `window` (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`) con `preventDefault` (guard `isTextInput` para no romper el input de iniciales), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`.
- Registro: una sola línea nueva en `components/games/registry.ts` → `"pac-man": PacManCanvas`. Único punto de integración.

**Explícitamente fuera de alcance (no en este spec):**

- Sin audio; sin controles táctiles/móviles para los juegos reales; sin migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sin deduplicar el ranking de `scores` por jugador; sin ligar la sesión anónima de Supabase con `lib/session-context.tsx`; no tocar `lib/scores.ts`/`lib/supabase/client.ts`/`components/GamePlayer.tsx`/`app/juego/[id]/page.tsx`/`app/salon/page.tsx`/esquema `scores`/`profiles`/RLS/índice compuesto; no convertir ningún otro juego del catálogo en real.
- No se porta ningún `game.js` existente: `resources/started-games/` solo trae `02-asteroids`, `03-tetris` y `04-arkanoid`; no hay fuente de Pac-Man en el repo. Todo el diseño de laberinto/IA/puntuación de este spec es nuevo, no un port.
- Sin frutas bonus ni power-ups adicionales del Pac-Man clásico (cereza, llave, teletransporte por túneles laterales, etc.): solo pellets normales + píldora de poder, tal como pide el encargo.
- Sin IA individual por fantasma (comportamientos distintos tipo Blinky/Pinky/Inky/Clyde del arcade original): los 4 fantasmas comparten la misma lógica de persecución/dispersión/frightened, solo varía su esquina de dispersión asignada.
- Sin estado "ojos" del fantasma comido regresando caminando a la casa: reaparece directo en el centro de la casa de fantasmas.
- Sin laberinto aleatorio ni editable ni selección de laberintos alternativos: un único layout fijo, igual criterio que el tablero fijo de Tetris y los 5 niveles fijos de Arkanoid.
- Sin pathfinding sofisticado (A*, BFS completo): heurística greedy de distancia Manhattan evaluada solo en intersecciones.
- Sin rebalanceo posterior a la aprobación del spec: los valores de velocidad/duración de píldora/puntuación aquí definidos son la línea base a implementar; cualquier ajuste de balance percibido durante el playtest queda para un spec de ajuste posterior, no bloquea este.

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

Estado interno del motor (no persistido), inspirado en el mismo criterio que el estado interno documentado en SPEC 09:

```ts
// components/games/pac-man/PacManGame.ts (interno, no exportado)
// maze: boolean[24][32]              — true = pasillo transitable, false = pared
// pellets: { x, y, eaten }[]         — celdas de pasillo con pellet normal (+10)
// powerPellets: { x, y, eaten }[]    — 4 píldoras de poder fijas (+50)
// player: { col, row, dir, queuedDir }  — posición en grilla + dirección actual/encolada
// ghosts: { col, row, dir, mode: "chase"|"scatter"|"frightened"|"eaten", scatterTarget }[]  — 4 fantasmas
// frightenedTimer: number            — segundos restantes de píldora activa (0 = inactivo)
// eatenComboIndex: 0..3              — índice sobre [200, 400, 800, 1600], se resetea por píldora
// score, lives (arranca en 3), level (1..n)
```

`PacManGame` implementa además `setSkin(skin: GameSkin)` con su propio `PALETTES: Record<GameSkin, Palette>` interno (jugador/pellets, fantasmas normal, fantasmas frightened, paredes), mismo patrón que `AsteroidsGame.ts`. `RealGameState` (`components/games/registry.ts`) no gana ningún campo nuevo: `level` ya existe y mapea 1:1 al nivel de laberinto actual.

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  "pac-man": PacManCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Laberinto + movimiento base del jugador.** Crear `components/games/pac-man/PacManGame.ts` con la matriz fija del laberinto (`32×24` celdas de `25px`), el jugador moviéndose por celdas con cola de dirección (gira solo en intersecciones), los pellets normales distribuidos en los pasillos y su consumo (`+10`, deduplicado en `onStateChange`), sin fantasmas todavía. Dibujo vectorial: paredes, jugador (círculo cian) y pellets (puntos cian pequeños). Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Fantasmas + colisión + vidas.** Sumar las 4 instancias de fantasma (magenta), su lógica de persecución/dispersión alternada por temporizador y colisión con el jugador (resta 1 vida, reposiciona jugador y fantasmas, `lives === 0` dispara `onGameOver`). Verificación: ninguna todavía.
3. **Píldoras de poder + frightened + combo + skins.** Sumar las 4 píldoras de poder (`+50`), el estado frightened (`8s`, fantasmas a cian, huida por distancia Manhattan máxima, parpadeo de advertencia en los últimos `2s`), el combo de puntaje al comer fantasmas (`200/400/800/1600`, reinicio por píldora), el fantasma comido reapareciendo en la casa, la condición de nivel (laberinto limpio → `level += 1`, reset de pellets, velocidad escalada `+8%` por nivel hasta `1.5×`), y `setSkin(skin)`/`PALETTES` interno con las 3 variantes (`clasico`/`neon`/`retro`). Verificación: ninguna todavía.
4. **Wrapper + registro.** Crear `components/games/pac-man/PacManCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado (flechas) con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`, y `useEffect([skin])` llamando `gameRef.current?.setSkin(skin ?? "clasico")`. Agregar `"pac-man": PacManCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/pac-man/jugar` es Pac-Man real y jugable con teclado; el HUD externo (Puntuación/Vidas/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; cambiar de skin en el selector recolorea el juego en vivo sin reiniciar la partida; los demás juegos siguen idénticos.
5. **Verificar leaderboard real (sin cambios de código).** Jugar una partida de Pac-Man hasta el fin (perder las 3 vidas) y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'pac-man'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/pac-man` y la pestaña PAC-MAN de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), y que la fila "TU MEJOR MARCA" no aparece (comportamiento genérico ya existente). Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/pac-man/jugar` es Pac-Man real y jugable con teclado: el jugador se mueve por celdas del laberinto fijo, giros solo en intersecciones.
- [ ] Comer un pellet normal suma `+10`; comer una píldora de poder suma `+50` y activa 8s de estado frightened con parpadeo de advertencia en los últimos 2s.
- [ ] Los 4 fantasmas persiguen al jugador (heurística de distancia Manhattan) alternando con dispersión periódica hacia su esquina asignada; en frightened huyen a velocidad reducida.
- [ ] Comer un fantasma durante el frightened otorga el combo `200/400/800/1600` (creciente, reiniciado en cada píldora nueva) y el fantasma reaparece en la casa central.
- [ ] Chocar con un fantasma sin frightened activo resta 1 vida y reposiciona jugador y fantasmas; con `lives === 0` termina la partida.
- [ ] Comer todos los pellets/píldoras del laberinto avanza `level`, reinicia el laberinto con pellets nuevos y aumenta la velocidad (`+8%` por nivel, tope `1.5×`); las vidas no se resetean entre niveles.
- [ ] El jugador y los pellets se ven en cian; los fantasmas en magenta normalmente y en cian (con parpadeo de advertencia) durante el frightened.
- [ ] Todo se dibuja en un único `<canvas width={800} height={600}>` con formas vectoriales; el canvas no dibuja el texto de PUNTUACIÓN/VIDAS/NIVEL.
- [ ] El HUD externo del reproductor refleja el estado real (Puntuación, Vidas, Nivel).
- [ ] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] Cambiar de skin (`clasico`/`neon`/`retro`) desde el selector existente recolorea jugador/pellets/fantasmas en vivo, sin reiniciar la partida en curso.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'pac-man'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/pac-man` y la pestaña PAC-MAN de `/salon` muestran el leaderboard real de `pac-man` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Las flechas no hacen scroll de la página mientras se juega Pac-Man.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** diseñar Pac-Man desde cero, sin fuente de referencia. **No:** buscar un port externo o asumir que existe un `game.js` en `resources/started-games/`. Motivo: esa carpeta solo trae `02-asteroids`, `03-tetris` y `04-arkanoid` (confirmado con `Glob resources/started-games/*`); no hay ningún clon de Pac-Man en el repo para portar.
- **Sí:** grilla de `32×24` celdas de `25px` (encaja exacto en `800×600`). **No:** un tamaño de celda arbitrario que dejara franjas sin usar en el canvas. Motivo: mismo criterio que el tablero fijo de `TetrisGame.ts`, aprovechar el canvas completo sin recalcular escalado.
- **Sí:** movimiento por celdas con cola de dirección que solo gira en intersecciones (patrón clásico de Pac-Man). **No:** movimiento libre continuo tipo Asteroids. Motivo: es la mecánica que define al género; sin ella el juego no se siente como un clon de Pac-Man.
- **Sí:** velocidades fijas (jugador `150px/s`, fantasmas `130px/s`, frightened `90px/s`) con escalado `+8%` por nivel (tope `1.5×`). **No:** dejar la velocidad sin curva de dificultad. Motivo: da margen para que el jugador escape en frightened y persiga la progresión de nivel de los demás juegos reales (Tetris, Arkanoid).
- **Sí:** los 4 fantasmas comparten una sola lógica (perseguir con heurística Manhattan / dispersión periódica / huir en frightened), solo varía su esquina de dispersión. **No:** implementar 4 IAs distintas tipo Blinky/Pinky/Inky/Clyde del arcade original. Motivo: simplicidad; el spec no tiene una fuente original que fijar como "balance a preservar" (a diferencia de Asteroids/Tetris/Arkanoid), así que se define el mínimo que sostiene la mecánica de persecución/huida.
- **Sí:** fantasma comido reaparece directo en el centro de la casa. **No:** animación de "ojos" regresando caminando, como el original. Motivo: simplificación explícita para acotar el alcance; no cambia el balance de puntuación ni la sensación de riesgo/recompensa del combo.
- **Sí:** duración de píldora de poder `8s`, con parpadeo de advertencia cian/magenta en los últimos `2s`. **No:** una duración fija sin aviso previo. Motivo: da al jugador una señal clara de que el efecto está por terminar, sin agregar HUD de texto (el parpadeo es visual, dentro del canvas).
- **Sí:** combo de puntos por fantasma comido `200/400/800/1600`, reiniciado en cada píldora nueva. **No:** puntaje fijo por fantasma comido. Motivo: recompensa comer varios fantasmas seguidos durante una misma píldora, mismo criterio de "combo" que el arcade original, sin necesidad de portar sus valores exactos.
- **Sí:** fantasmas normales en magenta, frightened en cian (inversión de roles con el jugador). **No:** un color nuevo fuera de la paleta cian/magenta del sitio (p. ej. azul, como el arcade original). Motivo: pedido explícito de mantenerse dentro de la paleta neón ya usada en todo el sitio; el cambio de color comunica igual de claro la inversión de roles.
- **Sí:** implementar `setSkin`/`PALETTES` en el motor desde este spec (a diferencia de Arkanoid, que lo dejó fuera). **No:** dejarlo para un spec futuro de `skin-designer`. Motivo: pedido explícito del encargo; se sigue el mismo patrón ya probado en `AsteroidsGame.ts`/`AsteroidsCanvas.tsx`.
- **Sí:** sin frutas bonus ni power-ups adicionales del Pac-Man original (cereza, túneles laterales, teletransporte). **No:** portar el set completo de bonus del arcade. Motivo: el encargo pide específicamente pellets + píldora de poder; sumar más mecánicas es alcance no solicitado.
- **Sí:** laberinto único fijo, sin selección ni generación aleatoria. **No:** múltiples laberintos o generación procedural. Motivo: mismo criterio que el tablero único de Tetris y los 5 niveles fijos (pero predefinidos) de Arkanoid.
- **Sí:** heurística greedy de distancia Manhattan evaluada solo en intersecciones para la IA de fantasmas. **No:** A* o BFS completo sobre el laberinto. Motivo: alcanza para un comportamiento de persecución creíble en un laberinto de este tamaño, sin el costo de mantener un pathfinding más complejo para 4 agentes por frame.
- **Sí:** reutilizar `lib/scores.ts`/`REAL_GAMES`/`GamePlayer` sin cambios, una sola línea nueva en `REAL_GAMES`. **No:** tocar la infraestructura genérica. Motivo: SPEC 04/05 ya la dejaron genérica por `game_id`; agregar `pac-man` al mapa basta para que guardado y ambos leaderboards funcionen.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| La IA greedy de fantasmas (sin A*) puede quedar atascada contra paredes/esquinas del laberinto fijo si la heurística Manhattan no valida bien las celdas transitables en cada intersección.                                                    | Probar manualmente el laberinto completo en el paso 2 antes de sumar el frightened en el paso 3; ajustar el layout si algún fantasma queda trabado en una esquina.                                                             |
| El movimiento por celdas con cola de dirección es propenso a bugs de "no gira a tiempo" si la detección del centro de celda no tiene tolerancia suficiente.                                                                                    | Resolver y probar el movimiento del jugador solo (sin fantasmas) en el paso 1 antes de sumar cualquier otra mecánica.                                                                                                          |
| Sin balance previo de un original a preservar (a diferencia de Asteroids/Tetris/Arkanoid), los valores de velocidad/duración de píldora/combo definidos aquí son una primera aproximación y pueden sentirse desbalanceados en el playtest. | Aceptado conscientemente: quedan documentados como línea base en este spec; cualquier ajuste percibido en el playtest del paso 4/5 es un spec de rebalanceo posterior, no bloquea esta implementación.                         |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners si el cleanup no cancela todo.                                                                            | Copiar el patrón ya probado de `AsteroidsCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 4.                      |
| Cambiar de skin en vivo (`setSkin`) mientras hay fantasmas en frightened podría dejar un color inconsistente si la paleta de frightened no está definida para las 3 variantes.                                                                 | Definir explícitamente el color frightened dentro de cada entrada de `PALETTES` (no derivarlo en tiempo de dibujo), igual criterio que `AsteroidsGame.ts`; probar el cambio de skin durante un frightened activo en el paso 4. |
