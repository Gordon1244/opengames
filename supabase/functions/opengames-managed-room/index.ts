import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const allowedOrigins = new Set([
  "https://opengames-arcade.com",
  "https://opengames-arcade.momognchou.chatgpt.site",
]);

function headers(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://opengames-arcade.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST") return json(request, { error: "METHOD_NOT_ALLOWED" }, 405);
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return json(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json(request, { error: "AUTH_REQUIRED" }, 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const action = body?.action === "creator-room" ? "creator-room" : body?.action === "global" ? "global" : "";
  if (!gameId || !action) return json(request, { error: "INVALID_REQUEST" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user?.id) return json(request, { error: "AUTH_REQUIRED" }, 401);

  const accessResponse = await fetch(`https://opengames-arcade.com/api/games/${encodeURIComponent(gameId)}/multiplayer-access`, {
    method: "POST",
    headers: { "Authorization": authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const access = await accessResponse.json().catch(() => null) as { allowed?: boolean; userId?: string; modes?: string[]; maxPlayers?: number | null } | null;
  if (!accessResponse.ok || !access?.allowed || access.userId !== authData.user.id) return json(request, { error: "NOT_ALLOWED" }, 403);

  const mode = typeof body?.mode === "string" && access.modes?.includes(body.mode) ? body.mode : access.modes?.[0];
  if (!mode) return json(request, { error: "MODE_NOT_ALLOWED" }, 400);
  const visibility = body?.visibility === "password" ? "password" : "public";
  const password = typeof body?.password === "string" ? body.password : null;
  const teamCount = mode === "teams" && Number.isInteger(body?.teamCount) ? Number(body?.teamCount) : null;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("opengames_managed_multiplayer_room", {
    p_user_id: authData.user.id,
    p_game_id: gameId,
    p_action: action,
    p_visibility: visibility,
    p_password: password,
    p_mode: mode,
    p_team_count: teamCount,
    p_max_players: access.maxPlayers ?? null,
  });
  if (error || !Array.isArray(data) || !data[0]) return json(request, { error: "ROOM_REQUEST_FAILED" }, 409);
  return json(request, { room: data[0] });
});
