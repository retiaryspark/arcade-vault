# 04 — Asteroids: primer juego real jugable

**Estado:** Aprobado
**Depende de:** SPEC 01, SPEC 02 (integración base de Supabase ya mezclada a `main`)
**Fecha:** 2026-09-16

**Objetivo:** Portar el clon de Asteroids de `resources/started-games/02-asteroids/game.js` a un componente real y jugable dentro de `/juego/asteroids/jugar`, reemplazando ahí la simulación visual del MVP, con guardado y lectura reales de puntuaciones en Supabase usando los clientes de `@supabase/ssr` y el esquema de `scores` ya mezclados en `main` (SPEC 02), más un inicio de sesión anónimo mínimo para poder cumplir su RLS.

---

## Alcance

**Incluye:**

- Motor del juego portado a TypeScript en `components/games/asteroids/AsteroidsGame.ts`: nave con inercia/rotación, disparo, asteroides que envuelven los bordes (toroidal) y se dividen al ser destruidos (grande→mediano→pequeño), partículas de explosión, power-up de disparo triple, 3 vidas con invencibilidad temporal al reaparecer, y niveles que aumentan la cantidad de asteroides. Misma física y balance que el original (velocidades, radios, puntos, probabilidad de power-up).
- Recoloreado a la paleta neón del sitio: nave, balas y power-up en cian (`--neon-cyan`); asteroides y partículas de explosión en magenta (`--magenta`). El resto del juego (fondo negro del canvas) no cambia.
- El canvas no dibuja su propio HUD de texto (SCORE/NIVEL/vidas); esa información se expone vía callback y se muestra únicamente en el HUD externo en HTML que ya existe en `GamePlayer.tsx`.
- Canvas interno fijo de 800×600, escalado por CSS para caber en el bisel `crt-screen` en cualquier tamaño de pantalla.
- Renombrar en `lib/data.ts` la entrada del catálogo `id: "rocas"` → `id: "asteroids"` y `title: "ROCAS"` → `title: "ASTEROIDS"` (mismo cover, descripción y categoría SHOOTER; solo cambia el nombre/id, ahora en rutas `/juego/asteroids` y `/juego/asteroids/jugar`).
- Wrapper de React `components/games/asteroids/AsteroidsCanvas.tsx` que monta el motor, gestiona sus propios listeners de teclado (con `preventDefault` en flechas y espacio para que no haga scroll de la página) y expone `pause()`, `resume()` y `forceGameOver()`.
- Registro mínimo `components/games/registry.ts` (`REAL_GAMES: Record<string, ComponentType<RealGameProps>>`) que hoy solo mapea `asteroids` → `AsteroidsCanvas`, pensado para sumar más juegos reales después sin tocar `GamePlayer.tsx`.
- `components/GamePlayer.tsx` modificado: si `game.id` tiene entrada en `REAL_GAMES`, renderiza ese componente dentro de `crt-screen` en vez del `game-arena` simulado, y el HUD (Puntuación/Vidas/Nivel) se alimenta del estado real del juego en vez del `setInterval` simulado. PAUSA llama a `pause()/resume()`; FIN llama a `forceGameOver()` (termina la partida al instante, igual que hoy). Los juegos sin entrada en `REAL_GAMES` siguen exactamente igual que en SPEC 01.
- **Inicio de sesión anónimo real, mínimo y automático:** al montar `/juego/asteroids/jugar`, si `supabase.auth.getUser()` no devuelve usuario, se llama a `supabase.auth.signInAnonymously()` para obtener un `user.id` real. Sin UI nueva, sin tocar `/auth` ni `lib/session-context.tsx`. Es el único subconjunto de la parte de autenticación de SPEC 02 que se implementa aquí, y solo porque el insert en `scores` lo exige (ver Modelo de datos).
- Se reutiliza el cliente de Supabase ya existente en el repo, `lib/supabase/client.ts` (`createClient()` de `@supabase/ssr`, mezclado por SPEC 02) — no se crea un cliente propio.
- `lib/scores.ts` nuevo (`getScores`, `saveScore`), usando ese cliente y el `user.id` de la sesión anónima para el insert.
- GUARDAR PUNTUACIÓN, solo para juegos con entrada en `REAL_GAMES` (hoy únicamente `asteroids`), inserta una fila real en `scores` (con `user_id` real) en vez de solo cambiar estado local.
- `/juego/asteroids` (Detalle) y la pestaña ASTEROIDS de `/salon` leen el panel de puntuaciones desde la tabla `scores` real, con estado vacío explícito cuando no hay filas todavía. El resto de juegos sigue usando `seededScores` en ambas pantallas.
- En la pestaña ASTEROIDS del Salón: si hay menos de 3 filas, el podio muestra "—" en los puestos faltantes; con 0 filas no se pinta el podio y se muestra el mismo estado vacío que en Detalle. La fila "TU MEJOR MARCA" no se muestra en la pestaña ASTEROIDS (una sesión anónima nueva por partida no tiene forma estable de identificarse entre visitas).

**Explícitamente fuera de alcance (no en este spec):**

- El resto de SPEC 02: login por correo/contraseña, OAuth Google/GitHub, `middleware.ts` de sincronización de sesión servidor/cliente, y reemplazar `lib/session-context.tsx` por sesión real en el resto del sitio (navbar, `/auth`, Salón). Sigue pendiente como su propio spec.
- Cualquier UI de "estás jugando como invitado anónimo" — el `signInAnonymously` es una llamada silenciosa en segundo plano, invisible para el usuario.
- Controles táctiles/móviles para Asteroids: se juega solo con teclado (flechas + espacio), igual que el original. En móvil la pantalla `/juego/asteroids/jugar` no es jugable.
- Cambiar el balance/las reglas del juego original (velocidades, puntos, probabilidad de power-up, tamaños).
- Sonido / efectos de audio.
- Convertir algún otro de los 7 juegos restantes en jugable real.
- Deduplicar el ranking de `scores` por jugador (se muestra tal cual, igual que `seededScores` hoy).
- Migrar el catálogo `GAMES` (`lib/data.ts`) a Supabase; sigue siendo contenido fijo.
- Vincular la sesión anónima de Supabase con el `SessionProvider` en memoria (son dos sistemas de sesión separados y sin relación en este spec).

---

## Modelo de datos

`scores` y `profiles` **ya existen** en el proyecto de Supabase (migración `profiles_scores_schema`, mezclada con SPEC 02) con el esquema completo original — no se crea ninguna tabla nueva en este spec:

```sql
-- ya aplicado por SPEC 02, referencia sin cambios:
create table scores (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
-- RLS: select público; insert solo si auth.uid() = user_id
```

Este spec solo necesita que exista una sesión de Supabase (aunque sea anónima) para que `auth.uid() = user_id` se cumpla al insertar. Requiere que el proveedor de inicio de sesión anónimo esté habilitado en el dashboard del proyecto (Authentication → Providers → Anonymous), paso manual descrito en el plan.

```ts
// lib/scores.ts
export interface RealScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA", derivado de created_at
}

export async function getScores(
  gameId: string,
  limit?: number,
): Promise<RealScoreRow[]>;

// obtiene/crea la sesión anónima internamente (supabase.auth.getUser() /
// signInAnonymously()) y usa ese user.id como scores.user_id
export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<void>;
```

```ts
// components/games/registry.ts
export interface RealGameHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
}

export interface RealGameProps {
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

export const REAL_GAMES: Record<
  string,
  ComponentType<RealGameProps & { ref?: Ref<RealGameHandle> }>
>;
// hoy: { asteroids: AsteroidsCanvas }
```

---

## Plan de implementación

1. **Renombrar catálogo + habilitar invitado anónimo en Supabase.** En `lib/data.ts`, cambiar `id: "rocas"` → `id: "asteroids"` y `title: "ROCAS"` → `title: "ASTEROIDS"`. Habilitar manualmente el proveedor de inicio de sesión anónimo en el dashboard de Supabase (Authentication → Providers → Anonymous) del proyecto `jvymmtckgwfhbffzmljo` — paso fuera del alcance de las herramientas automatizadas de este entorno. Verificación: `/juego/asteroids` y `/juego/asteroids/jugar` siguen navegando con la simulación (aún no hay motor real conectado); `npm run dev` sigue funcionando sin errores; una llamada de prueba a `supabase.auth.signInAnonymously()` desde la consola del navegador devuelve una sesión sin error.
2. **Motor de Asteroids portado.** Crear `components/games/asteroids/AsteroidsGame.ts` con toda la lógica de `resources/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, `update`/`draw`/loop), recibiendo el canvas por parámetro en vez de leer `document` globalmente, sin dibujar HUD de texto, y recoloreada (nave/balas/power-up en cian, asteroides/partículas en magenta). Expone `onStateChange({score, lives, level})` en cada cambio relevante y `onGameOver(finalScore)` al perder la última vida. Verificación: ninguna todavía (sin UI conectada).
3. **Wrapper de React + registro.** Crear `components/games/asteroids/AsteroidsCanvas.tsx` (`"use client"`, `forwardRef<RealGameHandle, RealGameProps>`) que monta un `<canvas width={800} height={600}>` escalado por CSS, instancia `AsteroidsGame` en un `useEffect`, agrega/limpia listeners de teclado (con `preventDefault`) y cancela el `requestAnimationFrame` al desmontar, exponiendo `pause()/resume()/forceGameOver()` vía `useImperativeHandle`. Crear `components/games/registry.ts` con `REAL_GAMES = { asteroids: AsteroidsCanvas }`. Verificación: ninguna todavía (no conectado a `GamePlayer`).
4. **Integración en el reproductor.** Modificar `components/GamePlayer.tsx`: si `REAL_GAMES[game.id]` existe, renderizarlo dentro de `crt-screen` en vez del `game-arena` simulado, alimentando el HUD externo desde `onStateChange`; PAUSA llama a `pause()/resume()`; FIN llama a `forceGameOver()`; `onGameOver` dispara el modal de fin de juego igual que hoy. Los juegos sin entrada en `REAL_GAMES` no cambian. Verificación: `/juego/asteroids/jugar` es Asteroids jugable de verdad con teclado, con el mismo HUD/modal de siempre; `/juego/caida/jugar` (u otro sin registro) se ve idéntico a antes.
5. **Sesión anónima + guardado real de puntuación.** Crear `lib/scores.ts` con `saveScore`, que internamente asegura sesión (`getUser()` → si no hay, `signInAnonymously()`) usando el `createClient()` de `lib/supabase/client.ts` ya existente, y luego inserta `{ game_id, user_id, player_name, score }`. En `GamePlayer.tsx`, cuando `game.id` tiene entrada en `REAL_GAMES`, GUARDAR PUNTUACIÓN llama a `saveScore(game.id, name, score)` en vez de solo `setSaved(true)`, y muestra el toast de guardado tras confirmar el insert (o un estado de error simple si falla, p. ej. si el proveedor anónimo no está habilitado). Los demás juegos siguen guardando solo en memoria. Verificación: tras una partida de Asteroids, `mcp__supabase__execute_sql` (`select * from scores`) muestra la fila insertada con `user_id` real y las iniciales tecleadas.
6. **Leaderboard real en Detalle y Salón.** Agregar `getScores` a `lib/scores.ts`. Modificar `app/juego/[id]/page.tsx`: si `id === "asteroids"`, usa `getScores("asteroids", 10)` en vez de `seededScores`, con estado vacío explícito si no hay filas. Modificar `app/salon/page.tsx`: cuando la pestaña activa es `asteroids`, usa `getScores("asteroids", 12)`; con menos de 3 filas el podio muestra "—" en los puestos faltantes; con 0 filas no se pinta el podio y se muestra el estado vacío; la fila "TU MEJOR MARCA" no se muestra para la pestaña ASTEROIDS. El resto de juegos sigue con `seededScores`. Verificación: guardar una puntuación en Asteroids la hace aparecer en `/juego/asteroids` y en la pestaña ASTEROIDS de `/salon`; con la tabla vacía, ambas pantallas muestran el estado vacío en vez de una lista rota.
7. **Pulido final.** Confirmar que flechas y espacio no hacen scroll de la página mientras se juega Asteroids; confirmar que salir a mitad de partida (SALIR/VOLVER AL VAULT, que ya apuntan a `/biblioteca` tras SPEC 02-home) o navegar a otra pantalla detiene el loop y quita los listeners sin errores en consola. Verificación: `npm run lint` sin errores; recorrido manual completo — jugar hasta game over, guardar puntuación, verla en Detalle y Salón; navegar a otro juego y confirmar que su simulación sigue intacta.

---

## Criterios de aceptación

- [ ] El proveedor de inicio de sesión anónimo está habilitado en el proyecto de Supabase.
- [ ] En `lib/data.ts`, la entrada del catálogo tiene `id: "asteroids"` y `title: "ASTEROIDS"` (ya no `"rocas"`/`"ROCAS"`).
- [ ] `/juego/asteroids/jugar` es Asteroids real y jugable con teclado: inercia/rotación de nave, disparo, envolvimiento toroidal, división de asteroides, power-up de disparo triple, 3 vidas con invencibilidad al reaparecer, y niveles que aumentan la cantidad de asteroides.
- [ ] La nave, las balas y el power-up se ven en cian; los asteroides y las partículas de explosión en magenta.
- [ ] El HUD externo del reproductor (Puntuación/Vidas/Nivel) refleja el estado real del juego; el canvas no dibuja su propio texto de HUD.
- [ ] PAUSA detiene por completo el juego (nada se mueve) y REANUDAR lo continúa donde quedó.
- [ ] FIN termina la partida al instante y abre el modal de fin de juego, igual que en los demás juegos.
- [ ] GUARDAR PUNTUACIÓN en Asteroids crea una sesión anónima si no existe, e inserta una fila real en `scores` con `user_id` real y las iniciales tecleadas, verificable con una consulta directa a la tabla.
- [ ] El panel "MEJORES PUNTUACIONES" en `/juego/asteroids` muestra filas reales de `scores`, con estado vacío explícito si no hay ninguna todavía.
- [ ] La pestaña ASTEROIDS del Salón de la Fama muestra podio y tabla desde `scores` real (con "—" o estado vacío cuando faltan filas) y no muestra la fila "TU MEJOR MARCA".
- [ ] Los otros 7 juegos (reproductor, Detalle y Salón) no cambiaron: siguen con la simulación visual y `seededScores` exactamente como en SPEC 01.
- [ ] Las flechas y la barra espaciadora no hacen scroll de la página mientras se juega Asteroids.
- [ ] Salir de la partida o navegar a otra pantalla detiene el loop del juego sin errores en consola.
- [ ] `npm run dev` levanta sin errores y `npm run lint` pasa limpio.

---

## Decisiones tomadas y descartadas

- **Sí:** registro mínimo `REAL_GAMES` por id de juego. **No:** un `if (game.id === 'rocas')` hardcodeado dentro de `GamePlayer.tsx`. Motivo: este es explícitamente "el primer juego real"; un mapa de una línea por juego cuesta lo mismo hoy y evita un refactor cuando llegue el segundo.
- **Sí:** un solo HUD, el externo en HTML de `GamePlayer` que ya existe. **No:** mantener también el HUD dibujado dentro del canvas. Motivo: evita mostrar el mismo score/vidas/nivel dos veces en pantalla; el HUD externo ya es el estándar para los otros 7 juegos.
- **Sí:** recolorear nave/balas/power-up a cian y asteroides/partículas a magenta. **No:** dejar el blanco/negro original ni usar amarillo. Motivo: pedido explícito para que calce con la paleta neón del resto del sitio; cian es el acento ya usado en el HUD y en el detalle (`neon-cyan`).
- **Sí:** canvas interno fijo de 800×600 escalado por CSS. **No:** recalcular la física a un tamaño de canvas dinámico. Motivo: conserva intacto el balance de velocidades/radios del original; escalar visualmente basta para verse bien en cualquier pantalla.
- **Sí:** FIN sigue terminando la partida al instante. **No:** agregar una confirmación antes de terminar. Motivo: no cambia el flujo ya validado en SPEC 01 para los demás juegos.
- **Sí:** solo teclado, sin controles táctiles. **No:** agregar botones en pantalla para móvil. Motivo: el original tampoco los tiene y no fue pedido; en móvil la pantalla de jugar simplemente no es jugable, queda documentado como riesgo conocido.
- **Sí:** reutilizar el esquema de `scores` y el cliente de Supabase (`@supabase/ssr`) ya mezclados por SPEC 02, con `user_id not null` y RLS `auth.uid() = user_id`. **No:** relajar esa tabla a un esquema sin `user_id` para evitar depender de auth. Motivo: el esquema y las políticas ya fueron subidas por el equipo como parte real de SPEC 02; debilitar esa seguridad para conveniencia de este spec sería revertir trabajo ajeno ya intencional.
- **Sí:** agregar únicamente `signInAnonymously()` automático y silencioso como el mínimo indispensable de autenticación para poder cumplir esa RLS. **No:** implementar el resto de SPEC 02 (login por correo, OAuth, middleware, reemplazo de `session-context.tsx`) como parte de este spec. Motivo: sin ninguna sesión, el insert en `scores` es imposible dado el esquema ya existente; el resto de SPEC 02 es su propio trabajo grande, con pasos manuales (OAuth) que no dependen de que Asteroids sea jugable.
- **Sí:** ASTEROIDS lee de `scores` real en Detalle y Salón; el resto de juegos sigue con `seededScores`. **No:** migrar todos los juegos a leer de Supabase. Motivo: los otros 7 juegos no son jugables, no tienen forma de generar puntuaciones reales.
- **Sí:** ocultar la fila "TU MEJOR MARCA" en la pestaña ASTEROIDS del Salón. **No:** intentar aproximarla buscando `session.name` en `scores.player_name`, o usando el `user_id` de la sesión anónima actual. Motivo: `player_name` son iniciales libres tecleadas por partida, no un identificador de usuario, y una sesión anónima nueva por visita no persiste entre sesiones de navegador para "reconocer" al mismo jugador.
- **Sí:** renombrar la entrada existente del catálogo (`id`/`title` "rocas"/"ROCAS" → "asteroids"/"ASTEROIDS"). **No:** agregar una entrada nueva y dejar "rocas" como un juego simulado aparte. Motivo: es la misma entrada (mismo cover, descripción y categoría SHOOTER) recibiendo el motor real; mantener dos juegos de "asteroides" en el catálogo sería confuso y redundante.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Recolorear cada `draw()` portado del original es propenso a que se cuele un `strokeStyle`/`fillStyle` en blanco olvidado. | Revisión visual manual de cada elemento (nave, balas, asteroides, partículas, power-up) en el paso 2, antes de conectar el HUD en el paso 4. |
| Montar la clase del juego dentro de un `useEffect` de React (con Strict Mode de desarrollo invocando efectos dos veces) puede duplicar el loop o los listeners de teclado si la limpieza no cancela todo. | Guardar el id de `requestAnimationFrame` y las referencias de los listeners para cancelarlos/quitarlos explícitamente en el cleanup del efecto; probar con recarga en modo desarrollo antes de dar el paso 3 por terminado. |
| Habilitar el proveedor de inicio de sesión anónimo es una opción de proyecto en el dashboard de Supabase, no algo que las herramientas de este entorno puedan aplicar por SQL. | Paso manual explícito en el paso 1 del plan, con verificación manual antes de continuar al paso 5. |
| Cada partida sin sesión de navegador previa crea un usuario anónimo nuevo en `auth.users`; con el tiempo acumula muchas filas de usuarios anónimos sin vínculo entre sí. | Aceptado conscientemente: es el comportamiento estándar de `signInAnonymously` de Supabase y el mismo enfoque que ya elegía SPEC 02 completo para "invitado". Limpiar usuarios anónimos viejos, si hace falta, es tarea operativa fuera de este spec. |
