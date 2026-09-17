"use client";

// HUD + bezel CRT + modal de fin de juego. Portado de
// resources/templates/reproductor.jsx. Si el juego tiene motor real
// (components/games/registry.ts), el HUD refleja su estado real; si no,
// se usa la partida simulada del MVP (el marcador sube solo).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Game } from "@/lib/data";
import { useSession } from "@/lib/session-context";
import { REAL_GAMES, type RealGameHandle } from "@/components/games/registry";
import { saveScore } from "@/lib/scores";

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { session } = useSession();
  const RealGame = REAL_GAMES[game.id];

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [realLevel, setRealLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(session ? session.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [playId, setPlayId] = useState(0);
  const level = RealGame ? realLevel : 1 + Math.floor(score / 2500);
  const gameRef = useRef<RealGameHandle>(null);

  useEffect(() => {
    if (RealGame || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [RealGame, over, paused]);

  const endGame = () => {
    if (RealGame) gameRef.current?.forceGameOver();
    else setOver(true);
  };
  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (RealGame) {
        if (next) gameRef.current?.pause();
        else gameRef.current?.resume();
      }
      return next;
    });
  };
  const restart = () => {
    setScore(0);
    setLives(3);
    setRealLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    if (RealGame) setPlayId((id) => id + 1);
  };

  const handleSave = async () => {
    if (!RealGame) {
      setSaved(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveScore(game.id, name, score);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "No se pudo guardar la puntuación",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link className="btn ghost" href={`/juego/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {RealGame ? (
            <RealGame
              key={playId}
              ref={gameRef}
              onStateChange={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setRealLevel(s.level);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveError && (
                  <div
                    className="mono"
                    style={{
                      color: "var(--magenta)",
                      fontSize: 11,
                      marginTop: 8,
                    }}
                  >
                    {saveError}
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/biblioteca")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
