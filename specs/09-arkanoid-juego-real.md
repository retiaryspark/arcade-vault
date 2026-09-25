# 09 — Arkanoid: juego real jugable

**Estado:** Draft
**Depende de:** SPEC 02 (esquema `scores` + cliente Supabase), SPEC 04 (patrón de juego real: `REAL_GAMES`, `RealGameProps`/`RealGameHandle`, `GamePlayer`, `lib/scores.ts`), SPEC 05 (índice y confirmación de que `scores`/`getScores` ya son genéricos para cualquier `game_id`)
**Fecha:** 2026-09-22

**Objetivo:** Portar el clon de Arkanoid de `resources/started-games/04-arkanoid/game.js` a un motor real y jugable en `/juego/arkanoid/jugar`, con los mismos 5 niveles, física y puntuación del original, siguiendo exactamente el mismo patrón técnico que Asteroids y Tetris (motor TS + wrapper React + una línea en `REAL_GAMES`), sin tocar la infraestructura de leaderboard ya genérica.

---

## Alcance

**Incluye:**

- Motor del juego portado a TypeScript en `components/games/arkanoid/ArkanoidGame.ts`, con la misma física, balance y puntuación del original (`game.js` + `levels.js`):
  - Paleta `81×14` en `y=560`, movida con `ArrowLeft`/`ArrowRight` a `PADDLE_SPEED = 400` px/s, acotada a los bordes del canvas.
  - Pelota `16×16`, velocidad base `vx=200, vy=-300` multiplicada por el `speed` de cada nivel (`1.00, 1.10, 1.21, 1.33, 1.46`), rebote reflejando `vx`/`vy` en paredes izquierda/derecha/superior y en la paleta (siempre invierte `vy` a negativo, sin ángulo por punto de impacto — igual que el original).
  - 5 niveles fijos (`LEVELS` de `levels.js`, grilla de `10×6` bloques de `64×24`), cada uno con su propio patrón de bloques (`l1`…`l5`, filas completas / pirámide / diagonal / con huecos / marco+cruz) y multiplicador de velocidad. Al romper el último bloque vivo de un nivel, avanza al siguiente (`loadLevel`); al limpiar el nivel 5, termina la partida (ver "Fin de partida" más abajo).
  - Colisión bloque–pelota: un solo bloque por frame (`break`), `score += 10`, se invierte `vy`.
  - Pérdida de pelota: `ball.y > canvas.height` resta 1 vida; con `lives > 0` reaparece la pelota centrada sobre la paleta (`initBall`); con `lives === 0` termina la partida.
  - Vidas: arrancan en 3, son globales a toda la partida (no se resetean por nivel), igual que el original.
- Motor con el mismo contrato técnico que `AsteroidsGame.ts`/`TetrisGame.ts`: `constructor(canvas, callbacks: RealGameProps)`; `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`); loop propio por `requestAnimationFrame` con `dt` acotado; `onStateChange({score, lives, level})` deduplicado (solo emite cuando algún valor cambió). El canvas no dibuja HUD de texto (PUNTUACIÓN/VIDAS/NIVEL): eso lo sigue mostrando el HUD externo de `GamePlayer`.
- Canvas fijo `800×600`, dibujado con formas vectoriales (rectángulos para paleta/bloques, círculo para la pelota) en vez de cargar el spritesheet PNG del original — mismo enfoque que `AsteroidsGame.ts`/`TetrisGame.ts`, que tampoco usan imágenes.
- Recoloreado a la paleta neón del sitio: paleta y pelota (lo que controla el jugador) en cian (`#00f5ff`, `var(--cyan)`); todos los bloques (sin importar su color original por nivel) en magenta (`#ff006e`, `var(--magenta)`). El patrón de cada nivel se sigue distinguiendo por la disposición de los bloques, no por color.
- Animación de explosión al romper un bloque: partícula vectorial que se desvanece/encoge en el punto del bloque roto durante `150ms` (mismo `EXPLOSION_DURATION` que el original), en magenta — reemplaza los 4 frames de sprite del original por un efecto dibujado, mismo criterio que las partículas de explosión de `AsteroidsGame.ts`.
- **Fin de partida:** al agotar las 3 vidas (`lives === 0`) o al limpiar el bloque final del nivel 5, se llama `onGameOver(score)` una sola vez (ambos casos terminan la partida igual; no hay pantalla de "¡Completaste el juego!" separada — el modal de fin de partida ya existente en `GamePlayer` es el mismo para ambos, como en Asteroids/Tetris).
- Wrapper de React `components/games/arkanoid/ArkanoidCanvas.tsx` (`"use client"`, `forwardRef<RealGameHandle, RealGameProps>`), copiando el patrón de `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`: callbacks guardados en refs, listeners `window` de `keydown`/`keyup` con `preventDefault` sobre `ArrowLeft`/`ArrowRight` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause`/`resume`/`forceGameOver`. La PAUSA la sigue controlando el botón externo de `GamePlayer`, no una tecla del motor.
- Registro: una línea nueva en `components/games/registry.ts` → `"arkanoid": ArkanoidCanvas`. Único punto de integración.

**Explícitamente fuera de alcance (no en este spec):**

- Cualquier cambio a la infraestructura genérica ya existente, que **no se toca**: `lib/scores.ts` (`getScores`/`saveScore`), `lib/supabase/client.ts`, `components/GamePlayer.tsx`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx`, el esquema `scores`/`profiles`, sus políticas RLS, y el índice `(game_id, score desc)`. Al agregar `arkanoid` a `REAL_GAMES`, el detalle y el Salón leen su leaderboard real automáticamente, y el reproductor guarda con `saveScore("arkanoid", …)` sin cambios.
- Control por mouse (el original mueve la paleta con `mousemove` además de teclado): se porta **solo** el control por teclado (`ArrowLeft`/`ArrowRight`), igual que Asteroids/Tetris no usan mouse. El canvas escalado por CSS tampoco tiene coordenadas de mouse fiables fuera del tamaño físico 800×600.
- El overlay de PAUSA del original con botones de "saltar al nivel" (clic para ir directo a un nivel 1–5): la PAUSA ya la centraliza `GamePlayer` (botón externo, `pause()/resume()`), sin overlay ni selector de nivel dibujado en el canvas — mismo criterio que Tetris con la tecla `P` original.
- Spritesheet/imágenes (`assets/spritesheet-breakout.png`) y sonido (`assets/sounds/*.mp3`): el sitio no usa audio en ningún juego real, y el motor se dibuja con formas vectoriales como los otros dos juegos reales.
- Soporte de skins (`GameSkin`/`SKINS` de `components/games/registry.ts`, hoy solo implementado en `AsteroidsGame.ts`): `arkanoid` sigue el mismo estado que `tetris` (sin variantes de color todavía); queda como trabajo futuro auditado por el agente `skin-designer`, no de este spec.
- Controles táctiles/móviles: solo teclado; en móvil `/juego/arkanoid/jugar` no es jugable.
- Cambiar el balance o las reglas del original (velocidades, multiplicador de velocidad por nivel, puntuación `+10` por bloque, diseño de los 5 niveles): se preserva tal cual.
- Migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sigue siendo contenido fijo.
- Deduplicar el ranking de `scores` por jugador.
- Vincular la sesión anónima de Supabase con `lib/session-context.tsx`.
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
// components/games/arkanoid/ArkanoidGame.ts (interno, no exportado)
// paddle: { x, y: 560, w: 81, h: 14 }
// ball: { x, y, w: 16, h: 16, vx, vy }
// blocks: { x, y, w: 64, h: 24, alive }[]   — sin campo color, todo se dibuja en magenta
// explosions: { x, y, w, h, elapsed }[]     — elapsed en ms contra EXPLOSION_DURATION = 150
// score, lives (arranca en 3), level (1..5)
```

`arkanoid` reutiliza la interfaz compartida de SPEC 04 sin cambios. `RealGameState` no gana ningún campo nuevo: `level` ya existe y mapea 1:1 a `currentLevel`.

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  tetris: TetrisCanvas,
  "arkanoid": ArkanoidCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Motor de Arkanoid portado.** Crear `components/games/arkanoid/ArkanoidGame.ts` con toda la lógica de `resources/started-games/04-arkanoid/game.js` + `levels.js` (`initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update`, la tabla `LEVELS` con sus 5 patrones de bloques y multiplicadores de velocidad), recibiendo el canvas por parámetro (sin `document.getElementById`), dibujando con formas vectoriales (paleta y pelota en cian, bloques y explosiones en magenta), sin dibujar HUD de texto ni overlays de pausa/nivel. Loop propio con `dt` en segundos acotado (p. ej. `Math.min((ts - last) / 1000, 0.05)`, igual que Asteroids). Expone `onStateChange({score, lives, level})` deduplicado y `onGameOver(score)` una sola vez cuando `lives` llega a 0 o se limpia el nivel 5. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Wrapper + registro.** Crear `components/games/arkanoid/ArkanoidCanvas.tsx` copiando el patrón de `TetrisCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado (`ArrowLeft`/`ArrowRight`) con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`. Agregar `"arkanoid": ArkanoidCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/arkanoid/jugar` es Arkanoid real y jugable con teclado; el HUD externo (Puntuación/Vidas/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; los demás juegos siguen idénticos.
3. **Verificar leaderboard real (sin cambios de código).** Jugar una partida de Arkanoid hasta el fin (perder las 3 vidas, o limpiar el nivel 5) y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'arkanoid'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/arkanoid` y la pestaña ARKANOID de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), y que la fila "TU MEJOR MARCA" no aparece (comportamiento genérico ya existente cuando `hasRealScores`). Verificación: la fila aparece en la tabla y en ambas pantallas; `npm run lint` sin errores; recorrido manual completo sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/arkanoid/jugar` es Arkanoid real y jugable con teclado: mover la paleta con `ArrowLeft`/`ArrowRight`, la pelota rebota en paredes/paleta/bloques con la física del original.
- [ ] Los 5 niveles del original aparecen en orden, con el mismo patrón de bloques (`l1`…`l5`) y el mismo multiplicador de velocidad (`1.00, 1.10, 1.21, 1.33, 1.46`) por nivel.
- [ ] La puntuación coincide con el original: `+10` por bloque roto, un solo bloque destruido por frame.
- [ ] La paleta y la pelota se ven en cian; los bloques y la animación de explosión al romperlos, en magenta.
- [ ] Todo se dibuja en un único `<canvas width={800} height={600}>` con formas vectoriales, sin cargar el spritesheet ni sonido del original; el canvas no dibuja el texto de PUNTUACIÓN/VIDAS/NIVEL ni overlays de pausa/selector de nivel.
- [ ] El HUD externo del reproductor refleja el estado real (Puntuación, Vidas, Nivel).
- [ ] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] Perder la última vida o limpiar el nivel 5 termina la partida y abre el mismo modal de fin de juego, con la puntuación final correcta.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'arkanoid'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/arkanoid` y la pestaña ARKANOID de `/salon` muestran el leaderboard real de `arkanoid` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` donde corresponda.
- [ ] Las flechas no hacen scroll de la página mientras se juega Arkanoid.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** portar `game.js` + `levels.js` conservando física, balance, puntuación y los 5 niveles tal cual. **No:** rediseñar niveles o rebalancear velocidades. Motivo: hay fuente real en `resources/started-games/04-arkanoid/`; portar preserva el balance ya jugado, igual que Asteroids y Tetris.
- **Sí:** dibujar paleta/pelota/bloques/explosiones con formas vectoriales (rectángulos, círculo, partícula que se desvanece). **No:** cargar `assets/spritesheet-breakout.png` ni `assets/spritesheet.js`. Motivo: ni `AsteroidsGame.ts` ni `TetrisGame.ts` usan imágenes; mantener el mismo enfoque evita importar assets nuevos y sonido acoplado al spritesheet original.
- **Sí:** paleta y pelota en cian (lo que controla el jugador), todos los bloques y sus explosiones en magenta (el objetivo/obstáculo). **No:** conservar los 6-7 colores originales por bloque (`red/yellow/cyan/magenta/hotpink/green/gray`). Motivo: mismo criterio que Tetris (8 colores de pieza → cian/magenta); el patrón de cada nivel se sigue leyendo por la disposición de los bloques, no por su color.
- **Sí:** solo control por teclado (`ArrowLeft`/`ArrowRight`). **No:** portar el control por mouse (`mousemove`) del original. Motivo: ni Asteroids ni Tetris usan mouse; mantiene consistencia de controles entre los 3 juegos reales y evita depender de coordenadas de mouse sobre un canvas escalado por CSS.
- **Sí:** eliminar el overlay de pausa con selector de nivel (clic para saltar a un nivel 1–5) del original. **No:** portarlo tal cual. Motivo: la PAUSA ya la centraliza `GamePlayer` (botón externo `pause()/resume()`) para los 3 juegos reales; un selector de nivel dibujado en el canvas sería una herramienta de debug del original, no parte del juego para el jugador final.
- **Sí:** perder la última vida y limpiar el nivel 5 llaman ambos a `onGameOver(score)` una sola vez, mismo modal de fin de partida. **No:** un estado "win" separado con su propia pantalla ("¡Completaste el juego!"). Motivo: `RealGameHandle`/`RealGameProps` no distinguen victoria de derrota (tampoco lo hacen Asteroids ni Tetris); agregar ese concepto tocaría la interfaz compartida, fuera de alcance.
- **Sí:** sin soporte de skins en este spec (mismo estado que `tetris` hoy). **No:** implementar `setSkin`/paletas alternativas como ya tiene `AsteroidsGame.ts`. Motivo: skins no es parte del patrón base de SPEC 04/06 (fue agregado después, solo a Asteroids, sin spec propio); queda para una auditoría/spec futuro del agente `skin-designer`, no bloquea que el juego sea real y jugable.
- **Sí:** reutilizar `lib/scores.ts`/`REAL_GAMES`/`GamePlayer` sin cambios, una sola línea nueva en `REAL_GAMES`. **No:** tocar la infraestructura genérica. Motivo: SPEC 04/05 ya la dejaron genérica por `game.id`; agregar `arkanoid` al mapa basta para que guardado y ambos leaderboards funcionen.
- **Sí:** solo teclado, sin controles táctiles/audio. **No:** agregar botones en pantalla para móvil ni portar los efectos de sonido. Motivo: ningún juego real del catálogo tiene audio ni controles táctiles hoy; consistente con Asteroids/Tetris.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recolorear cada bloque a un único magenta (en vez de sus 6-7 colores originales) puede volver menos legibles algunos niveles con patrones sutiles (ej. `l3` diagonal, `l5` marco+cruz). | Revisión visual manual de los 5 niveles en el paso 1 antes de conectar el HUD en el paso 2; si un patrón resulta ilegible en un solo color, ajustar opacidad/borde, no el layout.                         |
| Reemplazar el spritesheet por formas vectoriales cambia el aspecto visual de paleta/pelota/bloques respecto al original (que usaba sprites detallados).                                 | Aceptado conscientemente, mismo criterio ya usado en Asteroids y Tetris (tampoco usan sprites); el sitio prioriza consistencia visual entre los 3 juegos reales sobre fidelidad pixel-a-pixel al original. |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners si el cleanup no cancela todo.                     | Copiar el patrón ya probado de `TetrisCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 2.     |
| En móvil `/juego/arkanoid/jugar` no es jugable (solo teclado, sin el control por mouse del original).                                                                              | Aceptado y documentado como fuera de alcance, igual que en Asteroids/Tetris.                                                                                                                               |
