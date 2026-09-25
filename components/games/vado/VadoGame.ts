// Motor de VADO: puzzle de planificación por turnos. Diseño propio del jam
// (sin game.js fuente en resources/started-games/). Recibe el canvas por
// parámetro y no dibuja su propio HUD de texto: expone el estado del juego
// vía callbacks (RealGameState) igual que Asteroids/Tetris.

import type { RealGameProps, RealGameState } from "../registry";

const COLS = 7;
const MIN_ROWS = 5;
const MAX_ROWS = 9;
const CELL = 54;
const TURN_MS = 400;

// Paleta: ficha/cola planificada en amarillo, peligro activo en magenta,
// meta con borde cian.
const YELLOW = "#f5ff00";
const MAGENTA = "#ff006e";
const CYAN = "#00f5ff";

type Phase = "planning" | "executing" | "solved" | "failed";
type Move = "up" | "down" | "left" | "right" | "wait";

interface Pos {
  row: number;
  col: number;
}

interface DangerStrip {
  row: number;
  period: number; // T entre 3 y 6
  pattern: boolean[][]; // pattern[turnEnCiclo][col] = celda peligrosa activa
}

// PRNG determinista (mulberry32): misma semilla siempre produce el mismo
// tablero. Semilla derivada de (nivel, índice de franja).
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(level: number, stripIndex: number): number {
  return level * 1000 + stripIndex * 31 + 7;
}

const MOVE_DELTA: Record<Move, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
  wait: { dr: 0, dc: 0 },
};

export class VadoGame {
  private ctx: CanvasRenderingContext2D;

  private rows = MIN_ROWS;
  private strips: DangerStrip[] = [];
  private player: Pos = { row: 0, col: 0 };
  private queue: Move[] = [];
  private budget = 0;

  private phase: Phase = "planning";
  private levelTurn = 0;
  private executingIndex = 0;
  private turnAccum = 0;
  private lastTime: number | null = null;

  private score = 0;
  private lives = 3;
  private level = 1;

  private gameOver = false;
  private paused = false;

  private rafId: number | null = null;
  private destroyed = false;
  private lastEmitted: RealGameState = { score: -1, lives: -1, level: -1 };
  private gameOverEmitted = false;

  constructor(
    canvas: HTMLCanvasElement,
    private callbacks: RealGameProps,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.init();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  handleKeyDown(code: string) {
    if (this.paused || this.gameOver) return;
    if (this.phase !== "planning") return;

    switch (code) {
      case "ArrowUp":
        this.addMove("up");
        break;
      case "ArrowDown":
        this.addMove("down");
        break;
      case "ArrowLeft":
        this.addMove("left");
        break;
      case "ArrowRight":
        this.addMove("right");
        break;
      case "KeyW":
        this.addMove("wait");
        break;
      case "Backspace":
        this.undoMove();
        break;
      case "KeyR":
        this.clearQueue();
        break;
      case "Enter":
      case "Space":
        this.startExecution();
        break;
    }
  }

  handleKeyUp(_code: string) {
    // No action needed
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = null;
  }

  forceGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.emitState();
    this.emitGameOver();
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private init() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.paused = false;
    this.gameOverEmitted = false;
    this.lastEmitted = { score: -1, lives: -1, level: -1 };
    this.generateLevel();
    this.emitState();
  }

  private generateLevel() {
    this.rows = Math.min(MAX_ROWS, MIN_ROWS + Math.floor((this.level - 1) / 2));
    this.strips = [];
    for (let row = 1; row < this.rows - 1; row++) {
      this.strips.push(this.generateStrip(row, row - 1));
    }
    this.player = { row: this.rows - 1, col: Math.floor(COLS / 2) };
    this.queue = [];
    this.budget = this.rows + 4;
    this.phase = "planning";
    this.levelTurn = 0;
  }

  private generateStrip(row: number, stripIndex: number): DangerStrip {
    const random = mulberry32(seedFor(this.level, stripIndex));
    const period = 3 + Math.floor(random() * 4); // [3, 6]
    const safeTurn = Math.floor(random() * period);
    const pattern: boolean[][] = [];
    for (let t = 0; t < period; t++) {
      const active = new Array(COLS).fill(false);
      if (t !== safeTurn) {
        const dangerCount = 1 + Math.floor(random() * (COLS - 2));
        const cols = Array.from({ length: COLS }, (_, i) => i);
        for (let i = cols.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [cols[i], cols[j]] = [cols[j], cols[i]];
        }
        for (const col of cols.slice(0, dangerCount)) active[col] = true;
      }
      pattern.push(active);
    }
    return { row, period, pattern };
  }

  private addMove(move: Move) {
    if (this.queue.length >= this.budget) return;
    this.queue.push(move);
  }

  private undoMove() {
    this.queue.pop();
  }

  private clearQueue() {
    this.queue = [];
  }

  private startExecution() {
    if (this.queue.length === 0) return;
    this.phase = "executing";
    this.executingIndex = 0;
    this.turnAccum = 0;
    this.lastTime = null;
  }

  // Procesa un turno de la cola en ejecución: aplica el movimiento, revisa
  // colisión contra el ciclo de peligro activo y resuelve fallo/éxito.
  private advanceTurn() {
    const move = this.queue[this.executingIndex];
    const delta = MOVE_DELTA[move];
    this.player = {
      row: Math.min(this.rows - 1, Math.max(0, this.player.row + delta.dr)),
      col: Math.min(COLS - 1, Math.max(0, this.player.col + delta.dc)),
    };

    const strip = this.strips.find((s) => s.row === this.player.row);
    const collided = strip
      ? this.activeCellsForStrip(strip, this.executingIndex)[this.player.col]
      : false;

    this.executingIndex += 1;
    this.levelTurn = this.executingIndex;

    if (collided) {
      this.failAttempt();
      return;
    }
    if (this.player.row === 0) {
      this.succeedLevel(this.executingIndex);
      return;
    }
    if (this.executingIndex >= this.queue.length) {
      // Cola agotada sin colisión y sin llegar a la meta: se trata como
      // fallo (mismo criterio que una colisión, decisión tomada en el
      // Paso 2 para no dejar la ejecución en un estado sin salida).
      this.failAttempt();
    }
  }

  private failAttempt() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver = true;
      this.emitState();
      this.emitGameOver();
      return;
    }
    // Mismo tablero, mismo ciclo: se reinicia la ficha y la cola, pero las
    // franjas de peligro (this.strips) no se regeneran.
    this.player = { row: this.rows - 1, col: Math.floor(COLS / 2) };
    this.queue = [];
    this.executingIndex = 0;
    this.levelTurn = 0;
    this.phase = "planning";
    this.emitState();
  }

  private succeedLevel(movesUsed: number) {
    this.score += 200 * this.level + 15 * (this.budget - movesUsed);
    this.level += 1;
    this.generateLevel();
    this.emitState();
  }

  private simulateQueue(): Pos[] {
    const path: Pos[] = [];
    let pos = { ...this.player };
    for (const move of this.queue) {
      const delta = MOVE_DELTA[move];
      pos = {
        row: Math.min(this.rows - 1, Math.max(0, pos.row + delta.dr)),
        col: Math.min(COLS - 1, Math.max(0, pos.col + delta.dc)),
      };
      path.push(pos);
    }
    return path;
  }

  private activeCellsForStrip(strip: DangerStrip, turn: number): boolean[] {
    return strip.pattern[turn % strip.period];
  }

  private emitState() {
    const next: RealGameState = {
      score: this.score,
      lives: this.lives,
      level: this.level,
    };
    if (
      next.score !== this.lastEmitted.score ||
      next.lives !== this.lastEmitted.lives ||
      next.level !== this.lastEmitted.level
    ) {
      this.lastEmitted = next;
      this.callbacks.onStateChange(next);
    }
  }

  private emitGameOver() {
    if (this.gameOverEmitted) return;
    this.gameOverEmitted = true;
    this.callbacks.onGameOver(this.score);
  }

  private boardOrigin() {
    return { x: 30, y: 30 };
  }

  private draw() {
    const { x: boardX, y: boardY } = this.boardOrigin();
    const boardWidth = COLS * CELL;
    const boardHeight = this.rows * CELL;

    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 800, 600);

    // Fondo del tablero + grilla tenue
    this.ctx.save();
    this.ctx.translate(boardX, boardY);
    this.ctx.fillStyle = "#0a0a0a";
    this.ctx.fillRect(0, 0, boardWidth, boardHeight);
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * CELL, 0);
      this.ctx.lineTo(c * CELL, boardHeight);
      this.ctx.stroke();
    }
    for (let r = 1; r < this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * CELL);
      this.ctx.lineTo(boardWidth, r * CELL);
      this.ctx.stroke();
    }

    // Celdas de peligro activas en el turno actual (magenta)
    for (const strip of this.strips) {
      const active = this.activeCellsForStrip(strip, this.levelTurn);
      for (let col = 0; col < COLS; col++) {
        if (!active[col]) continue;
        this.ctx.fillStyle = MAGENTA;
        this.ctx.fillRect(
          col * CELL + 2,
          strip.row * CELL + 2,
          CELL - 4,
          CELL - 4,
        );
      }
    }

    // Borde cian en la fila meta (fila 0)
    this.ctx.strokeStyle = CYAN;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, boardWidth - 2, CELL - 2);

    // Cola planificada: línea de puntos amarilla sobre el tablero
    const path = this.simulateQueue();
    if (path.length > 0) {
      this.ctx.fillStyle = YELLOW;
      const points = [this.player, ...path];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        this.ctx.globalAlpha = i === 0 ? 0 : 0.55;
        this.ctx.beginPath();
        this.ctx.arc(
          p.col * CELL + CELL / 2,
          p.row * CELL + CELL / 2,
          5,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }

    // Ficha del jugador (amarillo)
    this.ctx.fillStyle = YELLOW;
    this.ctx.beginPath();
    this.ctx.arc(
      this.player.col * CELL + CELL / 2,
      this.player.row * CELL + CELL / 2,
      CELL / 2 - 6,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.ctx.restore();

    // Indicador de ciclo por franja: T puntos a la derecha de cada fila,
    // con el turno actual resaltado en cian.
    this.ctx.save();
    const cycleX = boardX + boardWidth + 24;
    for (const strip of this.strips) {
      const cy = boardY + strip.row * CELL + CELL / 2;
      const currentT = this.levelTurn % strip.period;
      for (let t = 0; t < strip.period; t++) {
        const cx = cycleX + t * 14;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = strip.pattern[t].some(Boolean)
          ? MAGENTA
          : "rgba(255,255,255,0.15)";
        this.ctx.fill();
        if (t === currentT) {
          this.ctx.strokeStyle = CYAN;
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    }
    this.ctx.restore();

    // Panel "PRESUPUESTO"
    this.ctx.save();
    this.ctx.fillStyle = YELLOW;
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `PRESUPUESTO: ${this.queue.length}/${this.budget}`,
      boardX,
      boardY + boardHeight + 24,
    );
    this.ctx.restore();
  }

  private loop(ts: number) {
    if (this.destroyed) return;

    if (!this.paused && !this.gameOver && this.phase === "executing") {
      const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, 100);
      this.lastTime = ts;
      this.turnAccum += dt;

      while (
        this.turnAccum >= TURN_MS &&
        this.phase === "executing" &&
        !this.gameOver
      ) {
        this.turnAccum -= TURN_MS;
        this.advanceTurn();
      }
    } else if (this.paused) {
      this.lastTime = null;
    }

    this.draw();
    this.emitState();

    if (!this.destroyed) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }
}
