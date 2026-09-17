// Puntuaciones reales de juegos con motor real (hoy solo Asteroids).
// Usa el cliente de Supabase ya existente (lib/supabase/client.ts) y
// garantiza una sesión (real o anónima) para poder cumplir el RLS de
// `scores` (insert solo si auth.uid() = user_id).

import { createClient } from "@/lib/supabase/client";

export interface RealScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

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
