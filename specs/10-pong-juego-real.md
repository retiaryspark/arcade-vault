# 10 — Pong: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real: `REAL_GAMES`, `RealGameProps`/`RealGameHandle`, `GamePlayer`, `lib/scores.ts`), SPEC 05 (índice y confirmación de que `scores`/`getScores` ya son genéricos para cualquier `game_id`)
**Fecha:** 2026-09-25
**Objetivo:** Diseñar e implementar desde cero (no hay fuente en `resources/started-games/` para este género) un motor real de Pong para `pong` en `/juego/pong/jugar`, con modo 1 jugador contra CPU y modo 2 jugadores locales en el mismo teclado, soporte de skins (`clasico`/`neon`/`retro`) y leaderboard real en Supabase, siguiendo exactamente el mismo patrón técnico que Asteroids, Tetris y Arkanoid.

---

## Alcance

**Incluye:**

- Motor nuevo en TypeScript vanilla, `components/games/pong/PongGame.ts`, con el mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`/`ArkanoidGame.ts`: `constructor(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado (`Math.min((ts - last) / 1000, 0.05)`); `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió). Canvas fijo `800×600`, sin HUD de texto persistente de puntuación/vidas/nivel (eso lo sigue mostrando el HUD externo de `GamePlayer`).
- **Diseño del juego (clon de Pong desde cero, sin fuente original que portar):**
  - Dos paletas verticales de `14×90` px: Jugador 1 (izquierda, `x=30`), Jugador 2/CPU (derecha, `x=756`). Se mueven en el eje `y`, acotadas a `[0, 510]` (no salen del canvas), a `PADDLE_SPEED = 420` px/s.
  - Pelota cuadrada de `14×14` px. Velocidad base al servir: `vx0 = ±260` px/s (aleatorio hacia un lado u otro), `vy0` aleatorio en `[-180, -80] ∪ [80, 180]` px/s (evita ángulos demasiado planos o demasiado verticales). Rebota invirtiendo `vy` en paredes superior/inferior (`y<=0` o `y>=586`), y `vx` al golpear cualquiera de las dos paletas.
  - Cada rebote en una paleta multiplica `vx`/`vy` por `1.05`, con un tope de `1.6×` la velocidad base (`ACCEL = 1.05`, `MAX_SPEED_MULT = 1.6`), para que la partida se acelere sin volverse imposible de devolver.
  - Punto: la pelota sale por `x<0` (anota Jugador 2/CPU) o `x>800` (anota Jugador 1). Tras cada punto, la pelota vuelve al centro con la velocidad base y sirve hacia el lado que acaba de recibir el punto.
  - Condición de fin de partida: primero en llegar a `WINNING_SCORE = 11` puntos gana (referencia clásica de Pong; se simplifica la regla oficial de mesa de "ganar por 2 de diferencia" — ver Decisiones). Al llegar, se llama `onGameOver(finalScore)` una sola vez con el puntaje calculado según la regla de la sección "Modelo de datos".
  - Controles de 2 jugadores locales en el mismo teclado, sin conflicto: Jugador 1 (paleta izquierda, cian) usa `W`/`S`; Jugador 2 (paleta derecha, magenta) usa `ArrowUp`/`ArrowDown`.
  - Modo 1 jugador: la paleta derecha (Jugador 2) es controlada por una CPU simple que sigue la coordenada `y` de la pelota a velocidad reducida (`CPU_SPEED = 0.85 × PADDLE_SPEED = 357` px/s) con un margen de error acotado (recalcula un objetivo con un offset aleatorio de `±40` px cada `400ms`), de forma que sea vencible pero no trivial.
  - **Selección de modo:** antes del primer saque, el motor entra en un estado `"esperando-modo"` y dibuja un único texto instructivo temporal en el canvas ("1 = 1 JUGADOR (vs CPU) · 2 = 2 JUGADORES"), sin arrancar el loop de física; al presionar `Digit1`/`Digit2` (o `1`/`2`) se fija el modo y arranca la partida. Esto no es HUD de puntuación/vidas/nivel (ese sigue siendo 100% externo) — es la única excepción de texto dibujado en el canvas, exclusiva de este juego por no tener otro punto de entrada para elegir modo (`RealGameProps` no tiene un parámetro de modo; ver Decisiones).
- Mapeo de `RealGameState` para el HUD externo:
  - `score` = puntos del Jugador 1 (paleta izquierda, cian) durante la partida.
  - `lives` = puntos que le faltan al Jugador 2/CPU (paleta derecha) para ganar (`WINNING_SCORE − puntosJugador2`), empieza en `11` y baja de a uno cada vez que el rival anota — no representa vidas reales (Pong no tiene ese concepto) pero reutiliza el campo como cuenta regresiva hacia el fin de la partida (ver Decisiones).
  - `level` fijo en `1` durante toda la partida (Pong no tiene niveles/rondas en este diseño).
- **Soporte de skins obligatorio** (a diferencia de Tetris y Arkanoid, que lo dejaron fuera): el motor implementa `setSkin(skin: GameSkin)` y un mapa `PALETTES: Record<GameSkin, Palette>` interno, igual que `components/games/asteroids/AsteroidsGame.ts` (líneas ~19-38 y ~367-403: `private palette: Palette; this.palette = PALETTES[callbacks.skin ?? "clasico"]; setSkin(skin) { this.palette = PALETTES[skin]; }`). Paletas concretas:
  - `clasico`: paleta Jugador 1 y pelota en cian (`#00f5ff`), paleta Jugador 2/CPU en magenta (`#ff006e`), línea central discontinua en blanco translúcido — la paleta neón original del sitio.
  - `neon`: paleta Jugador 1 y pelota en verde (`#39ff14`), paleta Jugador 2/CPU en amarillo (`#faff00`) — mismo criterio de intercambio de acento que usa `AsteroidsGame.ts` en su skin `"neon"`.
  - `retro`: todo (ambas paletas, pelota, línea central) en ámbar monocromático (`#ffb000`) — mismo criterio de monitor CRT ámbar que usa `AsteroidsGame.ts` en su skin `"retro"`.
- Recoloreo neón por defecto (`clasico`): paleta del Jugador 1 (humano principal) y pelota en cian (`var(--cyan)`/`#00f5ff`); paleta del Jugador 2 (CPU o segundo humano) en magenta (`var(--magenta)`/`#ff006e`). Es un duelo simétrico de 2 jugadores humanos, no jugador-vs-enemigo, así que la convención elegida es "Jugador 1 = cian, Jugador 2 = magenta" en vez de "jugador = cian, enemigo = magenta" (ver Decisiones).
- Wrapper `components/games/pong/PongCanvas.tsx`: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs (mismo patrón que `AsteroidsCanvas.tsx`), listeners de teclado en `window` con `preventDefault` sobre `KeyW`, `KeyS`, `ArrowUp`, `ArrowDown`, `Digit1`, `Digit2` (guard `isTextInput`), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`, prop `skin` recibida y pasada al motor en la construcción, más un `useEffect([skin])` que llama `gameRef.current?.setSkin(skin ?? "clasico")` — igual que `AsteroidsCanvas.tsx` líneas ~64-66.
- Registro: una sola línea nueva en `components/games/registry.ts` → `"pong": PongCanvas`.
- `lib/scores.ts` (`getScores`/`saveScore`) ya es genérico por `game_id`; agregar `pong` a `REAL_GAMES` alcanza para que `/juego/pong` y la pestaña PONG de `/salon` lean el leaderboard real automáticamente, sin tocar infraestructura.

**Explícitamente fuera de alcance (no en este spec):**

- Sin audio; sin controles táctiles/móviles (solo teclado; en móvil `/juego/pong/jugar` no es jugable); sin migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sin deduplicar el ranking de `scores` por jugador; sin vincular la sesión anónima de Supabase con `lib/session-context.tsx`; no tocar `lib/scores.ts`/`lib/supabase/client.ts`/`components/GamePlayer.tsx`/`app/juego/[id]/page.tsx`/`app/salon/page.tsx`/esquema `scores`/`profiles`/RLS/índice compuesto; no convertir ningún otro juego del catálogo en real.
- Sin multijugador en red: el modo "2 jugadores" es estrictamente local, mismo teclado, mismo navegador, misma pantalla — no hay sincronización entre dispositivos.
- Sin cambiar el contrato compartido (`RealGameProps`/`RealGameHandle`/`RealGameState`) para agregar un campo de "modo" explícito: la selección de modo vive enteramente dentro del motor (prompt en canvas + teclas `1`/`2`), sin tocar `registry.ts` más allá de la línea de `REAL_GAMES`.
- Sin la regla oficial de mesa de "ganar por 2 puntos de diferencia": se simplifica a "primero en llegar a 11", igual de determinista y más simple de implementar/verificar.
- Sin columna ni tabla nueva para registrar qué modo se jugó (1 jugador vs CPU, o 2 jugadores) — `scores` sigue con las mismas columnas de siempre.
- Sin mostrar dos filas de leaderboard por partida en modo 2 jugadores (una por cada jugador): se guarda una sola fila con el puntaje del ganador, mismo flujo de "GUARDAR PUNTUACIÓN con iniciales" que ya existe en `GamePlayer`, sin tocarlo.
- Sin control por mouse: solo teclado, igual que Asteroids/Tetris/Arkanoid.
- Sin dificultad progresiva de la CPU entre partidas ni ajuste dinámico de `CPU_SPEED`: el margen de error es fijo durante todo el spec.

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

**Regla de puntuación guardada en `scores.score` (decisión central de este spec, ver también "Decisiones tomadas y descartadas"):**

- **Modo 1 jugador (vs CPU):** se guarda el puntaje propio del jugador humano al terminar la partida (gane o pierda), igual criterio que el resto de juegos reales — el humano siempre guarda su propio desempeño.
- **Modo 2 jugadores locales:** se guarda el puntaje del jugador **ganador**, codificado como `score = 100 × puntosGanador + (puntosGanador − puntosPerdedor)`. Con `WINNING_SCORE = 11` fijo, el ganador siempre termina con `11` puntos propios, así que el término `100 × puntosGanador` es constante (`1100`) y el margen (`11 − puntosPerdedor`, entre `1` y `11`) es lo que diferencia una victoria ajustada de una contundente en el leaderboard (rango final: `1101`–`1111`).

Estado interno del motor (no persistido):

```ts
// components/games/pong/PongGame.ts (interno, no exportado)
// mode: "esperando-modo" | "1p" | "2p"
// paddle1: { x: 30, y, w: 14, h: 90 }   — Jugador 1, cian
// paddle2: { x: 756, y, w: 14, h: 90 }  — Jugador 2 / CPU, magenta
// ball: { x, y, w: 14, h: 14, vx, vy }
// points1, points2: number             — arrancan en 0, WINNING_SCORE = 11
// cpu: { targetY, errorTimer }         — solo relevante si mode === "1p"
```

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  "pong": PongCanvas, // nuevo
};
```

`pong` reutiliza `RealGameProps`/`RealGameHandle`/`RealGameState` de SPEC 04 sin cambios de interfaz.

---

## Plan de implementación

1. **Motor de Pong (ambos modos + skins).** Crear `components/games/pong/PongGame.ts` con el estado `"esperando-modo"` (prompt de texto + espera de `Digit1`/`Digit2`), las dos paletas, la física de la pelota (rebotes, aceleración por golpe, reinicio de saque tras punto), el marcador (`points1`/`points2`, `WINNING_SCORE = 11`), la CPU simple del modo 1 jugador, y el mapa `PALETTES`/`setSkin(skin)` con las 3 variantes (`clasico`/`neon`/`retro`) descritas en el Alcance. Loop propio con `dt` acotado; `onStateChange({score, lives, level})` deduplicado según el mapeo definido (`score` = puntos J1, `lives` = `11 − puntosJ2`, `level` fijo en `1`); `onGameOver(finalScore)` una sola vez al llegar a `WINNING_SCORE`, con `finalScore` calculado según la regla de "Modelo de datos" (propio en 1P, codificado del ganador en 2P); `forceGameOver()` aplica la misma regla usando el marcador parcial en el momento del corte (con el jugador de más puntos como "ganador"; empate técnico se resuelve a favor de Jugador 1). Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/pong/PongCanvas.tsx` copiando el patrón de `AsteroidsCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado (`KeyW`, `KeyS`, `ArrowUp`, `ArrowDown`, `Digit1`, `Digit2`) con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`, prop `skin` pasada al constructor y sincronizada con `setSkin` en un `useEffect([skin])`. Agregar `"pong": PongCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/pong/jugar` muestra el prompt de selección de modo; presionar `1` arranca una partida contra CPU jugable con `W`/`S`; el HUD externo (Puntuación/Vidas/Nivel) refleja el mapeo definido; cambiar de skin en el selector recolorea paletas/pelota/línea central sin reiniciar la partida.
3. **Verificar el modo 2 jugadores y el fin de partida.** Recargar `/juego/pong/jugar`, presionar `2`, y jugar una partida completa con ambos jugadores en el mismo teclado (`W`/`S` vs `ArrowUp`/`ArrowDown`) hasta que alguno llegue a 11. Confirmar que PAUSA congela ambas paletas y la pelota, que REANUDAR continúa exactamente donde quedó, que FIN (`forceGameOver`) termina la partida al instante con el marcador parcial vigente, y que llegar a 11 abre el modal de fin de juego estándar con el `finalScore` codificado (`1100`–`1111`) en vez del `11` literal. Verificación: recorrido manual de una partida completa en cada modo sin errores en consola; las teclas de control no hacen scroll de la página.
4. **Verificar leaderboard real (sin cambios de código).** Jugar y guardar una puntuación en modo 1 jugador, y otra en modo 2 jugadores; usar `mcp__supabase__execute_sql` (`select * from scores where game_id = 'pong'`) para confirmar que ambas filas se insertaron con `user_id` real, iniciales tecleadas, y el `score` correspondiente a la regla de cada modo (marcador propio en 1P, marcador codificado del ganador en 2P). Confirmar que `/juego/pong` y la pestaña PONG de `/salon` muestran ese leaderboard real (y el estado vacío cuando aún no hay filas), sin la fila "TU MEJOR MARCA" (comportamiento genérico ya existente). Verificación: ambas filas aparecen correctamente en ambas pantallas; `npm run lint` sin errores; salir a mitad de partida o navegar a otro juego no deja errores en consola ni loops corriendo de fondo.

---

## Criterios de aceptación

- [ ] `/juego/pong/jugar` muestra un prompt inicial para elegir modo (`1` = 1 jugador vs CPU, `2` = 2 jugadores locales) antes de que arranque cualquier física.
- [ ] En modo 1 jugador, la paleta derecha es controlada por una CPU que sigue la pelota con velocidad limitada y margen de error, vencible pero no trivial.
- [ ] En modo 2 jugadores, Jugador 1 se mueve con `W`/`S` y Jugador 2 con `ArrowUp`/`ArrowDown`, sin conflicto de teclas entre ambos.
- [ ] La pelota rebota en paredes superior/inferior y en ambas paletas, acelerando levemente (hasta el tope definido) en cada rebote de paleta, y se reinicia al centro tras cada punto.
- [ ] La partida termina cuando un jugador llega a 11 puntos, y `FIN` (botón externo) también termina la partida al instante con el marcador parcial vigente.
- [ ] La paleta y pelota del Jugador 1 se ven en cian; la paleta del Jugador 2/CPU en magenta (skin `clasico`); cambiar a `neon`/`retro` recolorea ambas paletas, la pelota y la línea central según lo documentado, sin reiniciar la partida en curso.
- [ ] El HUD externo del reproductor refleja el mapeo definido: Puntuación = puntos del Jugador 1, Vidas = puntos que le faltan al Jugador 2/CPU para ganar, Nivel fijo en 1.
- [ ] PAUSA congela ambas paletas y la pelota por completo; REANUDAR continúa exactamente donde quedó.
- [ ] GUARDAR PUNTUACIÓN en modo 1 jugador guarda el puntaje propio del humano; en modo 2 jugadores guarda el puntaje codificado del ganador (`100 × puntosGanador + margen`), verificable con una consulta directa a `scores`.
- [ ] `/juego/pong` y la pestaña PONG de `/salon` muestran el leaderboard real de `pong` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Ninguna de las teclas de control (`W`, `S`, `ArrowUp`, `ArrowDown`, `Digit1`, `Digit2`) hace scroll de la página mientras se juega.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** diseñar el motor de Pong desde cero. **No:** buscar o inventar una fuente en `resources/started-games/`. Motivo: `Glob resources/started-games/*` confirma que solo existen `02-asteroids`, `03-tetris` y `04-arkanoid` — no hay `game.js` de Pong/versus para portar; este es un clon fiel del género, no una migración de balance existente.
- **Sí:** regla de puntuación dividida por modo — puntaje propio del humano en 1 jugador, puntaje del ganador codificado (`100 × puntosGanador + margen`) en 2 jugadores. **No:** guardar siempre "los puntos del ganador" sin codificar, ni guardar siempre el marcador combinado de ambos jugadores en un solo número ambiguo. Motivo: con `WINNING_SCORE` fijo en 11, el ganador siempre termina con exactamente 11 puntos propios — guardar ese número tal cual haría que todas las entradas del leaderboard de 2 jugadores empataran en "11", sin ranking real; codificar el margen de victoria mantiene un único entero (sin tocar el esquema de `scores`) y sí diferencia una goleada de una partida ajustada. En 1 jugador, en cambio, el propio puntaje del humano ya varía naturalmente según qué tan lejos llegó contra la CPU, igual que en el resto de los juegos reales, así que no hace falta codificarlo.
- **Sí:** condición de fin de partida "primero a 11 puntos" (referencia clásica de Pong). **No:** límite de tiempo, ni la regla oficial de mesa de "ganar por 2 de diferencia". Motivo: un marcador fijo es más simple de verificar y de razonar para la codificación del puntaje guardado; un límite de tiempo introduciría un `setTimeout`/reloj adicional sin aportar claridad, y "ganar por 2" puede alargar partidas indefinidamente en un clon simple.
- **Sí:** Jugador 1 (izquierda) en cian, Jugador 2/CPU (derecha) en magenta — convención "jugador 1 = cian, jugador 2 = magenta" en vez de "jugador = cian, enemigo = magenta". **No:** dejar ambas paletas del mismo color, ni recolorear según quién gana. Motivo: es un duelo simétrico de 2 humanos (o humano vs CPU), no hay "enemigo" real; una convención de lado fijo (izquierda/derecha) es más legible que intentar mapear "quién es el jugador" cuando ambos lo son.
- **Sí:** pelota en cian en el skin `clasico`. **No:** pelota en un tercer color neutro (blanco, amarillo) ni en magenta. Motivo: la pelota es el elemento compartido/neutro del duelo, no pertenece a ningún jugador; cian ya es el acento primario del sitio (y coincide con `color: "cyan"` de la entrada `pong` en `lib/data.ts`), así que reutilizarlo evita introducir un tercer color a la paleta del juego.
- **Sí:** soporte completo de skins (`setSkin`/`PALETTES`, 3 variantes) igual que Asteroids. **No:** dejarlo fuera de alcance como hicieron Tetris y Arkanoid. Motivo: pedido explícito de este spec para alinear `pong` con el patrón ya implementado en Asteroids en vez de sumar un tercer juego real sin skins; el mapa de paletas es una tabla de colores por elemento (paletas/pelota/línea central), de complejidad comparable a la de Asteroids, no un trabajo grande adicional.
- **Sí:** selección de modo (1 jugador / 2 jugadores) resuelta enteramente dentro del motor, con un prompt de texto único en el canvas antes del primer saque y las teclas `1`/`2`. **No:** agregar un campo `mode` a `RealGameProps`/`RealGameHandle`, ni un selector de modo en `GamePlayer.tsx` o en la pantalla de detalle del juego. Motivo: el contrato compartido de `registry.ts` es infraestructura genérica reutilizada por los demás juegos reales; agregarle un campo específico de Pong para un solo juego rompería la regla de "único punto de integración = una línea en `REAL_GAMES`". Un prompt de texto único (no un HUD persistente) es la única forma de resolverlo sin tocar esa interfaz compartida.
- **Sí:** reutilizar `lib/scores.ts`/`REAL_GAMES`/`GamePlayer` sin cambios, una sola línea nueva en `REAL_GAMES`. **No:** tocar la infraestructura genérica ni agregar una columna para registrar el modo jugado. Motivo: SPEC 04/05 ya la dejaron genérica por `game_id`; el modo jugado no es un dato que el resto del sitio necesite mostrar o filtrar hoy, así que no justifica una migración de esquema.
- **Sí:** `lives` del HUD externo repurposeado como "puntos que le faltan al Jugador 2/CPU para ganar" (cuenta regresiva de 11 a 0). **No:** dejarlo fijo en un valor constante decorativo. Motivo: a diferencia de Arkanoid (sin concepto de vidas, donde fijarlo sería lo más simple), Pong sí tiene un número natural que decrece hacia el fin de la partida — reutilizar `lives` como esa cuenta regresiva le da información real y útil al jugador en el HUD existente, en vez de mostrar un número inerte.
- **Sí:** solo teclado, sin controles táctiles/mouse/audio; solo local, sin red. **No:** agregar controles en pantalla, sonido de rebote, o sincronización entre dispositivos. Motivo: ningún juego real del catálogo tiene audio ni controles táctiles hoy; multijugador en red es una categoría de trabajo completamente distinta (señalización, estado compartido en servidor) fuera del alcance de "juego real con leaderboard" que cubre este spec.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El prompt de selección de modo dibujado en el canvas es la única excepción de texto persistente en un juego real del catálogo; podría interpretarse como HUD.                                                   | Se limita a un único mensaje temporal antes del primer saque, sin puntuación/vidas/nivel dibujados; desaparece apenas arranca la partida. Documentado explícitamente en Alcance/Decisiones para que quede claro que no es un HUD alternativo. |
| Codificar el puntaje del ganador (`100 × puntosGanador + margen`) es menos intuitivo a simple vista que un número de puntos directo (ej. "1108" en vez de "11-3").                                              | Aceptado conscientemente: es un único entero dentro del esquema `scores` ya existente (sin columnas nuevas) y produce un ranking real; el criterio queda documentado en el spec para quien lea el leaderboard más adelante.                   |
| La CPU del modo 1 jugador puede resultar demasiado fácil o demasiado difícil una vez jugada de verdad, ya que sus parámetros (`CPU_SPEED`, margen de error, intervalo de recálculo) son una estimación inicial. | Los valores (`0.85× PADDLE_SPEED`, error `±40px` cada `400ms`) quedan como constantes nombradas fáciles de ajustar en un paso posterior si el balance no calza al jugarlo; no bloquea que el juego sea real y jugable.                        |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners si el cleanup no cancela todo.                                             | Copiar el patrón ya probado de `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 2.                   |
| En móvil `/juego/pong/jugar` no es jugable (solo teclado, y el modo 2 jugadores además requiere un teclado físico compartido).                                                                           | Aceptado y documentado como fuera de alcance, igual que en Asteroids/Tetris/Arkanoid.                                                                                                                                                     |
