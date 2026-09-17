"use client";

// Wrapper de React para el motor de Asteroids: monta el canvas, gestiona sus
// propios listeners de teclado y expone pause()/resume()/forceGameOver() al
// registro (components/games/registry.ts) vía ref.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AsteroidsGame } from "./AsteroidsGame";
import type { RealGameHandle, RealGameProps } from "../registry";

const CONTROL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

function isTextInput(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

const AsteroidsCanvas = forwardRef<RealGameHandle, RealGameProps>(
  function AsteroidsCanvas({ onStateChange, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<AsteroidsGame | null>(null);

    // Refs para no tener que recrear el motor cuando GamePlayer pasa nuevos
    // callbacks en cada render (evita duplicar el loop por dependencias).
    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;
    const onGameOverRef = useRef(onGameOver);
    onGameOverRef.current = onGameOver;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const game = new AsteroidsGame(canvas, {
        onStateChange: (state) => onStateChangeRef.current(state),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      });
      gameRef.current = game;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (isTextInput(e.target)) return;
        if (CONTROL_KEYS.has(e.code)) e.preventDefault();
        game.handleKeyDown(e.code);
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (isTextInput(e.target)) return;
        if (CONTROL_KEYS.has(e.code)) e.preventDefault();
        game.handleKeyUp(e.code);
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        game.destroy();
        gameRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      pause: () => gameRef.current?.pause(),
      resume: () => gameRef.current?.resume(),
      forceGameOver: () => gameRef.current?.forceGameOver(),
    }));

    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    );
  },
);

export default AsteroidsCanvas;
