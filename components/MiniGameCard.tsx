// Card compacta para el preview de juegos del Home, portada de MiniCard en
// resources/home-about/home.jsx. Distinta de GameCard.tsx (sin tilt, sin badge de puntuación).

import Link from "next/link";
import type { Game } from "@/lib/data";

export default function MiniGameCard({ game }: { game: Game }) {
  return (
    <Link href={`/juego/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={`cover-bg ${game.cover}`} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
