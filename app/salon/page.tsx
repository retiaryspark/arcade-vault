"use client";

// Salón de la Fama, portado de resources/templates/salon.jsx.
// La pestaña con motor real (hoy solo ASTEROIDS) lee puntuaciones reales
// de Supabase en vez de seededScores, con estado de carga y vacío.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GAMES, seededScores, rankClass, type ScoreRow } from "@/lib/data";
import { useSession } from "@/lib/session-context";
import { getScores } from "@/lib/scores";
import { REAL_GAMES } from "@/components/games/registry";

export default function SalonPage() {
  const [tab, setTab] = useState(GAMES[0].id);
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  const hasRealScores = Boolean(REAL_GAMES[tab]);

  const fakeRows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const [realData, setRealData] = useState<{
    tab: string;
    rows: ScoreRow[];
  } | null>(null);

  useEffect(() => {
    if (!hasRealScores) return;
    let cancelled = false;
    getScores(tab, 12).then((data) => {
      if (!cancelled) setRealData({ tab, rows: data });
    });
    return () => {
      cancelled = true;
    };
  }, [tab, hasRealScores]);

  const realRows =
    hasRealScores && realData?.tab === tab ? realData.rows : null;
  const rows = hasRealScores ? realRows : fakeRows;
  const loading = hasRealScores && rows === null;
  const empty = hasRealScores && rows !== null && rows.length === 0;

  const { session } = useSession();
  const youRank =
    !hasRealScores && session ? Math.floor(8 + (tab.length % 4)) : null;
  const youScore =
    !hasRealScores && session ? (fakeRows[5]?.score ?? 0) - 2400 : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loading && (
        <p
          className="mono"
          style={{
            textAlign: "center",
            color: "var(--ink-dim)",
            padding: "32px 0",
          }}
        >
          CARGANDO...
        </p>
      )}

      {empty && (
        <p
          className="mono"
          style={{
            textAlign: "center",
            color: "var(--ink-dim)",
            padding: "32px 0",
          }}
        >
          AÚN NO HAY PUNTUACIONES REGISTRADAS PARA {game.title}.
        </p>
      )}

      {!loading && !empty && rows && rows.length > 0 && (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1]?.name ?? "—"}</div>
              <div className="score">
                {rows[1] ? rows[1].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{rows[1]?.date ?? ""}</div>
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0]?.name ?? "—"}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0] ? rows[0].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{rows[0]?.date ?? ""}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2]?.name ?? "—"}</div>
              <div className="score">
                {rows[2] ? rows[2].score.toLocaleString("es-ES") : "—"}
              </div>
              <div className="date">{rows[2]?.date ?? ""}</div>
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={"tr" + rankClass(i)}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {session && !hasRealScores && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(youRank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {session.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {(youScore ?? 9999).toLocaleString("es-ES")}
                  </div>
                  <div className="dt">11/05/2026</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
