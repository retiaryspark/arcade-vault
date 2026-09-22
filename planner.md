# Registro de decisiones — Game Planner

Memoria persistente del agente `game-planner` (`.claude/agents/game-planner.md`).
Cada evaluación de una idea de juego nueva se registra aquí para no repetir
análisis ni contradecir un veredicto anterior sin decirlo explícitamente.

## Formato de entrada

## AAAA-MM-DD — <nombre/concepto de la idea>

**Propuesta:** <resumen de una línea>

- **Sí:** <por qué encaja>. **No:** <riesgos o lo que no encaja>. Motivo: <razón>.

**Veredicto:** Encaja / No encaja / Encaja con ajustes — <una frase>

---

## 2026-09-17 — Arena de Bombas (VERSUS, grid de bombas)

**Propuesta:** Duelo local/vs CPU en un laberinto de rejilla donde dos personajes colocan bombas para destruir muros y eliminar al rival, estilo Bomberman clásico.

- **Sí:** Llena el hueco real del catálogo: VERSUS solo tiene un juego (Duelo Pixel/Pong), así que un segundo título en esa categoría equilibra el catálogo. La mecánica de rejilla + bombas + destrucción de muros no se parece a ninguna de las 8 existentes (ni al pong de Duelo Pixel, ni al puzzle de caída, ni a los shooters, ni al chase de Glotón/Serpentina). El color magenta queda libre dentro de VERSUS (ahí solo se usa cyan en Duelo Pixel); que magenta ya esté en Caída no choca porque el criterio de color es por categoría. Encaja con la estética retro-arena y es portable a motor real siguiendo el patrón SPEC 04/06 (loop propio por rAF, estado discreto por celda, sin audio ni controles táctiles, como ya es norma en el repo).
- **No:** A diferencia de asteroids/caída/bloque-buster, no hay ningún `game.js` de referencia en `resources/started-games/` para este concepto — habría que diseñar la lógica original (propagación de explosión, IA del rival en modo un jugador) en vez de portar algo existente, lo que implica más esfuerzo de implementación y de balance (timers de bomba, radio de explosión) que los juegos ya presentes en el catálogo.

**Veredicto:** Encaja con ajustes — viable como juego original (sin fuente en `resources/started-games/`) en VERSUS con color magenta; para un MVP conviene simplificar la IA del modo un jugador y dejar el balance de bombas como ajuste fino post-lanzamiento.

---

## 2026-09-17 — Cascada de Gemas (PUZZLE, match-3 cyan)

**Propuesta:** Tablero de gemas donde se intercambian piezas adyacentes para formar líneas de 3+ y liberar combos en cascada.

- **Sí:** PUZZLE hoy es un solo juego (Caída), match-3 es un género retro-arcade reconocible y mecánicamente no se parece a la caída de piezas de Tetris (aquí el input es intercambio horizontal/vertical sobre grilla estática, no rotación de piezas que caen). Color cyan está libre en PUZZLE (solo magenta ocupado por Caída). No hay `game.js` de referencia, pero la lógica (grid + detección de líneas + gravedad de relleno) es acotada y portable a motor real siguiendo el patrón SPEC 04/06. **No:** requiere diseñar detección de combos/cascadas desde cero, sin fuente original que portar.
- Motivo: diferenciación real de mecánica frente a Caída y hueco de categoría genuino.

**Veredicto:** Encaja — PUZZLE con color cyan, mecánica de intercambio/combo claramente distinta de la caída de piezas.

---

## 2026-09-17 — Empuje Cuántico (PUZZLE, sokoban verde)

**Propuesta:** Empujar cajas por una grilla hasta ubicarlas en marcadores objetivo, sin poder tirar de ellas, con niveles de dificultad creciente.

- **Sí:** Género sokoban clásico de arcade retro, cero solapamiento con Caída (no hay piezas cayendo ni combos, es planificación espacial paso a paso). Color verde libre en PUZZLE. Encaja con el tono minimalista neón del sitio y es portable como motor TS con estado de grilla discreto, sin física continua. **No:** sin `game.js` de referencia en `resources/started-games/`; el ritmo es más pausado/reflexivo que el resto del catálogo, que es mayormente de reflejos rápidos — vale la pena confirmarlo como variación de tono aceptable dentro de PUZZLE.
- Motivo: hueco de categoría y mecánica genuinamente distinta.

**Veredicto:** Encaja — PUZZLE con color verde, sin solapar con Caída.

---

## 2026-09-17 — Tubería Fantasma (PUZZLE, pipe puzzle amarillo)

**Propuesta:** Conectar segmentos de tubería que aparecen en una cola antes de que el flujo alcance el final del recorrido, estilo Pipe Dream.

- **Sí:** Mecánica de colocación bajo presión de tiempo, distinta de match-3/sokoban/tetris ya cubiertos o propuestos. Color amarillo libre en PUZZLE. Encaja bien con el estilo de tubos/circuitos neón. **No:** tercer PUZZLE propuesto en esta misma tanda (junto a Cascada de Gemas y Empuje Cuántico) — si se aceptaran los tres, PUZZLE pasaría de 1 a 4 juegos de golpe, lo cual es mucho crecimiento simultáneo en una sola categoría; conviene priorizar cuál de los tres se implementa primero en vez de los tres a la vez.
- Motivo: mecánica válida y diferenciada, pero se marca la sobrecarga de propuestas en la misma categoría para decisión humana posterior.

**Veredicto:** Encaja — PUZZLE con color amarillo; recomendable escalonar su entrada si se aprueban varias ideas de PUZZLE a la vez.

---

## 2026-09-17 — Simón Neón (PUZZLE, memoria de secuencias)

**Propuesta:** Repetir una secuencia de colores/sonidos que crece en cada ronda, estilo Simon.

- **Sí:** Mecánica de memoria pura, no se parece a nada del catálogo ni a las otras propuestas PUZZLE de esta tanda. Extremadamente simple de portar a motor real (estado = secuencia + índice, sin física). **No:** con cyan, verde y amarillo ya asignados a otras propuestas PUZZLE de esta misma tanda, solo queda magenta libre, que ya usa Caída dentro de PUZZLE — hay choque de color dentro de la categoría.
- Motivo: mecánica sólida pero color no disponible sin reasignar la paleta.

**Veredicto:** Encaja con ajustes — resolver el choque de color con Caída (magenta) antes de sumarlo, por ejemplo si no se aprueban todas las propuestas PUZZLE de esta tanda.

---

## 2026-09-17 — Blobs de Colores (PUZZLE, caída de pares estilo Puyo Puyo)

**Propuesta:** Pares de blobs de colores caen y se combinan por adyacencia de color para eliminarse en cadena, con blobs "basura" que caen si el rival (o el ritmo) sube de nivel.

- **Sí:** Género hermano de Tetris pero mecánicamente distinto (eliminación por color-matching y reacciones en cadena, no limpieza de líneas completas); tiene precedente real en arcades retro junto a Tetris. **No:** comparte con Caída el esqueleto de "piezas que caen por gravedad en una grilla vertical", por lo que el jugador puede percibirlo como una variante menor de Caída más que un juego distinto; además todos los colores de PUZLE quedan tomados por las otras propuestas de esta tanda, forzando reutilizar cyan (ya asignado a Cascada de Gemas).
- Motivo: cercanía mecánica con Caída y choque de color simultáneo son dos señales de riesgo, no una sola.

**Veredicto:** Encaja con ajustes — si se implementa, diferenciar visualmente y en reglas de forma marcada frente a Caída (p. ej. sin rotación de piezas, foco 100% en cadenas de color) y resolver el color antes de sumarlo.

---

## 2026-09-17 — Comando Orbital (SHOOTER, misiles cian)

**Propuesta:** Defender bases en la parte inferior de la pantalla apuntando y detonando misiles interceptores contra una lluvia de proyectiles enemigos, estilo Missile Command.

- **Sí:** SHOOTER hoy tiene Invasores (oleadas horizontales) y Asteroids (nave libre en el vacío); esto es un tercer patrón de juego distinto: mira/apunta con cursor y defensa estática de objetivos, sin nave que se mueve. Color cyan libre en SHOOTER. Portable a motor real con el mismo patrón de clase TS + canvas fijo. **No:** sin `game.js` de referencia en `resources/started-games/`, hay que diseñar la lógica de trayectorias/explosiones desde cero.
- Motivo: mecánica de "defensa por objetivo" claramente distinta de las dos ya presentes en SHOOTER.

**Veredicto:** Encaja — SHOOTER con color cyan, patrón de juego nuevo dentro de la categoría.

---

## 2026-09-17 — Vector Fuga (SHOOTER, scroll lateral magenta)

**Propuesta:** Shooter de scroll lateral continuo (estilo R-Type): la nave avanza automáticamente por un escenario horizontal esquivando terreno y enemigos mientras dispara.

- **Sí:** Diferente de Invasores (oleada estática vertical) y Asteroids (arena libre sin scroll): aquí el desplazamiento continuo del escenario es el eje central del reto. Color magenta libre en SHOOTER. **No:** el scroll lateral obliga a generar/streamear el nivel (patrones de terreno y oleadas), más trabajo de diseño de contenido que un shooter de arena fija.
- Motivo: mecánica de scroll forzado es una tercera variante genuina dentro de SHOOTER.

**Veredicto:** Encaja — SHOOTER con color magenta, variante de scroll lateral no cubierta.

---

## 2026-09-17 — Jefe Final (SHOOTER, bullet-hell contra un solo jefe)

**Propuesta:** Enfrentamiento continuo contra un único jefe con patrones de balas cada vez más intrincados que hay que esquivar mientras se dispara a su punto débil, estilo bullet-hell.

- **Sí:** El foco en esquivar patrones de balas (en vez de eliminar oleadas de enemigos menores) es una identidad de juego distinta de Invasores/Asteroids/Comando Orbital/Vector Fuga. **No:** con cyan y magenta ya asignados a Comando Orbital y Vector Fuga en esta misma tanda, este necesitaría reutilizar cyan (choque con Comando Orbital) dentro de SHOOTER; además el diseño de patrones de balas variados y escalantes es notablemente más complejo de balancear que el resto del catálogo.
- Motivo: mecánica válida pero mayor costo de diseño y color repetido dentro de la categoría.

**Veredicto:** Encaja con ajustes — resolver el color (evitar duplicar cyan dentro de SHOOTER si se implementan varias propuestas juntas) y acotar el MVP a un solo patrón de jefe simple antes de escalar la dificultad.

---

## 2026-09-17 — Escuadrón Fénix (SHOOTER, oleadas en picada)

**Propuesta:** Formación de enemigos que descienden en oleadas y realizan pasadas en picada individuales hacia el jugador, estilo Galaga.

- **Sí:** Visualmente vistoso y con precedente arcade fuerte. **No:** mecánicamente es una variación directa de Invasores (oleada de enemigos alienígenas descendiendo sobre un cañón que se mueve en horizontal); el añadido de "picadas individuales" es un ajuste de comportamiento de IA, no un cambio de género — un jugador lo percibiría como "Invasores con enemigos que se lanzan" más que como un juego distinto. Además todos los colores de SHOOTER quedarían tomados por las otras tres propuestas de esta tanda.
- Motivo: no hay diferenciación real de mecánica frente a Invasores, que es justo el criterio que más pesa en la evaluación.

**Veredicto:** No encaja — demasiado cercano a Invasores; si se quisiera explorar la idea, debería presentarse como una actualización/variante de Invasores, no como juego nuevo del catálogo.

---

## 2026-09-17 — Hockey de Neón (VERSUS, air hockey verde)

**Propuesta:** Air hockey de dos jugadores: cada uno mueve un mazo libremente en su mitad de la mesa (movimiento en 2 ejes, no solo vertical) para meter un disco en la portería rival.

- **Sí:** VERSUS hoy solo tiene Duelo Pixel (Pong: paletas fijas en el eje horizontal, movimiento solo vertical, pelota rebota solo arriba/abajo). Air hockey cambia el eje de movimiento a 2D libre dentro de la mitad de cada jugador y añade porterías en vez de límites laterales — diferenciación real de físicas y de objetivo aunque el género "raíz" (pelota + paletas) sea primo del Pong. Color verde libre en VERSUS. **No:** el parecido conceptual con Duelo Pixel (pelota + control de paleta) es innegable y hay que comunicarlo bien en el copy para que no se perciba como "el mismo Pong con otro cover".
- Motivo: mecánica de movimiento 2D libre + porterías es una diferenciación real, no cosmética, frente a Duelo Pixel.

**Veredicto:** Encaja — VERSUS con color verde; cuidar el copy/arte para distinguirlo claramente de Duelo Pixel en la biblioteca.

---

## 2026-09-17 — Duelo de Tanques (VERSUS, arena de tanques amarillo)

**Propuesta:** Dos tanques en una arena con obstáculos se disparan proyectiles que rebotan en las paredes, último en pie gana la ronda.

- **Sí:** Mecánica de proyectil con rebote + terreno destructible/obstáculos es distinta de Pong (rebote simple sin obstáculos) y de Arena de Bombas (colocación de bombas en rejilla, sin disparo directo ni proyectiles). Color amarillo libre en VERSUS. Buen fit temático retro (Combat de Atari). **No:** sin `game.js` de referencia, hay que diseñar física de rebote de proyectiles y colisión con obstáculos desde cero.
- Motivo: tercera identidad de juego dentro de VERSUS, sin solapar con Pong ni con Arena de Bombas.

**Veredicto:** Encaja — VERSUS con color amarillo, mecánica de disparo/rebote no cubierta.

---

## 2026-09-17 — Golpe Pixel (VERSUS, combate 1v1 lateral)

**Propuesta:** Juego de pelea 2D de scroll lateral, dos personajes con golpe/patada/bloqueo y barra de vida, primero en vaciar la del rival gana.

- **Sí:** Género de pelea es una identidad de juego totalmente distinta de Pong/Bombas/Tanques/Hockey (combate cuerpo a cuerpo con estados de animación y prioridades de ataque, no física de proyectil/pelota). **No:** con verde y amarillo ya tomados por Hockey de Neón y Duelo de Tanques en esta misma tanda, este repetiría verde dentro de VERSUS; además el sistema de hitboxes/estados de ataque-bloqueo es notablemente más complejo de portar a motor real que el resto del catálogo (no es solo movimiento + colisión simple).
- Motivo: mecánica muy diferenciada pero mayor costo de implementación y color repetido si se suma junto a las otras propuestas VERSUS.

**Veredicto:** Encaja con ajustes — validar el costo de implementación del sistema de combate antes de comprometerlo y resolver el color si se aprueban varias propuestas VERSUS a la vez.

---

## 2026-09-17 — Serpiente Rival (VERSUS, dos serpientes)

**Propuesta:** Versión a dos jugadores de Serpentina: cada serpiente compite por la misma comida en la grilla y pierde si choca contra cualquier cuerpo (propio o rival).

- **Sí:** Encajaría en el hueco de VERSUS y es fácil de portar reutilizando la lógica de Serpentina. **No:** la mecánica central (serpiente que crece en una grilla y muere al chocar) es literalmente la de Serpentina; agregar un segundo jugador es un modo de juego, no un juego distinto — es el mismo caso que ya se descartó para "Escuadrón Fénix" frente a Invasores: convertir un juego existente en versus no genera diferenciación real de mecánica, que es el criterio que más pesa.
- Motivo: duplica la mecánica de Serpentina (ya en el catálogo como ARCADE); no aporta un género nuevo a VERSUS.

**Veredicto:** No encaja — es un modo versus de Serpentina, no un juego nuevo; si se quiere explorar, sería una mejora de Serpentina (agregar segundo jugador local), no una entrada nueva al catálogo.

---

## 2026-09-17 — Pinball Neón (ARCADE, flippers magenta)

**Propuesta:** Mesa de pinball de una sola pantalla con flippers, bumpers y rampas, puntuación por combos de golpes.

- **Sí:** ARCADE hoy tiene 4 juegos (Bloque Buster/cyan, Serpentina/verde, Ranaria/verde, Glotón/amarillo) y magenta está libre en la categoría. Pinball es una identidad de juego de física continua (bola + flippers) que no se parece a ninguno de los 4 existentes ni a Bloque Buster (que sí tiene pelota y paleta, pero es rompe-bloques con paleta única horizontal, no una mesa con flippers duales y gravedad). **No:** requiere un motor de física de colisión más fino (ángulos de flipper, rebote en bumpers) que el resto del catálogo ARCADE.
- Motivo: mecánica de física distinta a Bloque Buster pese a compartir "pelota que rebota", y color disponible sin choque.

**Veredicto:** Encaja — ARCADE con color magenta, único hueco de color libre en la categoría.

---

## 2026-09-17 — Fuga de Neón (ARCADE, endless runner)

**Propuesta:** Corredor sin fin de un solo carril: el personaje avanza automáticamente y el jugador solo salta/agacha para esquivar obstáculos, la velocidad sube con el tiempo.

- **Sí:** Mecánica de reflejo de un solo botón/input binario, distinta de todo lo demás en ARCADE (nada del catálogo es un runner automático). Encaja perfecto con el tono de sesiones cortas y "racha" del sitio. **No:** magenta ya quedó asignado a Pinball Neón en esta misma tanda, así que repetiría color dentro de ARCADE si se suman ambas propuestas.
- Motivo: mecánica válida y diferenciada, pero color repetido si se aprueban ambas ideas ARCADE de esta tanda.

**Veredicto:** Encaja con ajustes — resolver el color con Pinball Neón antes de sumar ambas (o priorizar solo una en el mismo lote).

---

## 2026-09-17 — Excavador X (ARCADE, túneles estilo Dig Dug)

**Propuesta:** Cavar túneles bajo tierra para atrapar/inflar enemigos hasta reventarlos o aplastarlos con rocas, en una grilla subterránea.

- **Sí:** Mecánica de "crear el propio camino cavando" es distinta de la persecución en laberinto fijo de Glotón (el laberinto de Glotón es estático, aquí el jugador lo construye). **No:** el color amarillo ya lo usa Glotón dentro de ARCADE, así que hay choque directo de color con un juego ya existente en el catálogo (no solo con otra propuesta de esta tanda).
- Motivo: mecánica distinta de Glotón pese a la superficie "laberinto + enemigos que persiguen", pero color en conflicto real con el catálogo actual.

**Veredicto:** Encaja con ajustes — mecánica válida, pero requiere reasignar el color (amarillo ya ocupado por Glotón en ARCADE).

---

## 2026-09-17 — Golpe Rápido (ARCADE, whack-a-mole)

**Propuesta:** Grilla de agujeros donde figuras aparecen brevemente y hay que "golpearlas" (click/tecla por posición) antes de que se escondan, contra el reloj.

- **Sí:** Mecánica de reflejo puro sobre grilla estática con inputs discretos por celda, no hay nada parecido en ARCADE (ni scroll, ni movimiento de un personaje). Muy simple de portar a motor real (estado = grilla de celdas activas + temporizador). **No:** cyan ya lo usa Bloque Buster dentro de ARCADE, así que también hay choque de color con el catálogo existente, no solo entre propuestas nuevas.
- Motivo: mecánica genuinamente nueva en ARCADE, pero color en conflicto con Bloque Buster.

**Veredicto:** Encaja con ajustes — mecánica válida, resolver el color (cyan ya ocupado por Bloque Buster en ARCADE).

---

## 2026-09-17 — Laberinto Inclinado (ARCADE, bola con inclinación)

**Propuesta:** Inclinar un laberinto (con flechas/teclas) para hacer rodar una bola hasta la meta evitando caer por agujeros, contrarreloj.

- **Sí:** Mecánica de física de inclinación/gravedad indirecta (el jugador no controla la bola directamente, controla el tablero) es única en el catálogo. **No:** verde ya está usado dos veces dentro de ARCADE (Serpentina y Ranaria), así que sumar un tercer juego verde profundiza una sobrecarga de color que ya existe en el catálogo actual, en vez de aprovechar el único hueco real (magenta, ya propuesto para Pinball Neón en esta tanda).
- Motivo: mecánica válida pero el color elegido agrava un desequilibrio de paleta ya presente en ARCADE.

**Veredicto:** Encaja con ajustes — mecánica interesante, pero conviene elegir un color distinto de verde dado que ARCADE ya tiene dos juegos verdes.

---

## 2026-09-17 — Torres al Asalto (ARCADE, tower defense)

**Propuesta:** Colocar torretas a lo largo de un camino para detener oleadas de enemigos que avanzan hacia una base, con economía de puntos para comprar/mejorar torretas.

- **Sí:** Género con estética retro-neón fácil de lograr visualmente. **No:** rompe el tono de reflejos inmediatos de todo el catálogo (incluidos los otros 7 juegos y las 19 propuestas restantes de esta tanda): tower defense es gestión de recursos y planificación en tiempo no crítico, no una sesión corta de reacción/puntería/reflejos como Bloque Buster, Serpentina, Invasores, etc. Tampoco existe una categoría de "estrategia" entre ARCADE/PUZZLE/SHOOTER/VERSUS, y forzarlo en ARCADE sería una etiqueta engañosa para el jugador que espera acción directa.
- Motivo: desajuste de tono/ritmo con el resto del catálogo, no es un problema de color o de categoría disponible sino de encaje de fondo con la identidad "arcade de reflejos" del sitio.

**Veredicto:** No encaja — el ritmo de gestión/planificación de tower defense no encaja con la identidad de reflejos inmediatos del resto del catálogo; no hay categoría adecuada para él sin desnaturalizar ARCADE.

---

## 2026-09-17 — Golf Retro (ARCADE, mini-golf de apuntado)

**Propuesta:** Minigolf de una sola pantalla por hoyo: apuntar dirección y potencia con barra de carga, golpear la bola y llegar al hoyo en el menor número de golpes posible antes de que se acabe el tiempo.

- **Sí:** Mecánica de "apuntar + cargar potencia + soltar" es un input completamente distinto de todo lo demás del catálogo (nada usa un sistema de carga de potencia). Encaja con el tono retro-arcade de mesa de recreativos clásica. **No:** cyan ya está usado por Bloque Buster en ARCADE (y quedaría además duplicado con Golpe Rápido si se suman ambas propuestas de esta tanda), así que el color necesita reasignarse igual que varias otras propuestas ARCADE de este lote.
- Motivo: mecánica de apuntado/potencia sin precedente en el catálogo, pero color en conflicto doble (con el catálogo y con otra propuesta de esta tanda).

**Veredicto:** Encaja con ajustes — mecánica distintiva, resolver el color (cyan ya sobrecargado en ARCADE con Bloque Buster y con Golpe Rápido en esta misma tanda).

---

## 2026-09-17 — Combo Cristal (PUZZLE, match-3)

**Propuesta:** Match-3 clásico: intercambia gemas neón adyacentes en una grilla para alinear 3 o más del mismo color y detonarlas antes de agotar movimientos/tiempo.

- **Sí:** PUZZLE hoy solo tiene un juego (Caída, magenta) — hueco real de categoría y colores libres (cyan/green/yellow) sin chocar. Mecánica de intercambio-y-alineación no está cubierta por ningún juego del catálogo (Caída es piezas que descienden y encastran, no swap en grilla estática). Motor real directo: grilla fija, estado por celda, detección de matches, sin física de gravedad compleja. **No:** se parece superficialmente a Caída en que ambos son PUZZLE de grilla con neón; hay que diferenciar visualmente el tablero (estático vs. pieza cayendo). Nota: esta idea coincide en esencia con "Cascada de Gemas" (match-3, cyan) ya registrada arriba en esta misma tanda — son la misma propuesta generada por dos procesos paralelos distintos.
- Motivo: cubre un submodo de puzzle (combinación por intercambio) ausente del catálogo.

**Veredicto:** Encaja — duplicado de concepto con "Cascada de Gemas"; tratar como una sola propuesta si se avanza.

---

## 2026-09-17 — Cascada de Orbes (PUZZLE, pares estilo Puyo Puyo)

**Propuesta:** Puzzle de pares de orbes de colores que caen por parejas; se agrupan 4+ del mismo color en contacto (no en línea) para detonarlos, con reacciones en cadena, estilo Puyo Puyo.

- **Sí:** Distinto de Caída en la regla de limpieza (agrupación por color/contacto vs. línea horizontal completa) y en la forma de la pieza (par de orbes vs. tetromino). Color yellow libre en PUZZLE. Portable a motor real con el mismo patrón (loop propio, columna con gravedad, `handleKeyDown` para mover/rotar el par). **No:** coincide en esencia con "Blobs de Colores" ya registrada arriba en esta misma tanda (ambas son Puyo Puyo-like) — mismo caso de duplicado por generación paralela sin visibilidad cruzada.
- Motivo: mecánica de agrupación por contacto con reacciones en cadena, ya cubierta por "Blobs de Colores".

**Veredicto:** Encaja con ajustes — duplicado de concepto con "Blobs de Colores"; consolidar en una sola propuesta antes de avanzar.

---

## 2026-09-17 — Secuencia Neón (PUZZLE, memoria tipo Simon)

**Propuesta:** Puzzle de memoria visual: paneles de la grilla se iluminan en secuencia creciente y el jugador debe repetirla con teclado/clic, sin sonido, apoyándose en color+forma para el refuerzo.

- **Sí:** Mecanismo de memoria de secuencias claramente distinto a los 8 juegos existentes. PUZZLE hoy solo usa magenta (Caída), verde queda libre. Portable al patrón SPEC 04/06: state machine simple. **No:** Simon-says depende culturalmente del audio para diferenciar cada botón; al quitarlo ("sin audio" está fuera de alcance) se pierde parte de la identidad del género y hay que compensar con contraste visual fuerte. Coincide en esencia con "Simón Neón" ya registrada arriba en esta misma tanda (mismo concepto, generado por otro proceso en paralelo).
- Motivo: mecánica diferenciadora, duplicada con "Simón Neón".

**Veredicto:** Encaja con ajustes — duplicado de concepto con "Simón Neón"; reforzar feedback visual (flash + forma, no solo color) para compensar la falta de audio.

---

## 2026-09-17 — Pulso (ARCADE, reflejos de estímulo/respuesta)

**Propuesta:** Arcade de reacción pura: círculos de color aparecen brevemente en posiciones aleatorias del canvas y el jugador debe pulsar/clicar antes de que se apaguen, con ventana de tiempo que se acorta según el puntaje.

- **Sí:** Genuinamente distinto a los 8 juegos del catálogo: no hay memoria de patrón ni movimiento continuo de nave/serpiente/paleta, es puro tiempo de reacción a estímulos discretos. ARCADE ya usa cyan, verde y amarillo, dejando magenta libre. No depende de audio en absoluto. Portable al patrón SPEC 04/06. **No:** el más minimalista posible del catálogo — sin niveles, oponentes ni power-ups — necesita variedad de tipos de estímulo para no ser trivial.
- Motivo: encaja de lleno en reflejos puros y no invade terreno de nadie.

**Veredicto:** Encaja con ajustes — ARCADE con color magenta, añadiendo variantes de estímulo (señuelos, rachas, dobles objetivos) para sostener el interés.

---

## 2026-09-17 — Fuga Neón (ARCADE, endless runner horizontal)

**Propuesta:** Endless runner horizontal: silueta corriendo sin fin, salta y se desliza para esquivar obstáculos que aceleran con el tiempo.

- **Sí:** Mecánica de salto/esquivar con scroll lateral no está cubierta por ningún juego actual. Portable a motor real con el mismo patrón de SPEC 04. **No:** ARCADE ya tiene 4 juegos, compite por atención dentro de la misma etiqueta. Coincide en esencia con "Fuga de Neón" (ARCADE, endless runner) ya registrada arriba en esta misma tanda — mismo concepto y hasta nombre casi idéntico, generado por otro proceso en paralelo sin visibilidad cruzada.
- Motivo: duplicado directo de "Fuga de Neón".

**Veredicto:** Encaja — duplicado de concepto (y de nombre) con "Fuga de Neón"; consolidar como una sola propuesta.

---

## 2026-09-17 — Escalada Infinita (ARCADE, climber vertical de físicas)

**Propuesta:** Plataformero vertical estilo Doodle Jump: el personaje salta automáticamente entre plataformas que se desplazan hacia abajo, evitando caer y esquivando enemigos/huecos, con power-ups tipo resorte.

- **Sí:** El eje vertical continuo (física de salto libre, cámara que sube sin fin) no existe en el catálogo. **No:** se parece conceptualmente a Ranaria (progreso vertical esquivando obstáculos), aunque la mecánica real es distinta (físicas continuas vs. lanes discretos); riesgo de percepción como "Ranaria 2.0". Colores libres en ARCADE se agotan rápido si se suman varias propuestas de esta categoría a la vez.
- Motivo: mecánica distinta pero necesita ajuste de encuadre para no sentirse un clon de Ranaria.

**Veredicto:** Encaja con ajustes — dejar explícito en el copy que es un climber de físicas continuas (no lanes), y priorizar solo si no compite de color con otras propuestas ARCADE ya aceptadas.

---

## 2026-09-17 — Muro Neón (SHOOTER, tower defense de carril único)

**Propuesta:** Tower defense de carril único: colocas torretas de neón en una franja para frenar oleadas de enemigos antes de que lleguen al núcleo.

- **Sí:** Hueco real en SHOOTER (solo hay disparo directo — Invasores/Asteroids —, nunca defensa por colocación); magenta libre en esa categoría. Portable a motor TS (grid fijo, loop de oleadas). **No:** si se le suma economía de recursos o árbol de mejoras se vuelve gestión larga, no arcade de minutos — mismo riesgo de fondo señalado para "Torres al Asalto" (rechazada arriba en esta tanda), aunque aquí el alcance se recorta explícitamente a un solo carril.
- Motivo: cubre un hueco de mecánica (colocar vs. controlar) sin duplicar Invasores/Asteroids, siempre que se recorte el alcance a sesión corta.

**Veredicto:** Encaja con ajustes — recortar a un solo carril, sin economía compleja, para no caer en el mismo desajuste de tono que hizo descartar "Torres al Asalto".

---

## 2026-09-17 — Núcleo Asediado (ARCADE, defensa radial 360°)

**Propuesta:** Defensa radial 360°: rotas una torreta central y disparas mientras oleadas convergen desde los bordes del canvas hacia el núcleo.

- **Sí:** Diferenciador claro frente a "Muro Neón" (acción en tiempo real, no colocación estratégica) y frente al resto del catálogo; magenta libre en ARCADE. Loop "rotar y disparar" simple de portar. **No:** si se agregan muros colocables o fases de construcción se acerca a un tower defense clásico de sesión larga; comparte superficialmente "rotar y disparar" con Asteroids.
- Motivo: la mecánica base roza a Asteroids; el diferenciador (núcleo fijo, oleadas convergentes) solo se sostiene si se evita expandirlo a gestión de defensas.

**Veredicto:** Encaja con ajustes — mantenerlo como acción pura (rotar/disparar sobre núcleo fijo) sin capas de construcción.

---

## 2026-09-17 — Fuga Orbital (ARCADE, esquive vertical top-down)

**Propuesta:** Nave/vehículo en scroll vertical continuo que esquiva tráfico de obstáculos cada vez más rápido; puntuación por distancia sobrevivida, sin disparo.

- **Sí:** Mecánica de esquive continuo con velocidad creciente no existe en el catálogo: Ranaria es cruce discreto por carriles con pantalla fija, mientras esto es scroll infinito con ritmo en aumento tipo runner. No choca con Asteroids/Invasores porque no hay disparo. Magenta libre en ARCADE. **No:** no hay `game.js` de referencia; el balance de velocidad y generación de obstáculos se diseña desde cero. Compite por el mismo hueco de color/nicho "esquive continuo" que "Fuga Neón"/"Fuga de Neón" y "Pulso" en esta misma tanda.
- Motivo: mecánica y color diferenciados dentro de ARCADE, pero hay saturación de propuestas de "esquivar cosas que vienen" en este lote.

**Veredicto:** Encaja — mecánica diferenciada; priorizar frente a las otras propuestas de esquive similares antes de aceptar varias juntas.

---

## 2026-09-17 — Gran Premio Neón (VERSUS, carrera de circuito top-down)

**Propuesta:** Carrera local a dos jugadores en circuito top-down (WASD vs flechas), compitiendo por vueltas/posición sobre un trazado con curvas y muros.

- **Sí:** VERSUS hoy tiene poca densidad; una carrera de circuito con física de aceleración/giro y colisión contra muros es mecánicamente distinta de Pong, Arena de Bombas, Hockey de Neón y Duelo de Tanques (todos ya registrados). Amarillo libre en VERSUS si Duelo de Tanques no se implementa, o se necesita otro color si sí. **No:** requiere diseñar física de vehículo y trazado de circuito sin fuente original; dos jugadores en el mismo teclado físico puede generar conflictos de teclas.
- Motivo: viable en VERSUS pero el spec debe fijar el mapeo de teclas y el color según qué otras propuestas VERSUS se aprueben.

**Veredicto:** Encaja con ajustes — el spec debe fijar el mapeo de teclas sin conflicto y resolver el color según el resto de propuestas VERSUS aceptadas.

---

## 2026-09-17 — Sigilo Neón (ARCADE, evasión por visión)

**Propuesta:** Infiltración top-down en instalación neón: guardias patrullan con conos de visión cónicos, el jugador debe alcanzar la salida sin llenar un medidor de detección, usando cajas/sombras como cobertura.

- **Sí:** Núcleo de juego distinto a los 8 existentes: no hay recolección de puntos como eje central (Glotón) ni cruce de carriles a tiempo (Ranaria) ni disparo (Invasores/Asteroids); el diferenciador real es el cono de visión + medidor de detección + cobertura. Magenta libre en ARCADE (compite por ese mismo hueco con Pinball Neón, Pulso, Fuga Neón/Núcleo Asediado ya registrados en esta tanda). **No:** sin fuente en `resources/started-games/`; riesgo de sentirse más lento/menos arcade que el resto del catálogo, que es todo de reflejos rápidos.
- Motivo: mecánica ausente del catálogo, pero color magenta muy disputado en esta tanda y ritmo a cuidar.

**Veredicto:** Encaja con ajustes — cuidar el ritmo/balance de detección para que no se sienta lento; resolver el color frente a las otras propuestas magenta de ARCADE.

---

## 2026-09-17 — Laberinto en la Oscuridad (PUZZLE, niebla de guerra)

**Propuesta:** Laberinto procedural visible solo dentro de un radio de luz alrededor del jugador; hay que llegar a la salida antes de que se agote un "combustible de luz" (recargable con orbes), sin enemigos que persigan activamente.

- **Sí:** Diferenciación clara frente a Glotón (chase directo en rejilla totalmente visible) y Ranaria (cruce de carriles con timing): aquí el reto es memoria espacial + gestión de un recurso en un mapa parcialmente oculto. PUZZLE hoy solo tiene Caída (magenta); green libre. **No:** sin enemigos que se muevan, riesgo de sentirse más cercano a un "walking sim" que a un arcade de reflejos; generación procedural del laberinto debe garantizar siempre una salida alcanzable.
- Motivo: mecánica de exploración/gestión de recurso ausente del catálogo, con riesgo de tono y de generación injusta si no se valida el algoritmo.

**Veredicto:** Encaja con ajustes — añadir presión de tiempo/luz agresiva y validar que la generación del laberinto siempre tenga solución alcanzable.

---

## 2026-09-17 — Mano Rápida (VERSUS, RPS con cronómetro)

**Propuesta:** Duelo 1v1 de piedra-papel-tijera-lagarto-Spock por rondas, con una ventana de tiempo decreciente para fijar la jugada (de ~2s a ~0.4s), rachas y un gesto especial de un solo uso desbloqueado por un medidor de "sobrecarga".

- **Sí:** Mecánica de decisión simultánea que ningún otro juego del catálogo cubre; el cronómetro decreciente conserva tensión de reflejos. Portable a motor real: barra de tiempo por rAF, `handleKeyDown` mapeando teclas a gestos. **No:** sigue siendo fundamentalmente "elegir y esperar resultado", sin control continuo del avatar entre rondas, lo que rompe parcialmente la sensación de "pilotar algo" de los otros 7 juegos.
- Motivo: el cronómetro decreciente es el ajuste mínimo que salva la identidad arcade frente a ser un juego de mesa digital.

**Veredicto:** Encaja con ajustes — solo si se conserva la presión de tiempo por ronda como mecánica central, no como decoración.

---

## 2026-09-17 — Duelo de Cartas de Energía (VERSUS, cartas por turnos)

**Propuesta:** Duelo 1v1 por turnos con un mazo de cartas de "energía neón" (ataque, escudo, robo, combo) elegido desde un menú cada turno, sin límite de tiempo, hasta que un jugador agota sus puntos de vida.

- **Sí:** Diferenciación de mecánica total (ningún juego actual usa cartas ni gestión de recursos por turno); estética de cartas con glow neón encajaría visualmente. **No:** no hay ninguna acción continua ni control por teclado en tiempo real — es 100% navegación de menú y espera del turno del rival —, lo que choca de fondo con la identidad "arcade" del sitio y con el patrón de motor (`handleKeyDown/Up` para input continuo, loop con `dt`) que asumen SPEC 04/06.
- Motivo: el desencaje no es de categoría ni de color, es de género completo — un juego de mesa digital no es un arcade.

**Veredicto:** No encaja — el resto del catálogo vive de control en tiempo real y este concepto elimina esa capa por completo.

---

## 2026-09-17 — Choque Glaciar (VERSUS, air hockey de gravedad cero)

**Propuesta:** Air-hockey neón 1v1: mesa horizontal con gravedad cero, mazos que se mueven libremente en 2D dentro de su mitad, disco que rebota en paredes superior/inferior y anota al cruzar la portería del rival.

- **Sí:** Movimiento de mazo en 2 ejes (no 1 solo como Duelo Pixel) y rebotes en 4 paredes + gol lateral son mecánica claramente distinta a Pong. Coincide en esencia con "Hockey de Neón" ya registrada arriba en esta misma tanda (mismo concepto de air hockey, generado por otro proceso en paralelo). **No:** requiere IA de rival o modo 2P local, y balancear física de rebote/fricción del disco puede pedir más ajuste que un Pong simple.
- Motivo: duplicado directo de "Hockey de Neón".

**Veredicto:** Encaja — duplicado de concepto con "Hockey de Neón"; consolidar como una sola propuesta.

---

## 2026-09-17 — Saque Neón (VERSUS, voleibol con gravedad)

**Propuesta:** Voleibol arcade 1v1 con red central: pelota con arco parabólico (gravedad), cada jugador controla un pixel que salta para golpear/rematar antes de que la pelota toque su lado.

- **Sí:** Mecánica ausente en el catálogo (salto + gravedad + red, timing de remate), diferenciada tanto de Duelo Pixel como de Choque Glaciar/Hockey de Neón (sin salto ni gravedad). **No:** física de arco y colisión pelota-jugador-red es más compleja de calibrar que un rebote lineal; visualmente puede parecerse a un "Pong con salto" si no se distingue bien la red y el arco.
- Motivo: la gravedad/salto es un sistema de juego nuevo para el sitio, con mayor costo de calibración pero clara diferenciación mecánica.

**Veredicto:** Encaja con ajustes — definir bien el arco/gravedad y la red para que no se perciba como una variante menor de Pong.

---

## 2026-09-17 — Golf Orbital (PUZZLE, mini-golf con pozos de gravedad)

**Propuesta:** Puzzle de trayectorias: apuntas y cargas potencia para meter una bola de luz en el hoyo, sorteando pozos de gravedad y obstáculos reflectantes por nivel.

- **Sí:** Mecánica de apuntar+cargar potencia+trayectoria curva por gravedad es un género completo distinto del descenso de piezas de Caída y del rebote paleta-bola de Bloque Buster. Coincide en esencia con "Golf Retro" (ARCADE, ya registrada arriba en esta tanda) — mismo concepto base (apuntar/cargar potencia/minigolf), aunque aquí se propone en PUZZLE con niveles fijos en vez de ARCADE de una sola pantalla contrarreloj. **No:** requiere diseñar progresión de niveles, a diferencia de los juegos actuales de un solo escenario infinito; sin fuente en `resources/started-games/`.
- Motivo: mecánica de minigolf duplicada con "Golf Retro"; la categoría (PUZZLE vs ARCADE) es la única diferencia real entre ambas propuestas.

**Veredicto:** Encaja con ajustes — solapa con "Golf Retro"; decidir una sola categoría (PUZZLE con niveles vs. ARCADE contrarreloj) antes de avanzar, no ambas.

---

## 2026-09-17 — Billar Neón (VERSUS, duelo de bolas)

**Propuesta:** Duelo local/vs CPU de billar simplificado: cada jugador apunta con un taco de luz y golpea bolas que rebotan y colisionan elásticamente entre sí hasta embocar en las troneras.

- **Sí:** Mecánica de apuntar+potencia+colisión elástica multi-bola por turnos es distinta del reflejo continuo de Duelo Pixel y del rebote paleta-bola de Bloque Buster. Portable al patrón SPEC 04/06 con motor de colisiones círculo-círculo. **No:** un motor de colisiones elásticas entre múltiples bolas es más complejo de balancear que el resto del catálogo VERSUS/ARCADE actual; sin fuente en `resources/started-games/`, similar en esfuerzo a Arena de Bombas.
- Motivo: encaja de categoría, pero el motor físico es notablemente más pesado que el resto del catálogo.

**Veredicto:** Encaja con ajustes — limitar a 2-3 bolas y una tronera simple para el MVP, dejando fricción/spin avanzado y la IA fina como ajuste post-lanzamiento.

---

## 2026-09-17 — Cripta Neón (SHOOTER, sala única con oleadas)

**Propuesta:** Dungeon crawler de disparo top-down en una sola sala fija: el jugador se mueve y dispara en 8 direcciones mientras oleadas de enemigos cada vez más numerosas invaden la habitación; la run termina al morir, con puntaje por oleadas superadas.

- **Sí:** Cubre SHOOTER con movimiento libre (no fijo horizontal como Invasores, no rotación/gravedad como Asteroids). El patrón de "una sola sala, canvas fijo, oleadas con contador de dificultad" encaja directo con el MVP simple de SPEC 04/06. **No:** sin fuente en `resources/started-games/`, la lógica de spawn/dificultad se diseña desde cero; color a resolver frente a Comando Orbital/Vector Fuga/Jefe Final ya registrados en SHOOTER en esta tanda.
- Motivo: mecánica distinta a las 8 existentes y a las otras propuestas SHOOTER, complejidad de MVP alineada con el patrón ya usado.

**Veredicto:** Encaja — resolver el color frente a las otras 3 propuestas SHOOTER de esta misma tanda antes de sumarlo.

---

## 2026-09-17 — Descenso (SHOOTER, mazmorra multi-sala procedural)

**Propuesta:** Roguelike de mazmorra con salas conectadas por puertas: el jugador debe limpiar de enemigos cada sala para desbloquear la puerta y avanzar más profundo, con llaves/cofres opcionales; la run termina al morir o al llegar al fondo generado.

- **Sí:** Concepto de roguelike "puro" (generación de mazmorra, progresión por profundidad), diferenciación clara frente a Cripta Neón y frente a las 8 mecánicas del catálogo. **No:** choca de fondo con el patrón de MVP simple de SPEC 04/06 — esos motores son de sala/canvas único sin generación procedural ni transición de pantallas ni estado de mapa persistente entre salas; portarlo exigiría un generador de grafo de salas y gestión de progreso, una categoría de esfuerzo distinta a "portar game.js con nuevo color".
- Motivo: la esencia del roguelike (mazmorra + progresión) no cabe en un MVP de sala única sin rediseñar el patrón de motor del repo.

**Veredicto:** Encaja con ajustes — como idea de catálogo es sólida, pero si se lleva a motor real hay que recortar a 3-4 salas fijas predefinidas (no generación procedural real), documentándolo así explícitamente en el spec.

---
