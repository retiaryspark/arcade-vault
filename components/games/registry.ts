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

export interface RealGameProps {
  onStateChange: (state: RealGameState) => void;
  onGameOver: (finalScore: number) => void;
}

type RealGameComponent = ForwardRefExoticComponent<
  RealGameProps & RefAttributes<RealGameHandle>
>;

export const REAL_GAMES: Partial<Record<string, RealGameComponent>> = {
  asteroids: AsteroidsCanvas,
  caida: CaidaCanvas,
};
