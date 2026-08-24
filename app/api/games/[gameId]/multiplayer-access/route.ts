import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";
import { parseMultiplayerModes } from "../../../../../lib/games";

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return Response.json({ allowed: false }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const supabase = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return Response.json({ allowed: false }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = body?.action === "creator-room" ? "creator-room" : body?.action === "global" ? "global" : null;
  if (!action) return Response.json({ allowed: false }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  const { gameId } = await context.params; const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ allowed: false }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  await ensureCoreTables(DB);
  const game = await DB.prepare(`SELECT creator_id, multiplayer_enabled, multiplayer_max_players, multiplayer_modes, multiplayer_room_policy, multiplayer_managed_unlimited FROM games WHERE id = ? AND status = 'published' LIMIT 1`).bind(gameId).first<Record<string, unknown>>();
  if (!game || !game.multiplayer_enabled) return Response.json({ allowed: false }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const policy = String(game.multiplayer_room_policy || "player");
  const allowed = action === "creator-room" ? String(game.creator_id) === data.user.id && ["creator", "hybrid"].includes(policy) : policy === "global";
  if (!allowed) return Response.json({ allowed: false }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  return Response.json({ allowed: true, userId: data.user.id, gameId, modes: parseMultiplayerModes(game.multiplayer_modes), maxPlayers: game.multiplayer_managed_unlimited ? null : Math.min(100, Math.max(2, Number(game.multiplayer_max_players || 4))) }, { headers: { "Cache-Control": "private, no-store" } });
}
