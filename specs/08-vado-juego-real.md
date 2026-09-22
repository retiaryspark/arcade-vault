# 08 — Vado: motor real de planificación por turnos

**Estado:** Aprobado
**Depende de:** SPEC 07 (alta de VADO al catálogo mock), SPEC 04 (patrón `REAL_GAMES`/`RealGameProps`/`RealGameHandle`/`GamePlayer`), SPEC 05 (índice y confirmación de que `scores`/`getScores` ya son genéricos por `game_id`)
**Fecha:** 2026-09-20

**Objetivo:** Portar VADO a un motor real de puzzle de planificación por turnos en `/juego/vado/jugar` (`components/games/vado/VadoGame.ts` + `VadoCanvas.tsx` + una línea en `REAL_GAMES`), con leaderboard real vía la infraestructura genérica ya existente, siguiendo el mismo contrato técnico que Asteroids/Caída.

---

## Alcance

**Incluye:**

- Motor original en TypeScript, `components/games/vado/VadoGame.ts` — **diseño propio, sin `game.js` fuente en `resources/started-games/`** (a diferencia de Asteroids/Caída, VADO es un concepto nuevo del jam, no un port). Mecánica:
  - **Tablero:** grilla fija de 7 columnas; filas = `5 + floor((nivel - 1) / 2)`, con tope de 9 filas. Fila inferior = salida, fila superior = meta. Las filas intermedias son "franjas de peligro".
  - **Ciclo de peligro determinista y visible:** cada franja de peligro tiene un patrón cíclico propio de período `T` (entre 3 y 6 turnos), generado con una semilla derivada de `(nivel, índice de franja)` — mismo nivel siempre produce el mismo tablero. Cada franja garantiza al menos una "ventana segura" (turnos sin celda peligrosa en la columna del jugador) dentro de su ciclo, para que el nivel sea siempre resoluble. El estado del ciclo (qué celdas están activas en cada turno futuro) se dibuja en el tablero desde el primer instante — no hay nada oculto ni aleatorio en tiempo real.
  - **Dos fases de juego:** `planning` (el jugador arma una cola de movimientos sin límite de tiempo) y `executing` (el motor reproduce la cola automáticamente, un movimiento por turno, a ritmo fijo de 400 ms).
  - **Recurso limitado — presupuesto de movimientos:** `presupuesto = filas_del_nivel + 4`. Cada movimiento en cola (incluido "esperar en el lugar") consume una unidad del presupuesto; la cola no puede exceder el presupuesto.
  - **Controles en `planning`:** flechas mueven/agregan un paso a la cola (arriba/abajo/izquierda/derecha), `KeyW`/tecla de espera agrega "esperar", `Backspace` deshace el último paso agregado (gratis), `KeyR` vacía toda la cola (gratis, replanificación completa). `Enter`/`Space` inicia la ejecución (`executing`) si la cola tiene al menos un movimiento.
  - **Resultado de una ejecución:** si en algún turno la celda del jugador coincide con una celda de peligro activa, la ejecución se corta ahí, el motor resta 1 a `lives` y vuelve a `planning` sobre el mismo tablero (mismo nivel, mismo ciclo) para reintentar. Si la ficha llega a la fila meta sin colisión, el nivel se resuelve: `score += 200 * nivel + 15 * (presupuesto - movimientos_usados)`, `level += 1`, se genera el siguiente tablero y se vuelve a `planning`.
  - **Vidas:** `lives` arranca en 3, es global a toda la partida (no se resetea por nivel), solo baja con una ejecución fallida. `forceGameOver()`/`lives === 0` termina la partida.
  - Loop propio por `requestAnimationFrame` con `dt` acotado (usado solo para el temporizador de 400 ms/turno durante `executing`; en `planning` no hay avance de tiempo real, coherente con "sin reflejos").
- Recoloreado neón: ficha del jugador y la cola de movimientos planificados (previsualizada como una línea de puntos sobre el tablero) en amarillo (`var(--yellow)`, color de identidad del juego); celdas de peligro activas en magenta (`var(--magenta)`, misma convención de "amenaza" que Asteroids/Caída); celda(s) de meta con borde cian (`var(--cyan)`), marcando el objetivo. Fondo negro con grilla tenue, igual que el resto del catálogo.
- El canvas dibuja internamente el tablero, la ficha, la cola planificada y el indicador de ciclo de cada franja de peligro (igual que Caída dibuja internamente su preview de "siguiente pieza"). El canvas **no** dibuja texto de PUNTUACIÓN/VIDAS/NIVEL — eso sigue siendo el HUD externo de `GamePlayer`, alimentado por `onStateChange({score, lives, level})` deduplicado.
- Mismo contrato técnico que `AsteroidsGame.ts`/`CaidaGame.ts`: `constructor(canvas, callbacks: RealGameProps)`, `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()`, `forceGameOver()`, `destroy()`. Canvas fijo `800×600`.
- Wrapper `components/games/vado/VadoCanvas.tsx` (`"use client"`, `forwardRef<RealGameHandle, RealGameProps>`), copiando el patrón de `CaidaCanvas.tsx`: listeners de `window` (`keydown`/`keyup`) con `preventDefault` sobre el set de control (flechas, `Enter`, `Space`, `Backspace`, `KeyR`, `KeyW`) y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`. La PAUSA la sigue controlando el botón externo de `GamePlayer`, no una tecla del motor.
- Una sola línea nueva en `components/games/registry.ts`: `vado: VadoCanvas`. Único punto de integración.
- Leaderboard real vía la infraestructura ya genérica: `lib/scores.ts` (`getScores`/`saveScore`), esquema `scores`/`profiles`, índice `(game_id, score desc)` (SPEC 05) — **sin tocarlos**. Al agregar `vado` a `REAL_GAMES`, `/juego/vado` y la pestaña VADO de `/salon` leen su leaderboard real automáticamente, y GUARDAR PUNTUACIÓN llama a `saveScore("vado", …)` sin cambios de infraestructura.

**Explícitamente fuera de alcance (no en este spec):**

- Cualquier cambio a `RealGameProps`/`RealGameHandle`/`REAL_GAMES` (la forma de la interfaz), `lib/scores.ts`, `lib/supabase/client.ts`, `components/GamePlayer.tsx`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx`, el esquema `scores`/`profiles`, sus políticas RLS o el índice de SPEC 05. Ya son genéricos por `game.id` desde SPEC 04/05.
- Un campo de "presupuesto de movimientos" en `RealGameState`: ese contador se dibuja dentro del canvas (junto al tablero), no en el HUD externo — igual que Caída no agregó un campo de "líneas" a `RealGameState`.
- Sonido / efectos de audio.
- Controles táctiles / móviles: solo teclado; en móvil `/juego/vado/jugar` no es jugable.
- Generación de tablero verdaderamente aleatoria o peligro no telegrafiado: el ciclo de cada franja siempre es visible y determinista desde el primer instante del nivel — es el requisito central del ángulo PUZZLE asignado.
- Migrar `GAMES` a Supabase, deduplicar el ranking de `scores`, vincular la sesión anónima con `lib/session-context.tsx`.
- Convertir cualquier otro juego aún simulado en jugable real.

---

## Modelo de datos

No se agregan columnas ni tablas nuevas. `public.scores` ya existe (SPEC 02) y es genérico por `game_id`, confirmado por SPEC 05:

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
// components/games/vado/VadoGame.ts (interno, no exportado)
type Phase = "planning" | "executing" | "solved" | "failed";
type Move = "up" | "down" | "left" | "right" | "wait";

// board: por franja, período T y patrón de celdas activas por turno (derivado de una semilla por nivel)
// player: { row: number; col: number }
// queue: Move[]           — cola planificada, longitud <= presupuesto
// budget: number          — filas_del_nivel + 4
// turnCursor: number      — turno actual durante `executing`
// phase: Phase
// score, lives, level
```

```ts
// components/games/registry.ts — única línea nueva
export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  caida: CaidaCanvas,
  vado: VadoCanvas, // nuevo
};
```

---

## Plan de implementación

1. **Generador de tablero + fase `planning`.** Crear `components/games/vado/VadoGame.ts` con la generación determinista de franjas de peligro por nivel (semilla por `(nivel, índice de franja)`, ventana segura garantizada por ciclo), el estado `board`/`player`/`queue`/`budget`, y el manejo de `handleKeyDown` en fase `planning` (flechas agregan movimiento, `Backspace` deshace, `KeyR` vacía la cola, `Enter`/`Space` pasa a `executing` si `queue.length > 0`). Dibuja el tablero, la ficha, la cola planificada (línea de puntos amarilla) y el indicador de ciclo de cada franja, sin texto de HUD. Verificación: ninguna todavía (sin UI conectada); `npm run lint` limpio sobre el archivo nuevo.
2. **Fase `executing` + resultado.** Implementar el avance automático de la cola a 400 ms/turno dentro del loop por `requestAnimationFrame` (`dt` acotado), la detección de colisión contra el ciclo de peligro activo en cada turno, y las dos ramas de resultado: fallo (`lives -= 1`, vuelve a `planning` sobre el mismo tablero) y éxito (`score += 200*nivel + 15*(presupuesto - movimientos_usados)`, `level += 1`, nuevo tablero, vuelve a `planning`). `onStateChange({score, lives, level})` deduplicado; `onGameOver(score)` una sola vez cuando `lives` llega a 0. `pause()`/`resume()` congelan/continúan el temporizador de turno; `forceGameOver()` termina la partida al instante. Verificación: ninguna todavía (sin UI conectada).
3. **Wrapper + registro.** Crear `components/games/vado/VadoCanvas.tsx` copiando el patrón de `CaidaCanvas.tsx`: `<canvas width={800} height={600}>` escalado por CSS, motor instanciado en `useEffect` con deps vacías vía refs de callbacks, listeners `window` de teclado (flechas, `Enter`, `Space`, `Backspace`, `KeyR`, `KeyW`) con `preventDefault` y guard `isTextInput`, cleanup que quita listeners y llama `destroy()`, `useImperativeHandle` con `pause`/`resume`/`forceGameOver`. Agregar `vado: VadoCanvas` a `REAL_GAMES` en `components/games/registry.ts`. Verificación: `/juego/vado/jugar` es VADO real y jugable con teclado —planificar una cola, ejecutarla, ver el resultado (fallo con retorno a planificación, o avance de nivel)—; el HUD externo (Puntuación/Vidas/Nivel) refleja el estado real; PAUSA congela y REANUDAR continúa; FIN abre el modal de fin de juego; los demás juegos siguen idénticos.
4. **Verificar leaderboard real (sin cambios de código).** Jugar hasta agotar las 3 vidas (o usar FIN) y usar GUARDAR PUNTUACIÓN; confirmar con `mcp__supabase__execute_sql` (`select * from scores where game_id = 'vado'`) que se insertó la fila con `user_id` real y las iniciales tecleadas; confirmar que `/juego/vado` y la pestaña VADO de `/salon` muestran esa puntuación real (y el estado vacío cuando aún no hay filas), sin la fila "TU MEJOR MARCA". Verificación: la fila aparece en ambas pantallas; `npm run lint` sin errores; recorrido manual sin errores en consola al salir a mitad de partida o navegar a otro juego.

---

## Criterios de aceptación

- [ ] `/juego/vado/jugar` es VADO real y jugable con teclado: fase `planning` (flechas agregan movimientos, `Backspace` deshace, `KeyR` vacía la cola) y fase `executing` (`Enter`/`Space` reproduce la cola a ritmo fijo).
- [ ] El ciclo de peligro de cada franja es visible en el tablero desde el primer instante del nivel, sin nada oculto ni generado en tiempo real durante `executing`.
- [ ] Una ejecución fallida resta 1 vida y vuelve a `planning` sobre el mismo tablero (reintento); una ejecución exitosa suma puntaje, avanza de nivel y genera un tablero nuevo.
- [ ] La ficha y la cola planificada se ven en amarillo; las celdas de peligro activas en magenta; la meta con borde cian.
- [ ] Todo se dibuja en un único `<canvas width={800} height={600}>`; el canvas no dibuja texto de PUNTUACIÓN/VIDAS/NIVEL.
- [ ] El HUD externo del reproductor refleja `score`/`lives`/`level` reales; `lives` arranca en 3 y es global a toda la partida.
- [ ] PAUSA congela el juego por completo y REANUDAR lo continúa donde quedó; FIN termina la partida al instante y abre el modal de fin de juego.
- [ ] GUARDAR PUNTUACIÓN inserta una fila real en `scores` con `game_id = 'vado'`, verificable con una consulta directa a la tabla.
- [ ] `/juego/vado` y la pestaña VADO de `/salon` muestran el leaderboard real de `vado` (con estado vacío cuando no hay filas) y no muestran la fila "TU MEJOR MARCA".
- [ ] Los otros juegos (reproductor, Detalle y Salón) no cambiaron.
- [ ] Las flechas, `Enter`, `Space` y `Backspace` no hacen scroll ni acciones del navegador mientras se juega VADO.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** presupuesto de movimientos + vidas (intentos de ejecución fallidos) como los únicos recursos limitados; sin temporizador en tiempo real durante `planning`. **No:** un reloj que corra mientras el jugador arma su plan. Motivo: mandato explícito del ángulo asignado — debe sentirse como planificación deliberada, no como reflejos bajo presión.
- **Sí:** el ciclo de peligro de cada franja es determinista, con semilla derivada del nivel, y se dibuja completo desde el primer instante. **No:** peligro aleatorio o revelado progresivamente. Motivo: el enunciado pide explícitamente un patrón "fijo o cíclico y predecible" — ocultarlo convertiría el juego en adivinanza, no en planificación.
- **Sí:** `Backspace` (deshacer último paso) y `KeyR` (vaciar la cola) son gratis durante `planning`; solo una ejecución fallida cuesta 1 vida. **No:** cobrar vida por editar el plan antes de ejecutarlo. Motivo: el "deshacer" pedido en el encargo debe vivir en la fase de planificación, que es barata por diseño; el costo real está en comprometerse a ejecutar un plan equivocado.
- **Sí:** diseño original sin `game.js` fuente en `resources/started-games/`. **No:** forzar un parecido con algún recurso existente del repo. Motivo: a diferencia de Asteroids/Caída (ports), VADO es un concepto nuevo propuesto para el jam.
- **Sí:** tablero abstracto de baldosas/franjas de peligro, sin carriles de autopista, coches, troncos ni temporizador de cruce en tiempo real. **No:** reutilizar el vocabulario visual/mecánico de Ranaria. Motivo: restricción dura del encargo — Vado debe leerse como puzzle de planificación, no como una skin de Ranaria.
- **Sí:** jugador/cola planificada en amarillo (identidad del juego), peligro activo en magenta (misma convención de "amenaza" que Asteroids/Caída), meta con borde cian. **No:** forzar cian/magenta como colores principales del juego solo por ser los "de referencia" del sistema. Motivo: el contrato _técnico_ del motor (loop, `dt`, `onStateChange`, canvas 800×600 sin HUD de texto) es el que se mantiene fijo; la paleta visual del juego puede usar amarillo como identidad de catálogo sin romper ese contrato.
- **Sí:** dibujar la cola planificada y el indicador de ciclo de peligro dentro del canvas, sin agregar campos a `RealGameState`. **No:** extender `RealGameProps`/`RealGameHandle` con un campo de "presupuesto restante". Motivo: mismo criterio que SPEC 06 con el preview de "siguiente pieza" — lo específico del juego se dibuja en el canvas; la interfaz compartida no se toca.
- **Sí:** `lives` global a toda la partida (no se resetea por nivel), sin ganancia de vidas al resolver un nivel. **No:** vidas por nivel o regeneración de vidas. Motivo: coherencia con la semántica de "vidas" ya usada por Asteroids/Caída en `RealGameState`, y simplicidad de balance para el MVP.
- **Sí:** solo teclado, sin controles táctiles. **No:** botones en pantalla para móvil. Motivo: mismo criterio que Asteroids/Caída; en móvil la pantalla de jugar simplemente no es jugable, riesgo conocido y aceptado.

---

## Riesgos identificados

| Riesgo                                                                                                                                                               | Mitigación                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Un generador de patrones de peligro mal calibrado podría producir un nivel sin ventana segura alcanzable (irresoluble).                                              | El generador garantiza explícitamente al menos una ventana segura por ciclo en cada franja (paso 1); validar manualmente varios niveles seguidos antes de cerrar el paso 1.                                                    |
| Confundir "deshacer un paso en planificación" (gratis) con "reintentar tras un fallo" (cuesta 1 vida) puede generar un motor con dos rutas de retroceso poco claras. | Mantener ambos casos como transiciones de estado explícitas y separadas en la máquina de fases (`planning`→`planning` por `Backspace`/`KeyR`; `executing`→`planning` solo por colisión), documentadas en el paso 1-2 del plan. |
| Montar el motor en un `useEffect` con Strict Mode de desarrollo (efectos invocados dos veces) puede duplicar el loop o los listeners si el cleanup no cancela todo.  | Copiar el patrón ya probado de `CaidaCanvas.tsx`: guardar refs de listeners y `rafId`, quitarlos y llamar `destroy()` en el cleanup; probar con recarga en modo desarrollo antes de cerrar el paso 3.                          |
| En móvil `/juego/vado/jugar` no es jugable (solo teclado).                                                                                                           | Aceptado y documentado como fuera de alcance, igual que en SPEC 04/06.                                                                                                                                                         |
