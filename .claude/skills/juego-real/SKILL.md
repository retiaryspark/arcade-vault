---
name: juego-real
description: Redacta un spec en specs/ para convertir un juego del catálogo (lib/data.ts) en un juego real jugable con motor propio y leaderboard de Supabase, siguiendo las reglas del método spec-driven de este repo (/spec, template.md) y el patrón técnico ya implementado para asteroids (SPEC 02/04/05). Investiga si hay código fuente de referencia en resources/started-games/ o si hay que diseñar un clon del género desde cero, y lo deja documentado como spec en Draft — no implementa código. Úsala cuando el usuario pida "hacer real" un juego, portar un game.js, o preparar el spec de <game-id>. Seguido de /spec-impl para implementar.
disable-model-invocation: true
argument-hint: "<game-id>  (uno de: bloque-buster, caida, serpentina, gloton, invasores, ranaria, duelo-pixel)"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /juego-real — Redactor de specs para portar un juego del catálogo a real + leaderboard

## Contexto de sesión

Fecha de hoy (usarla en el header del spec, nunca inventarla):
!`date +%F`

Specs existentes (para el próximo número secuencial y para detectar duplicados):
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

---

Esta skill **no escribe código**. Su trabajo es redactar un spec nuevo en `specs/`, coherente con el método spec-driven que ya usa este proyecto (`/spec`, `/spec-impl`), que documente cómo convertir `$ARGUMENTS` (un `game-id` del catálogo) en un juego real con motor propio y leaderboard en Supabase — repitiendo el patrón ya implementado para `asteroids` (SPEC 02, SPEC 04, SPEC 05). Al terminar, el usuario revisa el spec, lo aprueba, y corre `/spec-impl NN-<game-id>-juego-real` para implementarlo paso a paso con las mismas pausas de revisión que ya usa el resto del proyecto.

**Regla de oro:** un spec generado por esta skill debe leerse como un hermano de `specs/01` a `specs/05` — mismo formato, mismo tono, mismas reglas — no como un formato paralelo inventado solo para juegos. Por eso los Pasos 2–4 aprenden las reglas genéricas del proyecto _antes_ de aplicar la especialización técnica de "juego real" en el Paso 5.

## Paso 1 — Validar `$ARGUMENTS`

1. Si `$ARGUMENTS` viene vacío: leer `lib/data.ts`, listar los `id` del catálogo que todavía no están en `REAL_GAMES` (ver más abajo) y preguntar cuál quiere portar.
2. Leer `lib/data.ts` y confirmar que `$ARGUMENTS` es uno de los `Game.id` existentes. Si no lo es, listar los ids válidos y parar.
3. Si `$ARGUMENTS` es `asteroids`: parar. Ya tiene spec e implementación (`specs/04-asteroids-juego-real.md`, `components/games/asteroids/`).
4. Leer `components/games/registry.ts`. Si `REAL_GAMES` ya tiene una entrada para `$ARGUMENTS`: parar, ya está implementado.
5. Revisar el listado de `specs/` de la sección de contexto. Si ya existe un spec cuyo slug contiene `$ARGUMENTS` (en cualquier estado): mostrarlo y preguntar si de todas formas quiere redactar uno nuevo, para no duplicar.

## Paso 2 — Aprender las reglas canónicas de redacción de specs de este proyecto

Leer completo `.claude/skills/spec/SKILL.md` (la skill `/spec` ya instalada en este entorno). De ahí tomar, para aplicar en los pasos siguientes:

- El tono y estilo de pregunta/respuesta que usa el método (directo, concreto, con recomendación marcada cuando se ofrecen opciones).
- La regla de **Fase 3**: si ya se puede responder sin asumir nada "¿qué archivos cambian?", "¿cuál es el primer y el último paso ejecutable?" y "¿cómo se verifica que está terminado?", escribir el spec completo de una sola vez y pasar directo a guardarlo — no ir sección por sección pidiendo confirmación salvo que realmente falte información.
- La regla de **Fase 4**: numeración secuencial siguiente a partir de `specs/`, slug kebab-case, estado inicial `Draft`/`Borrador` (nunca `Aprobado` automáticamente), verificar que las specs referenciadas en "Depende de" existan de verdad, no tocar `specs/.spec-config.yml` si ya existe, confirmar la ruta creada y detenerse sin proponer implementar.
- Las reglas duras: nunca escribir código durante el comando, nunca proponer implementar el spec después de guardarlo, nunca asumir decisiones que el usuario no confirmó.

Estas reglas aplican a `juego-real` tal cual, no son solo referencia — son el contrato que este spec también debe cumplir.

## Paso 3 — Leer el esqueleto estructural base

Leer completo `.claude/skills/spec/template.md` y usarlo como el modelo estructural que hay que respetar antes de especializar:

- Header con `Estado`/`Depende de`/`Fecha`/`Objetivo` en una sola frase.
- `## Alcance` con dos sub-bloques obligatorios: qué incluye y qué queda explícitamente fuera.
- `## Modelo de datos`: estructuras concretas, o declarar explícitamente que no se agrega ninguna.
- `## Plan de implementación`: pasos numerados, cada uno dejando el sistema funcional y verificable.
- `## Criterios de aceptación`: checklist booleano, nada subjetivo ni no verificable.
- `## Decisiones tomadas y descartadas`: cada decisión con su motivo.
- `## Riesgos identificados`: solo si aplican.
- Cierre reforzando qué NO entra en el spec.

Ninguna de estas secciones puede saltarse solo porque "ya sabemos cómo quedó Asteroids" — el spec de un juego nuevo se construye sobre este esqueleto genérico, no copiando SPEC 04 a ciegas.

## Paso 4 — Heredar la redacción concreta ya estabilizada en este repo

Leer `specs/04-asteroids-juego-real.md` y `specs/05-indice-scores-por-juego.md` — las dos specs más recientes y más relevantes al dominio — para tomar, igual que indica la Fase 1 de `/spec`, la redacción concreta que este repo ya adoptó sobre el esqueleto genérico del Paso 3:

- Idioma: español.
- Header en negrita simple sin blockquote: `**Estado:**`, `**Depende de:**`, `**Fecha:**`, `**Objetivo:**` (como línea de texto corrido, no como cita).
- Nombres de sección exactos: `## Alcance` (con "**Incluye:**" y "**Explícitamente fuera de alcance (no en este spec):**"), `## Modelo de datos`, `## Plan de implementación`, `## Criterios de aceptación`, `## Decisiones tomadas y descartadas`, `## Riesgos identificados`.
- Estilo de la sección de decisiones: `- **Sí:** ... **No:** ... Motivo: ...`.
- Criterios de aceptación como lista `- [ ]` (o `- [x]` una vez implementados, pero al redactar el spec nuevo siempre `- [ ]`).

El spec nuevo debe verse como un hermano de specs 01–05, no como un formato distinto.

## Paso 5 — Investigar el patrón técnico reutilizable de "juego real"

Con las reglas de redacción ya aprendidas, investigar el contenido específico de este dominio:

- Leer `components/games/asteroids/AsteroidsGame.ts` y `AsteroidsCanvas.tsx` como el contrato técnico literal a describir en el spec nuevo:
  - Motor: clase TS vanilla, constructor `(canvas: HTMLCanvasElement, callbacks: RealGameProps)`; métodos `handleKeyDown(code)`, `handleKeyUp(code)`, `pause()`, `resume()` (resetea el reloj de `dt`), `forceGameOver()` (llama `onGameOver` una sola vez), `destroy()` (cancela su propio `requestAnimationFrame`).
  - Loop propio por `requestAnimationFrame`, `dt` acotado (p. ej. `Math.min((ts-last)/1000, 0.05)`).
  - `onStateChange({score,lives,level})` deduplicado (solo cuando algún valor cambió respecto al último emitido).
  - Canvas fijo 800×600, sin HUD de texto dibujado — el HUD es 100% externo.
  - Recoloreo neón: jugador/aliados en cian (`var(--cyan)` / `#00f5ff`), enemigos/obstáculos en magenta (`var(--magenta)` / `#ff006e`) — variables reales confirmadas en `app/globals.css` (no `--neon-cyan`).
  - Wrapper: `"use client"`, `forwardRef<RealGameHandle, RealGameProps>`, callbacks guardados en refs para mantener el `useEffect` de montaje con deps vacías, listeners `window` de keydown/keyup con `preventDefault` (con guard `isTextInput` para no romper el input de iniciales), cleanup que remueve listeners y llama `destroy()`, `useImperativeHandle` exponiendo `pause/resume/forceGameOver`.
- `components/games/registry.ts` es el único punto de integración: una línea nueva en `REAL_GAMES`.
- Infraestructura ya genérica que el spec debe declarar explícitamente **fuera de alcance / sin cambios**: `lib/scores.ts`, `lib/supabase/client.ts`, `components/GamePlayer.tsx`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx`, el esquema `scores`/`profiles`, sus políticas RLS, y el índice `(game_id, score desc)`.
- Exclusiones heredadas de SPEC 04 a repetir en cada spec nuevo: sin audio, sin controles táctiles/móviles, sin cambiar el balance de un juego portado, sin migrar el catálogo (`lib/data.ts`) a Supabase, sin deduplicar el ranking por jugador, sin vincular la sesión anónima de Supabase con el `SessionProvider` en memoria.

## Paso 6 — Decidir portar vs. diseñar desde cero

1. Mapeo por convención observada: `caida` → `resources/started-games/03-tetris/game.js`; `bloque-buster` → `resources/started-games/04-arkanoid/game.js`. Usar `Glob resources/started-games/*` para confirmar qué carpetas existen.
2. **Si hay fuente para `$ARGUMENTS`:** leer el `game.js` completo (y archivos acompañantes: `levels.js`, `assets/spritesheet.js` para arkanoid) para poder describir en el spec la física/balance/puntuación exactos a preservar sin rebalancear. Caso especial multi-canvas (Tetris: tablero 300×600 + panel de siguiente pieza): fijar en el spec la decisión de dibujar ambas regiones en un solo `<canvas width={800} height={600}>`, ya que `RealGameProps`/`RealGameHandle`/`REAL_GAMES` solo soportan un componente por juego y esa interfaz compartida no se toca.
3. **Si no hay fuente:** inferir el género por id/título/categoría de `lib/data.ts` (`serpentina`→snake, `gloton`→pac-man, `invasores`→space invaders, `ranaria`→frogger, `duelo-pixel`→pong/versus de 2 jugadores) y definir mecánicas concretas para la sección de Decisiones: tamaño de grid/tablero, curva de velocidad o dificultad, condición de victoria/derrota, regla de puntuación. No hace falta que el usuario apruebe cada mecánica antes de redactar — se documentan como decisiones tomadas, revisables cuando lea el spec.
4. Si algo sigue siendo genuinamente ambiguo (p. ej. qué tan fiel debe ser un clon desde cero a un juego real conocido), preguntar en bloque con `AskUserQuestion`, con el tono de la Fase 2 de `/spec` aprendido en el Paso 2 — acotado, porque la mayoría de las preguntas genéricas de `/spec` (persistencia, integración con specs previos, esquema de datos) ya están resueltas por precedente y no hace falta repetirlas.

## Paso 7 — Redactar el spec

Combinar el esqueleto del Paso 3 + la redacción concreta del Paso 4 + el contenido técnico del Paso 5 + la decisión del Paso 6, aplicando la regla de Fase 3 aprendida en el Paso 2 (spec completo de una sola vez si no falta información real; sección por sección solo si algo quedó sin resolver). Contenido esperado:

- **Header:** `Estado: Draft` (o `Borrador`, según lo que uses de convención — revisa cuál usan los specs existentes), `Depende de: SPEC 02, SPEC 04, SPEC 05`, fecha del contexto de sesión, objetivo en una sola frase (ej. "Portar/Diseñar el motor real de `<juego>` con leaderboard en Supabase, siguiendo el mismo patrón de Asteroids").
- **Alcance — Incluye:** motor `components/games/<id>/<Id>Game.ts` con el contrato técnico del Paso 5, wrapper `components/games/<id>/<Id>Canvas.tsx`, una línea en `components/games/registry.ts`.
- **Alcance — Explícitamente fuera de alcance:** la infraestructura genérica y las exclusiones del Paso 5.
- **Modelo de datos:** referencia sin cambios al esquema `scores`/`profiles` ya existente — dejar explícito que no se agregan columnas ni tablas.
- **Plan de implementación:** pasos numerados al estilo de los pasos 2–4 de SPEC 04 (crear motor → crear wrapper y registrar → verificar en `GamePlayer`/detalle/salón), cada uno dejando el sistema funcional con su propia verificación.
- **Criterios de aceptación:** checklist booleano — motor jugable con las mecánicas correctas, colores cian/magenta aplicados, HUD externo reflejando estado real, PAUSA/FIN/GUARDAR funcionando, leaderboard real visible en `/juego/<id>` y en la pestaña correspondiente de `/salon`, resto de juegos sin cambios, `npm run lint` limpio.
- **Decisiones tomadas y descartadas:** incluir explícitamente la decisión portar-vs-diseñar-desde-cero del Paso 6 (con motivo) y las decisiones de mecánica concretas si fue diseño desde cero.
- **Riesgos identificados:** los que apliquen (p. ej. para un juego desde cero, que el balance inicial no calce con lo que el usuario imaginaba — mitigado porque las mecánicas quedan documentadas en el spec antes de aprobarlo).

## Paso 8 — Guardar el spec

Replicando exactamente la Fase 4 de `/spec` (aprendida en el Paso 2):

1. Siguiente número secuencial de `specs/` según el listado del contexto de sesión.
2. Slug: `<NN>-<game-id>-juego-real.md` (ej. `06-caida-juego-real.md`).
3. Escribir el archivo directo en `specs/`, sin pedir permiso para el nombre.
4. Estado inicial `Draft`/`Borrador` — **nunca** `Aprobado` automáticamente.
5. Verificar que las specs referenciadas en "Depende de" (02, 04, 05) existen de verdad.
6. No tocar `specs/.spec-config.yml` — ya existe en este repo.
7. Confirmar al usuario: ruta del archivo creado, recordatorio de que está en Draft, y el siguiente paso explícito: revisar → aprobar → correr `/spec-impl <NN>-<game-id>-juego-real` para implementarlo paso a paso con pausas de revisión.
8. **Detenerse ahí.** No proponer implementar, no escribir código de ningún tipo.

## Reglas duras

- Nunca escribir código durante esta skill. Solo el `.md` del spec.
- Nunca proponer implementar el spec después de guardarlo — eso es trabajo de `/spec-impl`.
- Nunca saltarse los Pasos 2–4 (aprender reglas de `/spec` + template + specs existentes) para ir directo a copiar el patrón de Asteroids — el objetivo es coherencia con **todo** el proyecto, no solo con SPEC 04.
- Nunca asumir decisiones de mecánica de un juego desde cero sin dejarlas explícitas y revisables en la sección de Decisiones del spec.
- Si el `game-id` ya tiene spec o ya está en `REAL_GAMES`, no redactar uno nuevo sin avisar primero.

## Argumentos

`$ARGUMENTS` es el `game-id` del catálogo (`lib/data.ts`) a portar: uno de `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`. Si viene vacío, seguir el Paso 1.
