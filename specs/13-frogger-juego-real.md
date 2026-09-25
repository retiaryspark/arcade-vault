# 13 — Frogger: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real), SPEC 05 (índice/confirmación de `scores` genérico por `game_id`)
**Fecha:** 2026-09-25
**Objetivo:** Diseñar y construir el motor real de Frogger — saltos discretos entre carriles de tráfico y de río sobre un temporizador, con leaderboard real en Supabase — siguiendo exactamente el mismo patrón técnico que Asteroids y Tetris, incluyendo soporte de skins.

---

## Alcance

**Incluye:**

- Motor del juego, diseñado desde cero (no hay `game.js` de referencia para este género — ver "Decisiones tomadas y descartadas"), en `components/games/frogger/FroggerGame.ts`:
  - Grid de movimiento fijo: celdas de `40×40` px sobre el canvas `800×600` → 20 columnas × 15 filas. El jugador (rana) ocupa una celda y se mueve por saltos discretos de exactamente una celda por pulsación de flecha (arriba/abajo/izquierda/derecha), sin desplazamiento continuo ni aceleración.
  - Distribución de filas (de abajo hacia arriba): fila 14 = inicio (segura); filas 12–13 = franja segura previa; filas 7–11 (5 carriles) = tráfico; fila 6 = mediana segura; filas 1–5 (5 carriles) = río; fila 0 = meta, con 5 nenúfares repartidos en franjas iguales de 4 columnas cada uno (columnas 0–3, 4–7, 8–11, 12–15, 16–19).
  - Carriles de tráfico (5): cada uno con dirección y velocidad fija y alternada respecto al vecino (ej. carril más cercano a la mediana: derecha, 90 px/s; siguiente: izquierda, 130 px/s; siguiente: derecha, 160 px/s; siguiente: izquierda, 110 px/s; carril más cercano al inicio, el más lento: derecha, 70 px/s). Colisión rectángulo jugador–coche = pierde una vida.
  - Carriles de río (5): troncos/plataformas con dirección y velocidad fija y alternada por carril (valores de referencia: 60/80/50/100/70 px/s, largos y huecos variables por carril). Mientras el jugador está sobre un tronco, se desplaza junto con él (su `x` se actualiza con la velocidad del tronco cada frame); si el jugador queda en una celda de río sin tronco debajo, o si el arrastre lo saca del canvas (`x < 0` o `x > 760`), pierde una vida (cayó al agua).
  - Franjas seguras (fila 14 de inicio, filas 12–13, fila 6 de mediana): sin obstáculos, el jugador puede pararse indefinidamente.
  - Fila de metas (fila 0): aterrizar dentro de un nenúfar vacío lo marca como ocupado y reinicia al jugador en la fila de inicio con el temporizador recargado. Aterrizar en un nenúfar ya ocupado, o en el espacio entre nenúfares, cuenta como pierde una vida (regla clásica de Frogger, evita repetir la misma meta).
  - Temporizador por vida/ronda: 30 segundos internos al motor, se reinicia cada vez que el jugador pierde una vida o llena un nenúfar. Si llega a 0 antes de llenar un nenúfar, pierde una vida (mismo efecto que chocar con un coche o caer al agua) — ver decisión sobre por qué no se expone visualmente.
  - Vidas: arrancan en 3, son globales a toda la partida (no se resetean por nivel ni por ronda, solo se consumen al chocar/caer/agotar el temporizador/aterrizar mal). Al llegar a 0, fin de partida.
  - Puntuación: `+10` por cada fila nueva avanzada más allá de la fila más alta alcanzada en la vida actual (no se puede farmear retrocediendo y re-avanzando); `+200` al ocupar un nenúfar vacío; bonus de tiempo `+ (segundos restantes del temporizador interno × 10)` al ocupar un nenúfar.
  - Nivel: arranca en 1; al ocupar los 5 nenúfares, sube a `level + 1`, los 5 nenúfares se vacían, el jugador vuelve a la fila de inicio, y las velocidades de todos los carriles (tráfico y río) se multiplican por `1.15` respecto al nivel anterior (compuesto). Las vidas no se resetean al subir de nivel.
  - Mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`: `constructor(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)` (con el mismo patrón de `justPressed` de `AsteroidsGame.ts` para que cada pulsación dispare un único salto, no un salto repetido mientras la tecla queda apretada); `pause()`, `resume()` (resetea el reloj de `dt`); `forceGameOver()` (llama `onGameOver` una sola vez); `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado (ej. `Math.min((ts-last)/1000, 0.05)`); `onStateChange({score, lives, level})` deduplicado (solo cuando cambió algo).
  - Canvas fijo `800×600`, sin HUD de texto dibujado — el HUD externo de `GamePlayer` sigue siendo la única fuente de Puntuación/Vidas/Nivel. El temporizador de 30s es puramente interno al motor y **no** se expone visualmente de ninguna forma (ni como texto ni como barra gráfica) ni se agrega a `RealGameState` — ver decisión.
  - **Soporte de skins obligatorio:** el motor implementa `setSkin(skin: GameSkin)` y un mapa `PALETTES` interno con las 3 variantes (`clasico`/`neon`/`retro`), igual patrón que `components/games/asteroids/AsteroidsGame.ts` (`private palette: Palette; this.palette = PALETTES[callbacks.skin ?? "clasico"]; setSkin(skin) { this.palette = PALETTES[skin]; }`), cubriendo jugador, coches, troncos, agua, carretera, mediana y nenúfares (vacío/ocupado).
  - Recoloreado: el jugador (rana) en cian (`var(--cyan)`/`#00f5ff`) en las 3 variantes que corresponda; los coches en magenta sólido (`var(--magenta)`/`#ff006e`). Los troncos/plataformas seguras usan un relleno neutro tipo "madera neón" (tono oscuro ámbar/marrón, fuera del par cian/magenta) con un fino contorno cian que señala "superficie segura", claramente distinguible del relleno magenta sólido de los coches aunque ambos convivan en la misma paleta general del sitio. El agua usa un azul marino oscuro distinto del gris oscuro de la carretera, para que el tipo de carril (río vs. tráfico) también se lea por el fondo, no solo por los objetos que se mueven sobre él.
- Wrapper `components/games/frogger/FroggerCanvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs (mismo patrón que `AsteroidsCanvas.tsx`), listeners de teclado en `window` para las 4 flechas con `preventDefault` (guard `isTextInput`), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`, y un `useEffect([skin])` que llama `gameRef.current?.setSkin(skin ?? "clasico")`, igual que `AsteroidsCanvas.tsx`.
- Registro: una sola línea nueva en `components/games/registry.ts` → `"frogger": FroggerCanvas`. Único punto de integración.

**Explícitamente fuera de alcance (no en este spec):**

- Sin audio; sin controles táctiles/móviles; sin migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sin deduplicar el ranking de `scores` por jugador; sin vincular la sesión anónima de Supabase con `lib/session-context.tsx`; no tocar `lib/scores.ts`/`lib/supabase/client.ts`/`components/GamePlayer.tsx`/`app/juego/[id]/page.tsx`/`app/salon/page.tsx`/esquema `scores`/`profiles`/RLS/índice compuesto; no convertir ningún otro juego del catálogo en real.
- Exponer el temporizador de 30s en `RealGameState` o dibujarlo como HUD (texto o barra) dentro del canvas: `RealGameState`/`RealGameProps` es un contrato compartido entre los juegos reales y no se modifica por un solo juego.
- Ajustar el balance (velocidades, duración del temporizador, puntuación) durante este spec más allá de los valores de referencia documentados aquí; son un punto de partida ajustable en implementación, no una cifra final validada por playtesting.
- Animaciones de salto (arco, squash-and-stretch) más allá de un salto discreto instantáneo entre celdas; queda como posible pulido visual futuro, no bloquea que el juego sea jugable.
- Cambiar el balance/las reglas de otros juegos ya reales (Asteroids, Tetris) o simulados.

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `scores`/`profiles` **ya existen** (SPEC 02) y su esquema es genérico por `game_id`, confirmado por SPEC 05:

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
// components/games/frogger/FroggerGame.ts (interno, no exportado)
// grid: 40px por celda, 20 columnas × 15 filas sobre canvas 800×600
// player: { col, row }                          — posición en celdas
// lanes de tráfico (filas 7-11): { row, dir: 1|-1, speed, cars: {x,y,w,h}[] }
// lanes de río (filas 1-5):     { row, dir: 1|-1, speed, logs: {x,y,w,h}[] }
// goals: { filled: boolean }[5]                  — fila 0, un slot por nenúfar
// timer: number                                  — segundos restantes, interno, no expuesto
// score, lives (arranca en 3), level (arranca en 1)
// palette: Palette                                — jugador/coches/troncos/agua/carretera/mediana/nenúfares
```

`frogger` reutiliza la interfaz compartida de SPEC 04 sin cambios:

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  frogger: FroggerCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Motor de Frogger desde cero.** Crear `components/games/frogger/FroggerGame.ts`: grid de 40px/20×15 celdas, jugador con saltos discretos por pulsación (patrón `justPressed` de `AsteroidsGame.ts`), 5 carriles de tráfico y 5 de río con velocidad/dirección alternada por carril, franjas seguras, fila de metas con 5 nenúfares, arrastre del jugador sobre troncos, temporizador interno de 30s por vida (sin exponer), puntuación (avance/meta/tiempo), progresión de nivel (llenar 5 metas → reinicia metas y velocidad ×1.15, vidas no se resetean), `PALETTES`/`setSkin` con las 3 variantes, sin HUD de texto dibujado. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/frogger/FroggerCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` para las 4 flechas con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause/resume/forceGameOver`, y `useEffect([skin])` llamando `setSkin`. Agregar `"frogger": FroggerCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/frogger/jugar` es Frogger real y jugable con las 4 flechas (saltos discretos, no continuos); el HUD externo (Puntuación/Vidas/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; cambiar de skin recolorea el juego en vivo; los demás juegos siguen idénticos.
3. **Verificar leaderboard real (sin cambios de código de infraestructura).** Jugar una partida hasta perder las 3 vidas y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'frogger'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/frogger` y la pestaña FROGGER de `/salon` muestran esa puntuación real (con estado vacío cuando aún no hay filas) y que la fila "TU MEJOR MARCA" no aparece. Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/frogger/jugar` es Frogger real y jugable con las 4 flechas: cada pulsación mueve al jugador exactamente una celda del grid, sin desplazamiento continuo.
- [ ] Los 5 carriles de tráfico tienen dirección y velocidad alternada por carril; chocar con un coche resta una vida.
- [ ] Los 5 carriles de río tienen troncos con dirección/velocidad alternada que arrastran al jugador mientras está sobre ellos; caer al agua (sin tronco debajo, o ser arrastrado fuera del canvas) resta una vida.
- [ ] Las franjas seguras (inicio, previa al tráfico, mediana) no tienen obstáculos.
- [ ] La fila de metas tiene 5 nenúfares: aterrizar en uno vacío lo ocupa y reinicia al jugador en el inicio; aterrizar en uno ocupado o fuera de los nenúfares resta una vida.
- [ ] El temporizador interno de 30s por vida resta una vida al llegar a 0, sin mostrarse en ningún HUD ni como texto ni como elemento gráfico.
- [ ] La puntuación suma `+10` por fila nueva avanzada, `+200` por nenúfar ocupado, y un bonus por tiempo restante al ocupar un nenúfar.
- [ ] Llenar los 5 nenúfares sube el nivel, vacía los nenúfares, reinicia al jugador en el inicio y aumenta la velocidad de todos los carriles; las vidas no se resetean al subir de nivel.
- [ ] El jugador se ve en cian; los coches en magenta sólido; los troncos en un tono neutro con contorno cian claramente distinguible de los coches; el agua se distingue visualmente de la carretera.
- [ ] `setSkin`/`PALETTES` con las 3 variantes (`clasico`/`neon`/`retro`) están implementadas en el motor, y cambiar de skin en la UI recolorea el juego sin reiniciar la partida.
- [ ] El canvas es `800×600` fijo y no dibuja ningún HUD de texto; el HUD externo del reproductor refleja el estado real (Puntuación, Vidas, Nivel).
- [ ] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] Perder la última vida termina la partida y abre el modal de fin de juego con la puntuación final correcta.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'frogger'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/frogger` y la pestaña FROGGER de `/salon` muestran el leaderboard real de `frogger` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Las flechas no hacen scroll de la página mientras se juega Frogger.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** diseñar el motor de Frogger desde cero, sin fuente original. **No:** buscar o adaptar un `game.js` existente. Motivo: `resources/started-games/` solo trae `02-asteroids`, `03-tetris` y `04-arkanoid`; no hay ninguna carpeta de Frogger. El género y las mecánicas se infieren del `title`/`short`/`long` de `lib/data.ts` (carriles de tráfico, troncos en el río, nenúfares, temporizador), como ya autoriza el Paso 6 de la skill `juego-real` para juegos sin fuente.
- **Sí:** grid fijo de 40px (20×15 celdas sobre 800×600) con saltos discretos de una celda por pulsación. **No:** movimiento continuo tipo Asteroids/Arkanoid. Motivo: es la mecánica definitoria del género Frogger; un grid exacto también simplifica la colisión con metas/carriles a comparaciones de celda en vez de hitboxes flotantes.
- **Sí:** 5 carriles de tráfico + 5 de río + 3 franjas seguras (inicio, previa, mediana) + 1 fila de metas, exactamente 15 filas de 40px que llenan el canvas de 600px de alto. **No:** menos carriles o un layout que no cuadre exacto con el grid. Motivo: layout estándar del género con dificultad progresiva de doble tipo (esquivar vs. balancearse), y el conteo de filas encaja sin resto en el canvas fijo del sitio.
- **Sí:** velocidad y dirección fija y alternada por carril (tabla de referencia en el motor). **No:** velocidades aleatorias o iguales entre carriles. Motivo: variedad de dificultad legible carril a carril, mismo criterio de "patrón fijo pero variado" que los 5 niveles de Arkanoid (SPEC 09).
- **Sí:** temporizador interno de 30s por vida que solo afecta cuándo se pierde una vida, sin exponerse en `onStateChange` ni dibujarse en el canvas (ni como texto ni como barra). **No:** agregar un campo `time`/`timeLeft` a `RealGameState`, ni dibujar un indicador visual del tiempo restante. Motivo: `RealGameProps`/`RealGameState` es el contrato compartido de SPEC 04 entre los juegos reales; cambiarlo por un solo juego rompería la regla de "único punto de integración" del registro y es una decisión de infraestructura fuera de alcance de este spec.
- **Sí:** troncos en un relleno neutro tipo "madera neón" con contorno cian, agua en azul marino oscuro distinto del gris de la carretera. **No:** troncos también en cian sólido idéntico al jugador, ni coches y troncos compartiendo el mismo magenta. Motivo: cian/magenta estricto en ambos objetos (coche peligroso, tronco seguro) sería ambiguo a simple vista; un tono neutro para "superficie segura" más el color de fondo (agua vs. carretera) da dos señales redundantes para que la distinción sea inmediata.
- **Sí:** puntuación con tres componentes — avance por fila nueva, bonus fijo por meta, bonus por tiempo restante al ocupar meta. **No:** un esquema de puntos plano (solo por sobrevivir, o solo por meta). Motivo: replica el esquema clásico de Frogger (recompensa tanto el progreso como la velocidad) sin inventar un sistema nuevo ajeno al género.
- **Sí:** el nivel sube al llenar las 5 metas, reinicia el tablero de metas y aumenta la velocidad de todos los carriles (`×1.15` compuesto); las vidas no se resetean entre niveles. **No:** una pantalla de "victoria" separada del modal de fin de partida ya existente. Motivo: mismo criterio que Asteroids/Arkanoid — `level` ya existe en `RealGameState` y mapea 1:1 a dificultad creciente; `RealGameHandle`/`RealGameProps` no distinguen "victoria" de "derrota" y no se les agrega ese concepto aquí.
- **Sí:** soporte de skins obligatorio (`PALETTES`/`setSkin`, mismo patrón que `AsteroidsGame.ts`/`AsteroidsCanvas.tsx`). **No:** dejarlo fuera de alcance como hizo Arkanoid (SPEC 09). Motivo: pedido explícito para este spec — ya hay un patrón estable y probado en Asteroids; extenderlo a un juego nuevo evita acumular la misma deuda de "skins pendientes" que dejó SPEC 09, con un costo bajo (más claves de color en el mismo mapa, sin lógica nueva).
- **Sí:** aterrizar en un nenúfar ya ocupado o en el espacio entre nenúfares resta una vida, igual que chocar o caer al agua. **No:** ignorar el aterrizaje inválido y dejar al jugador "flotando" en la fila de metas. Motivo: regla clásica de Frogger; sin esta penalización el jugador podría acumular puntos de avance indefinidamente en la fila 0 sin arriesgarse a ocupar una meta nueva.
- **Sí:** solo teclado (4 flechas), sin controles táctiles. **No:** agregar botones en pantalla para móvil. Motivo: ningún juego real del catálogo tiene controles táctiles hoy (Asteroids, Tetris, Arkanoid); en móvil la pantalla de jugar simplemente no es jugable, mismo riesgo aceptado que en los specs anteriores.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los valores de referencia (velocidades por carril, duración del temporizador, multiplicador de nivel, puntos por meta/tiempo) son un punto de partida sin playtesting real; el juego puede sentirse demasiado fácil o injustamente difícil.                                     | Documentados explícitamente como valores de referencia ajustables durante la implementación (paso 1 del plan), sin bloquear que el spec avance; no requieren aprobación adicional para tunearse dentro del mismo rango de diseño.      |
| El patrón `justPressed` reutilizado de `AsteroidsGame.ts` está pensado para disparo continuo, no para saltos discretos de grid; sin un cooldown mínimo entre saltos, la repetición automática del sistema operativo al mantener una flecha podría encolar más de un salto.      | Cooldown explícito (~120–150ms) entre saltos consumidos por el motor, independiente del estado real de la tecla; verificado manualmente en el paso 2 del plan antes de darlo por cerrado.                                              |
| El arrastre del jugador sobre troncos en movimiento puede sacarlo del canvas por los bordes laterales de forma poco perceptible para el jugador (parece que "no hizo nada" y perdió una vida).                                                                                  | Límite explícito de `x` en `[0, 760]` documentado como parte de la misma regla que caer al agua; aceptado como comportamiento fiel al género (el Frogger original tiene la misma trampa).                                              |
| El temporizador interno sin exposición visual puede confundir al jugador, que no tiene forma de saber cuánto tiempo le queda antes de perder una vida por completo.                                                                                                             | Aceptado conscientemente como decisión explícita de este spec (no tocar `RealGameState`); queda documentado como limitación conocida, no bloqueante para que el juego sea jugable.                                                     |
| Agregar soporte de skins implica más superficie de color por variante (jugador, coches, troncos, agua, carretera, mediana, nenúfares) que el precedente de Asteroids (solo nave/asteroides/power-up), con más lugares donde un color puede quedar mal definido en una variante. | Mismo patrón estructural que Asteroids (`Palette` interface + mapa `PALETTES` + `setSkin`), sin lógica nueva — solo más claves; revisión visual manual de las 3 variantes en el paso 1 del plan antes de conectar el HUD en el paso 2. |
