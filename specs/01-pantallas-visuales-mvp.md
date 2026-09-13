# 01 — Pantallas visuales MVP de Arcade Vault

**Estado:** Completado
**Depende de:** ninguno
**Fecha:** 2026-09-12

**Objetivo:** Portar las 5 pantallas del prototipo estático en `resources/templates/` a rutas reales de Next.js en `app/`, con el tema visual retro-arcade descrito en `README.md`, sin implementar ningún juego jugable de verdad.

---

## Alcance

**Incluye:**

- Las 5 pantallas del prototipo, convertidas a rutas del App Router:
  - `/` — Biblioteca (grid de juegos, buscador, chips de categoría)
  - `/juego/[id]` — Detalle del juego + panel de mejores puntuaciones
  - `/juego/[id]/jugar` — Reproductor (HUD, bezel CRT, partida simulada, modal de fin de juego)
  - `/salon` — Salón de la Fama (podio + tabla + tabs por juego)
  - `/auth` — Inicio de sesión / crear cuenta / invitado
- Navbar sticky (`Nav`) con menú móvil hamburguesa, portada tal cual del prototipo.
- Catálogo mock de 8 juegos, categorías y generador de puntuaciones falsas (`seededScores`), portados de `data.jsx` a TypeScript.
- Estado de sesión (usuario logueado / invitado / nadie) en memoria de React durante la navegación, sin persistencia: se pierde al recargar la página. Afecta la navbar (nombre vs "Iniciar Sesión") y la fila "TU MEJOR MARCA" en el Salón de la Fama.
- Pantalla reproductor con la misma simulación del prototipo: marcador que sube solo mientras no está en pausa ni terminado, HUD de vidas/nivel, botones PAUSA/FIN/SALIR, y modal de "FIN DEL JUEGO" con input de iniciales y botón "GUARDAR PUNTUACIÓN" que solo actualiza estado local del componente (no persiste, no hay backend).
- Tema visual CRT/neón (negro `#0a0a0f`, cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`), fuentes "Press Start 2P" + "Courier Prime" vía `next/font/google`, scanlines, grid de fondo, glow, animaciones de hover/entrada — todo tal como en `resources/templates/styles.css`.
- Todo el copy en español, igual al de `README.md` y al prototipo.
- Responsive: 1 columna en móvil, 2 en tablet, 3–4 en desktop para el grid de juegos.

**Explícitamente fuera de alcance (no en este spec):**

- Cualquier juego jugable real (canvas, iframe sandboxeado, lógica de reglas). El "juego" del reproductor es una simulación visual (score que sube solo, sprites CSS), igual que en el prototipo.
- Backend real, base de datos, o servicio de auth (Google/GitHub son botones decorativos sin OAuth).
- Persistencia entre sesiones (localStorage/IndexedDB) de usuario o puntuaciones. Si se quiere en el futuro, es un spec aparte.
- Validación de formularios de auth (campos vacíos, formato de email, etc.) más allá de lo que ya hace el prototipo (ninguna).
- Páginas nuevas no listadas en el prototipo (perfil, ajustes, checkout, etc.).
- Sonido / efectos de audio.

---

## Modelo de datos

Todo vive en `lib/data.ts`, portado de `resources/templates/data.jsx` con tipos:

```ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;      // clase CSS del placeholder de cover art
  color: GameColor;
  best: number;
  plays: string;       // ej. "12.4K"
}

export const GAMES: Game[];
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión en memoria, en un contexto de cliente (`lib/session-context.tsx` o similar):

```ts
export interface Session {
  name: string;
  guest: boolean;
}
// null = nadie logueado
```

Expone `session`, `login(name: string)`, `loginGuest()`, `logout()`. Vive en un `SessionProvider` client component que envuelve el árbol en `app/layout.tsx`. No escribe a `localStorage`.

---

## Plan de implementación

1. **Base de datos mock + tema global.** Crear `lib/data.ts` (GAMES/CATS/seededScores tipados). Reemplazar `app/globals.css` con el tema CRT/neón portado de `styles.css` (variables de color, scanlines, grid de fondo, tipografías). Configurar `next/font/google` para "Press Start 2P" y "Courier Prime" en `app/layout.tsx` (revisar `node_modules/next/dist/docs/` para la API de fuentes de esta versión antes de escribir el código, según `AGENTS.md`). Verificación: `npm run dev` sirve una página en blanco con el fondo y las fuentes correctas, sin errores en consola.
2. **Sesión + navegación.** Crear `SessionProvider` (contexto en memoria) y `components/Nav.tsx` (navbar + menú móvil), portados de `nav.jsx`. Integrar ambos en `app/layout.tsx`. Verificación: la navbar aparece en todas las rutas, el botón "Iniciar Sesión" navega a `/auth`.
3. **Biblioteca (`/`).** Crear `app/page.tsx` con hero animado, buscador, chips de categoría y grid de `GameCard`, portados de `biblioteca.jsx`. Verificación: filtrar por texto y por categoría funciona client-side; cada card enlaza a `/juego/[id]`.
4. **Detalle (`/juego/[id]`).** Crear `app/juego/[id]/page.tsx` con cover, tags, descripción, stats y panel de leaderboard (`seededScores`), portado de `detalle.jsx`. Verificación: id inexistente no rompe la página (404 o mensaje controlado); "JUGAR AHORA" navega a `/juego/[id]/jugar`; "VOLVER AL VAULT" navega a `/`.
5. **Auth (`/auth`).** Crear `app/auth/page.tsx` con tabs iniciar sesión/crear cuenta, campos, invitado y botones sociales decorativos, portado de `auth.jsx`. Al enviar el formulario o pulsar "JUGAR COMO INVITADO", llama a `login`/`loginGuest` del contexto y navega a `/`. Verificación: tras loguear, la navbar muestra el nombre; recargar la página vuelve a mostrar "Iniciar Sesión".
6. **Reproductor (`/juego/[id]/jugar`).** Crear `app/juego/[id]/jugar/page.tsx` con HUD, bezel CRT con sprites CSS animados, ticker de puntuación (estado local, `setInterval`), pausa, y modal de fin de juego con guardado en memoria, portado de `reproductor.jsx`. Verificación: el marcador sube solo, PAUSA lo detiene, FIN abre el modal, GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA" sin recargar, JUGAR DE NUEVO reinicia el estado.
7. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` con tabs por juego, podio top 3 y tabla top 10+, portado de `salon.jsx`. Si hay sesión activa, muestra la fila "TU MEJOR MARCA". Verificación: cambiar de tab recalcula podio/tabla; con sesión activa aparece la fila destacada, sin sesión no aparece.
8. **Pulido final.** Revisar responsive en los 3 breakpoints, animaciones de entrada/hover, y que todo el copy esté en español. Borrar `__MACOSX/` (basura de extracción de zip, no es parte de la app). Verificación: `npm run lint` sin errores; recorrido manual de las 5 pantallas en móvil y desktop.

---

## Criterios de aceptación

- [ ] `npm run dev` levanta la app sin errores y `npm run lint` pasa limpio.
- [ ] Las 5 rutas existen y navegan entre sí exactamente como en el prototipo (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/salon`, `/auth`).
- [ ] El tema visual (colores neón, scanlines, grid de fondo, tipografías Press Start 2P/Courier Prime, glow en hover) está presente en las 5 pantallas.
- [ ] La Biblioteca filtra por texto y categoría sobre los 8 juegos mock, en tiempo real.
- [ ] El Detalle muestra las 10 mejores puntuaciones generadas por `seededScores` para ese juego.
- [ ] El Reproductor simula una partida (marcador sube solo), permite pausar, y el botón FIN abre el modal de "FIN DEL JUEGO" con opción de guardar puntuación (solo en memoria).
- [ ] El Salón de la Fama muestra podio + tabla por juego seleccionado, y la fila "TU MEJOR MARCA" solo cuando hay sesión activa.
- [ ] Iniciar sesión, crear cuenta o entrar como invitado en `/auth` actualiza la navbar durante la sesión de navegación, y ese estado se pierde al recargar la página (no hay `localStorage`).
- [ ] Ningún juego real (canvas/iframe con reglas jugables) fue implementado — el reproductor es una simulación visual.
- [ ] Todo el texto visible en la UI está en español.
- [ ] El grid de juegos y las pantallas se ven correctamente en móvil (1 columna), tablet (2 columnas) y desktop (3–4 columnas).
- [ ] `__MACOSX/` fue eliminado del repo.

---

## Decisiones tomadas y descartadas

- **Sin persistencia (localStorage) para sesión ni puntuaciones**, a diferencia del prototipo original. Motivo: este spec es explícitamente "solo visual"; añadir persistencia real es trabajo de un spec de backend/auth futuro. El estado de sesión vive en memoria (React context) para que las pantallas que dependen de "¿hay usuario?" (navbar, Salón de la Fama) se puedan demostrar sin necesidad de un backend.
- **El reproductor conserva la simulación de partida del prototipo** (marcador que sube solo, sprites CSS) en vez de un placeholder totalmente estático. Motivo: es la única forma de mostrar todos los estados de esa pantalla (HUD activo, pausa, fin de juego, guardado) sin escribir un juego real.
- **Rutas en español anidadas bajo `/juego/[id]`** (`/juego/[id]` y `/juego/[id]/jugar`) en vez de rutas en inglés. Motivo: coherencia con el copy en español exigido por el README y con la relación padre-hijo detalle→jugar del prototipo (`route.name === "detalle" || "player"` en `nav.jsx`).
- **Datos mock centralizados en `lib/data.ts`**, tipados, en vez de duplicarlos por pantalla. Motivo: las 5 pantallas comparten el mismo catálogo `GAMES` y el mismo generador `seededScores`; un único origen evita divergencias.
- **CSS del tema portado como CSS plano en `globals.css`** (variables, scanlines, glow) en vez de reescribirlo como utilidades de Tailwind. Motivo: el look CRT/neón es completamente a medida (glows, scanlines, grid en perspectiva) y `styles.css` ya resuelve esto; Tailwind v4 se deja para reset/utilidades puntuales, no para reinventar el tema.

---

## Riesgos identificados

- **Next.js 16.3.4 tiene APIs distintas a las de entrenamiento** (p. ej. `LayoutProps<"/">` en vez de props manuales, posibles cambios en `next/font`). Mitigación: revisar `node_modules/next/dist/docs/` antes de escribir cada pieza nueva de `app/`, como indica `AGENTS.md`.
- **Sesión en memoria se resetea con cualquier refresh o navegación dura**, lo cual puede sorprender en la demo si no se explica. Mitigación: ya documentado como comportamiento esperado en este spec (ver Alcance y Decisiones).
