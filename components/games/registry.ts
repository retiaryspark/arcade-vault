// Registro mínimo de juegos con motor real. GamePlayer consulta este mapa
// por game.id: si hay una entrada, se renderiza el componente real dentro
// del bisel CRT; si no, se usa la simulación visual del MVP (SPEC 01).

import type { ForwardRefExoticComponent, RefAttributes } from "react";
import AsteroidsCanvas from "./asteroids/AsteroidsCanvas";
import CaidaCanvas from "./caida/CaidaCanvas";

export interface RealGameHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
}

export interface RealGameState {
  score: number;
  lives: number;
  level: number;
}

// Paleta de color seleccionable por el jugador. "clasico" es el default:
// reproduce la paleta neón original del motor (ver CLAUDE.md) sin cambios.
export type GameSkin = "clasico" | "neon" | "retro";
export const SKINS: { id: GameSkin; label: string }[] = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "neon", label: "NEÓN" },
  { id: "retro", label: "RETRO" },
];

export interface RealGameProps {
  onStateChange: (state: RealGameState) => void;
  onGameOver: (finalScore: number) => void;
  skin?: GameSkin;
}

type RealGameComponent = ForwardRefExoticComponent<
  RealGameProps & RefAttributes<RealGameHandle>
>;

export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  caida: CaidaCanvas,
};
