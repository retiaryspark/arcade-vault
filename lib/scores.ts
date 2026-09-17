// Puntuaciones reales de juegos con motor real (hoy solo Asteroids).
// Usa el cliente de Supabase ya existente (lib/supabase/client.ts) y
// garantiza una sesión (real o anónima) para poder cumplir el RLS de
// `scores` (insert solo si auth.uid() = user_id).

import { createClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/lib/data";

async function ensureUserId(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message ?? "No se pudo iniciar sesión anónima");
  }
  return data.user.id;
}

export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<void> {
  const supabase = createClient();
  const userId = await ensureUserId(supabase);

  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    user_id: userId,
    player_name: playerName,
    score,
  });
  if (error) throw error;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
