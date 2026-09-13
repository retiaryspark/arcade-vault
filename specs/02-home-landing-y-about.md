# 02 — Pantalla Home (landing) y Acerca de

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-09-12

**Objetivo:** Portar las pantallas Home (landing con hero/features/preview/stats/actividad/precios) y Acerca de + Contacto desde `resources/home-about/` a rutas reales de Next.js, moviendo la Biblioteca actual de `/` a `/biblioteca` y añadiendo `/acerca-de`, con la navbar actualizada a las cuatro secciones (Inicio, Biblioteca, Salón de la Fama, Acerca de).

---

## Alcance

**Incluye:**

- Nueva pantalla **Home** en `/` (landing), portada de `resources/home-about/home.jsx`: hero con siluetas SVG flotantes y CTAs, sección "¿Por qué Arcade Vault?" (4 feature cards), preview de juegos (6 `MiniCard` desde `GAMES`), sección de stats, "Actividad en vivo" (ticker de puntuaciones recientes + top jugadores del día, con enlace a `/salon`), sección de precios (plan único gratis + FAQ), CTA final. Animaciones de aparición al hacer scroll (`IntersectionObserver` + clase `.reveal`/`.in`), igual que en el prototipo.
- La Biblioteca existente (grid + buscador + chips, hoy en `app/page.tsx`) se **mueve** a `app/biblioteca/page.tsx`, sin cambios de comportamiento.
- Nueva pantalla **Acerca de** en `/acerca-de`, portada de `resources/home-about/about.jsx`: hero de misión + 3 highlights, separador decorativo animado, y formulario de contacto (nombre/correo/mensaje) con validación de campos vacíos (shake) y un estado de "enviado" que muestra una terminal falsa de confirmación — todo en memoria del componente, sin backend ni persistencia, igual que el resto del sitio.
- Navbar (`components/Nav.tsx`) actualizada al patrón de `resources/home-about/nav.jsx`: enlaces **Inicio** (`/`), **Biblioteca** (`/biblioteca`, activo también en `/juego/*`), **Salón de la Fama** (`/salon`), **Acerca de** (`/acerca-de`), igual en el menú de escritorio y el panel móvil.
- CSS nuevo: las ~220 líneas adicionales de `resources/home-about/styles.css` (todo lo que va después de la sección `HOME PAGE`, incluida la de about/contacto) se añaden a `app/globals.css`. El resto del archivo es idéntico al ya portado en el spec 01, no se toca.
- Nuevos componentes de cliente en `components/`: `MiniGameCard.tsx` (card compacta para el preview de juegos del Home, distinta de `GameCard.tsx`) y lo necesario para los iconos pixel-art inline (pueden vivir dentro de `app/page.tsx` y `app/acerca-de/page.tsx` como en el prototipo, sin archivo aparte, si no se reutilizan en otra pantalla).
- Todo el copy en español, igual al de `resources/home-about/*.jsx`.
- Responsive igual que en el resto del sitio (1 columna en móvil, más columnas en tablet/desktop) tal como define `styles.css`.

**Explícitamente fuera de alcance (no en este spec):**

- Envío real del formulario de contacto (no hay backend, email o API; el estado "enviado" es solo local, como el resto del sitio).
- Datos reales para el ticker de "Actividad en vivo" y "Top jugadores · hoy": se portan tal cual, hardcodeados, igual que en `home.jsx` (no se conectan a `seededScores` ni a sesión real).
- Cambios al modelo de datos (`lib/data.ts`), a `/salon`, `/auth`, `/juego/[id]` o `/juego/[id]/jugar` más allá de actualizar los enlaces de navegación que apunten a la Biblioteca movida.
- Redirección o alias de la antigua ruta `/` como Biblioteca (quien tenga la URL vieja guardada llega al nuevo Home, no a la Biblioteca).
- Sonido/efectos de audio, SEO/metadata avanzada, sitemap.

---

## Modelo de datos

No se introduce modelo de datos nuevo. El preview de juegos del Home reutiliza `GAMES` de `lib/data.ts` (spec 01) tal cual, tomando los primeros 6 con `GAMES.slice(0, 6)`. Los datos del ticker de actividad y del top de jugadores del Home son un array literal hardcodeado dentro de `app/page.tsx` (igual que en `home.jsx`), no un export de `lib/data.ts`, porque son decorativos y no representan progreso real de ningún usuario.

---

## Plan de implementación

1. **Mover la Biblioteca a `/biblioteca`.** Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (sin cambios). Verificación: `/biblioteca` funciona idéntico a como funcionaba `/` antes de este spec.
2. **CSS del Home y del About.** Añadir a `app/globals.css` las reglas nuevas de `resources/home-about/styles.css` (secciones Home y About/Contact). Verificación: `npm run build`/`npm run dev` no reporta errores de CSS; ninguna clase existente del spec 01 cambió.
3. **Pantalla Home en `/`.** Reescribir `app/page.tsx` con el contenido de `home.jsx` portado a TSX: hero + siluetas SVG, feature grid, preview de juegos con `MiniGameCard` (nuevo componente en `components/`), sección de stats, actividad en vivo + top jugadores, precios + FAQ, CTA final. Los CTAs enlazan con `next/link` a `/biblioteca`, `/auth` y `/salon` según corresponda (revisar `node_modules/next/dist/docs/` si algo de `next/link`/client components no coincide con lo ya usado en el spec 01). Verificación: `/` muestra el landing completo, con animaciones de scroll-reveal, y todos los botones navegan a la ruta correcta.
4. **Pantalla Acerca de en `/acerca-de`.** Crear `app/acerca-de/page.tsx` portado de `about.jsx`: hero de misión + highlights, separador animado, formulario de contacto con validación de vacíos (shake) y vista de "enviado" (terminal falsa), todo en estado local del componente. Verificación: enviar el formulario vacío dispara el shake sin avanzar; llenarlo y enviar muestra la terminal de confirmación con el nombre en mayúsculas; "ENVIAR OTRO MENSAJE" limpia el formulario.
5. **Actualizar `components/Nav.tsx`.** Añadir el enlace "Inicio" (`/`) y "Acerca de" (`/acerca-de`) en el menú de escritorio y el panel móvil; ajustar `isBiblioteca` para que apunte a `/biblioteca` (sigue activo también en `/juego/*`); añadir `isHome`/`isAcercaDe`. Verificación: desde cualquier pantalla, la navbar resalta el enlace correcto según la ruta activa, en escritorio y en el menú móvil.
6. **Pulido final.** Revisar responsive del Home y About en los 3 breakpoints, que las animaciones de entrada/hover funcionen, y que todo el copy esté en español. Verificación: `npm run lint` sin errores; recorrido manual de Home → Biblioteca → Detalle → Salón → Acerca de → Auth y de vuelta, en móvil y desktop.

---

## Criterios de aceptación

- [ ] `npm run dev` levanta la app sin errores y `npm run lint` pasa limpio.
- [ ] `/` muestra el nuevo Home (landing) con hero, features, preview de juegos, stats, actividad en vivo y precios; ya no muestra la Biblioteca.
- [ ] `/biblioteca` muestra exactamente lo que antes mostraba `/` (grid filtrable por texto y categoría).
- [ ] `/acerca-de` muestra la misión, los 3 highlights y el formulario de contacto funcional (validación de vacíos + confirmación simulada).
- [ ] La navbar (escritorio y móvil) tiene los 4 enlaces (Inicio, Biblioteca, Salón de la Fama, Acerca de) y resalta el activo correctamente, incluida la Biblioteca cuando se está en `/juego/*`.
- [ ] Los CTAs del Home ("Explorar juegos", "Crear cuenta", tarjetas de juego, "Ver todos los juegos", "Ver salón", "Empezar gratis", "Insertar moneda") navegan a `/biblioteca`, `/auth`, `/juego/[id]` o `/salon` según corresponda.
- [ ] El tema visual (neón, scanlines, pixel art, glow, reveal-on-scroll) es consistente entre Home, About y las pantallas del spec 01.
- [ ] Ningún dato del spec 01 (`lib/data.ts`, sesión, puntuaciones) cambió de forma incompatible.
- [ ] Todo el texto visible está en español.
- [ ] Home y About se ven correctamente en móvil (1 columna), tablet y desktop, igual que el resto del sitio.

---

## Decisiones tomadas y descartadas

- **`/` pasa a ser Home y la Biblioteca se mueve a `/biblioteca`**, en vez de mantener la Biblioteca en `/` y buscarle otra ruta al Home. Motivo: `resources/home-about/nav.jsx` trata "home" (landing) y "biblioteca" como dos pantallas distintas en la navegación — la única forma de portarlo tal cual es que el landing ocupe la raíz del sitio, como es estándar en un portal de este tipo. No se agrega redirect desde la Biblioteca vieja porque este spec es un MVP visual sin usuarios reales todavía (mismo criterio que el spec 01).
- **Ruta `/acerca-de` en español**, no `/about`. Motivo: coherencia con la decisión ya tomada en el spec 01 de usar rutas en español (`/salon`, `/juego/[id]`).
- **Datos del ticker de actividad y del top de jugadores del Home quedan hardcodeados** dentro de `app/page.tsx`, no en `lib/data.ts`. Motivo: son decorativos y no dependen de `GAMES` ni de la sesión real; moverlos a `lib/data.ts` sería una abstracción sin otro consumidor, en contra del criterio ya usado en el spec 01 de solo centralizar lo que varias pantallas comparten.
- **Sin envío real de contacto ni conexión a `seededScores`/sesión** en la sección de actividad del Home. Motivo: mismo alcance "solo visual, sin backend" ya establecido en el spec 01; agregar cualquiera de las dos sería un spec de backend aparte.
- **Definición rápida sin aclaración detallada por bloques**, a pedido explícito del usuario ("no me hagas pensar", seguir las reglas ya establecidas). Las decisiones de este documento se tomaron aplicando directamente las convenciones ya fijadas en el spec 01 y en los archivos de `resources/home-about/`, sin abrir una ronda de preguntas.

---

## Riesgos identificados

- **Cambiar la ruta raíz rompe cualquier enlace externo o marcador que apuntara a `/` esperando la Biblioteca.** Mitigación: aceptado como parte de la decisión (ver arriba); si se necesita compatibilidad hacia atrás, sería un ajuste menor de un spec futuro (redirect `/` → `/biblioteca` no aplica aquí porque `/` ahora es una pantalla real, no un alias).
- **Next.js 16.3.4 puede diferir de las convenciones de entrenamiento** en `next/link`, layouts o manejo de client components. Mitigación: revisar `node_modules/next/dist/docs/` antes de escribir cada pieza nueva, como ya se hizo en el spec 01.
