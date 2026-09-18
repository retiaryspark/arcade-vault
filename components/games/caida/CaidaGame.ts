// Motor de Caída (Tetris), portado de resources/started-games/03-tetris/game.js.
// Recibe el canvas por parámetro (sin variables globales de document) y no
// dibuja su propio HUD de texto: expone el estado del juego vía callbacks.

import type { RealGameProps, RealGameState } from "../registry";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Colores neón: pieza activa/fantasma/preview en cian, pila fijada en magenta
const CYAN = "#00f5ff";
const MAGENTA = "#ff006e";

// Piezas: I, O, T, S, Z, J, L, N (la pieza extra "tuerca")
const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
] as (number[][] | null)[];

const LINE_SCORES = [0, 100, 300, 500, 800];

export class CaidaGame {
  private ctx: CanvasRenderingContext2D;
  private board: number[][] = [];
  private current: {
    type: number;
    shape: number[][];
    x: number;
    y: number;
  } | null = null;
  private next: {
    type: number;
    shape: number[][];
    x: number;
    y: number;
  } | null = null;

  private score = 0;
  private lines = 0;
  private level = 1;
  private dropInterval = 1000;
  private dropAccum = 0;
  private gameOver = false;
  private paused = false;

  private rafId: number | null = null;
  private lastTime: number | null = null;
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
    switch (code) {
      case "ArrowLeft":
        if (
          !this.collide(
            this.current!.shape,
            this.current!.x - 1,
            this.current!.y,
          )
        )
          this.current!.x--;
        break;
      case "ArrowRight":
        if (
          !this.collide(
            this.current!.shape,
            this.current!.x + 1,
            this.current!.y,
          )
        )
          this.current!.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
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
    this.board = this.createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.gameOver = false;
    this.paused = false;
    this.gameOverEmitted = false;
    this.lastEmitted = { score: -1, lives: -1, level: -1 };
    this.next = this.randomPiece();
    this.spawn();
    this.emitState();
  }

  private createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  private randomPiece(): {
    type: number;
    shape: number[][];
    x: number;
    y: number;
  } {
    const type = Math.floor(Math.random() * 8) + 1;
    const baseShape = PIECES[type] as number[][];
    const shape = baseShape.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  private collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  private rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][rows - 1 - r] = shape[r][c];
      }
    }
    return result;
  }

  private tryRotate() {
    if (!this.current) return;
    const rotated = this.rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private merge() {
    if (!this.current) return;
    for (let r = 0; r < this.current.shape.length; r++) {
      for (let c = 0; c < this.current.shape[r].length; c++) {
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] =
            this.current.shape[r][c];
      }
    }
  }

  private clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
    }
  }

  private ghostY(): number {
    if (!this.current) return 0;
    let gy = this.current.y;
    while (!this.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private softDrop() {
    if (!this.current) return;
    if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private hardDrop() {
    if (!this.current) return;
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = this.randomPiece();
    if (!this.current) return;
    if (this.collide(this.current.shape, this.current.x, this.current.y)) {
      this.gameOver = true;
      this.emitState();
      this.emitGameOver();
    }
  }

  private emitState() {
    const next: RealGameState = {
      score: this.score,
      lives: 1, // Tetris es una sola partida
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

  private drawBlock(x: number, y: number, colorIndex: number, alpha = 1) {
    if (!colorIndex) return;
    const color = colorIndex > 0 ? MAGENTA : CYAN; // magenta para pila, cian para activa
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    // Highlight
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
    this.ctx.globalAlpha = 1;
  }

  private drawGrid() {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * BLOCK, 0);
      this.ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      this.ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * BLOCK);
      this.ctx.lineTo(COLS * BLOCK, r * BLOCK);
      this.ctx.stroke();
    }
  }

  private draw() {
    // Fondo negro (todo el canvas 800×600)
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 800, 600);

    // Región de tablero (izquierda: 0-300px)
    this.ctx.save();
    this.ctx.fillStyle = "#0a0a0a";
    this.ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    this.drawGrid();

    // Tablero: bloques fijados (magenta)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]) {
          this.drawBlock(c, r, 1); // 1 indica magenta (pila fijada)
        }
      }
    }

    // Fantasma (pieza proyectada, cian semi-transparente)
    if (this.current) {
      const gy = this.ghostY();
      for (let r = 0; r < this.current.shape.length; r++) {
        for (let c = 0; c < this.current.shape[r].length; c++) {
          if (this.current.shape[r][c]) {
            this.drawBlock(this.current.x + c, gy + r, -1, 0.2); // -1 indica cian
          }
        }
      }
    }

    // Pieza activa (cian)
    if (this.current) {
      for (let r = 0; r < this.current.shape.length; r++) {
        for (let c = 0; c < this.current.shape[r].length; c++) {
          if (this.current.shape[r][c]) {
            this.drawBlock(this.current.x + c, this.current.y + r, -1); // -1 indica cian
          }
        }
      }
    }

    this.ctx.restore();

    // Panel "SIGUIENTE" (derecha: 320-440px, 80px separación, centrado en 600px de alto)
    this.ctx.save();
    const nextX = COLS * BLOCK + 20;
    const nextY = 60;
    const nextW = 160;
    const nextH = 160;

    this.ctx.fillStyle = "#0a0a0a";
    this.ctx.fillRect(nextX, nextY, nextW, nextH);
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(nextX, nextY, nextW, nextH);

    // Etiqueta "SIGUIENTE"
    this.ctx.fillStyle = CYAN;
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("SIGUIENTE", nextX + nextW / 2, nextY - 8);

    // Dibujar la siguiente pieza dentro del panel
    if (this.next) {
      const shape = this.next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      const previewBlockSize = 30;
      const previewStartX = nextX + 20;
      const previewStartY = nextY + 30;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const px = previewStartX + (offX + c) * previewBlockSize;
            const py = previewStartY + (offY + r) * previewBlockSize;
            this.ctx.fillStyle = CYAN;
            this.ctx.fillRect(
              px + 1,
              py + 1,
              previewBlockSize - 2,
              previewBlockSize - 2,
            );
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
            this.ctx.fillRect(px + 1, py + 1, previewBlockSize - 2, 4);
          }
        }
      }
    }

    this.ctx.restore();
  }

  private loop(ts: number) {
    if (this.destroyed) return;

    if (!this.paused && !this.gameOver) {
      const dt = this.lastTime === null ? 0 : ts - this.lastTime;
      this.lastTime = ts;
      this.dropAccum += dt;

      if (this.dropAccum >= this.dropInterval) {
        this.dropAccum = 0;
        if (
          !this.collide(
            this.current!.shape,
            this.current!.x,
            this.current!.y + 1,
          )
        ) {
          this.current!.y++;
        } else {
          this.lockPiece();
        }
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
