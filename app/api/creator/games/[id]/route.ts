import { getCurrentUser } from "../../../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";
import { parseMultiplayerModes, parseSupportedLocales } from "../../../../../lib/games";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "Unavailable" }, { status: 503 });
  await ensureCoreTables(DB);
  const game = await DB.prepare(`SELECT status, allow_download, cloud_saves_enabled, multiplayer_enabled, multiplayer_max_players, multiplayer_modes, multiplayer_room_policy, multiplayer_managed_unlimited, supported_locales, default_locale FROM games WHERE id = ? AND creator_id = ? LIMIT 1`).bind(id, user.id).first<Record<string, unknown>>();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ game: {
    status: String(game.status), allowDownload: Boolean(game.allow_download), cloudSavesEnabled: Boolean(game.cloud_saves_enabled),
    multiplayerEnabled: Boolean(game.multiplayer_enabled), multiplayerMaxPlayers: Number(game.multiplayer_max_players || 4),
    multiplayerModes: parseMultiplayerModes(game.multiplayer_modes),
    multiplayerRoomPolicy: ["player", "creator", "global", "hybrid"].includes(String(game.multiplayer_room_policy)) ? String(game.multiplayer_room_policy) : "player",
    multiplayerManagedUnlimited: Boolean(game.multiplayer_managed_unlimited), supportedLocales: parseSupportedLocales(game.supported_locales), defaultLocale: String(game.default_locale || "zh-Hant"),
  } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid settings request" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { status?: string; allowDownload?: unknown; cloudSavesEnabled?: unknown; multiplayerEnabled?: unknown; multiplayerMaxPlayers?: unknown; multiplayerModes?: unknown; multiplayerRoomPolicy?: unknown; multiplayerManagedUnlimited?: unknown; supportedLocales?: unknown; defaultLocale?: unknown };
  if (payload.status !== undefined && !["published", "hidden"].includes(payload.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (payload.allowDownload !== undefined && typeof payload.allowDownload !== "boolean") return Response.json({ error: "Invalid download setting" }, { status: 400 });
  if (payload.cloudSavesEnabled !== undefined && typeof payload.cloudSavesEnabled !== "boolean") return Response.json({ error: "Invalid cloud save setting" }, { status: 400 });
  if (payload.multiplayerEnabled !== undefined && typeof payload.multiplayerEnabled !== "boolean") return Response.json({ error: "Invalid multiplayer setting" }, { status: 400 });
  if (payload.multiplayerMaxPlayers !== undefined && (!Number.isInteger(payload.multiplayerMaxPlayers) || Number(payload.multiplayerMaxPlayers) < 2 || Number(payload.multiplayerMaxPlayers) > 8)) return Response.json({ error: "Invalid player limit" }, { status: 400 });
  const modes = payload.multiplayerModes === undefined ? undefined : Array.isArray(payload.multiplayerModes) ? [...new Set(payload.multiplayerModes.filter((item): item is string => typeof item === "string" && ["shared", "co-op", "versus", "teams"].includes(item)))] : [];
  if (modes && !modes.length) return Response.json({ error: "Choose at least one room mode" }, { status: 400 });
  if (payload.multiplayerRoomPolicy !== undefined && !["player", "creator", "global", "hybrid"].includes(String(payload.multiplayerRoomPolicy))) return Response.json({ error: "Invalid room policy" }, { status: 400 });
  if (payload.multiplayerManagedUnlimited !== undefined && typeof payload.multiplayerManagedUnlimited !== "boolean") return Response.json({ error: "Invalid managed-room limit" }, { status: 400 });
  const locales = payload.supportedLocales === undefined ? undefined : Array.isArray(payload.supportedLocales) ? [...new Set(payload.supportedLocales.filter((item): item is string => typeof item === "string" && /^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,2}$/.test(item)))].slice(0, 8) : [];
  if (locales && !locales.length) return Response.json({ error: "Choose at least one language" }, { status: 400 });
  if (payload.defaultLocale !== undefined && (typeof payload.defaultLocale !== "string" || !/^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,2}$/.test(payload.defaultLocale))) return Response.json({ error: "Invalid default language" }, { status: 400 });
  if (locales && payload.defaultLocale !== undefined && !locales.includes(payload.defaultLocale)) return Response.json({ error: "Default language must be supported" }, { status: 400 });
  if (payload.status === undefined && payload.allowDownload === undefined && payload.cloudSavesEnabled === undefined && payload.multiplayerEnabled === undefined && payload.multiplayerMaxPlayers === undefined && modes === undefined && payload.multiplayerRoomPolicy === undefined && payload.multiplayerManagedUnlimited === undefined && locales === undefined && payload.defaultLocale === undefined) return Response.json({ error: "Nothing to update" }, { status: 400 });

  const { id } = await context.params;
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "Unavailable" }, { status: 503 });
  await ensureCoreTables(DB);
  const game = await DB.prepare(`SELECT g.status, g.allow_download, g.cloud_saves_enabled, g.multiplayer_enabled, g.multiplayer_max_players, g.multiplayer_modes, g.multiplayer_room_policy, g.multiplayer_managed_unlimited, g.supported_locales, g.default_locale, g.current_release_id, r.status AS release_status FROM games g LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.id = ? AND g.creator_id = ? LIMIT 1`).bind(id, user.id).first<{ status: string; allow_download: number; cloud_saves_enabled: number; multiplayer_enabled: number; multiplayer_max_players: number; multiplayer_modes: string; multiplayer_room_policy: string; multiplayer_managed_unlimited: number; supported_locales: string; default_locale: string; current_release_id: string | null; release_status: string | null }>();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });
  if (payload.status === "published" && (!game.current_release_id || game.release_status !== "published")) return Response.json({ error: "目前沒有可公開的安全版本。" }, { status: 409 });

  const statements = [];
  if (payload.status !== undefined) statements.push(DB.prepare(`UPDATE games SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.status, id, user.id));
  if (payload.allowDownload !== undefined) statements.push(DB.prepare(`UPDATE games SET allow_download = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.allowDownload ? 1 : 0, id, user.id));
  if (payload.cloudSavesEnabled !== undefined) statements.push(DB.prepare(`UPDATE games SET cloud_saves_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.cloudSavesEnabled ? 1 : 0, id, user.id));
  if (payload.multiplayerEnabled !== undefined) statements.push(DB.prepare(`UPDATE games SET multiplayer_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.multiplayerEnabled ? 1 : 0, id, user.id));
  if (payload.multiplayerMaxPlayers !== undefined) statements.push(DB.prepare(`UPDATE games SET multiplayer_max_players = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.multiplayerMaxPlayers, id, user.id));
  if (modes !== undefined) statements.push(DB.prepare(`UPDATE games SET multiplayer_modes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(JSON.stringify(modes), id, user.id));
  if (payload.multiplayerRoomPolicy !== undefined) statements.push(DB.prepare(`UPDATE games SET multiplayer_room_policy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.multiplayerRoomPolicy, id, user.id));
  if (payload.multiplayerManagedUnlimited !== undefined) statements.push(DB.prepare(`UPDATE games SET multiplayer_managed_unlimited = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.multiplayerManagedUnlimited ? 1 : 0, id, user.id));
  if (locales !== undefined) statements.push(DB.prepare(`UPDATE games SET supported_locales = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(JSON.stringify(locales), id, user.id));
  if (payload.defaultLocale !== undefined) statements.push(DB.prepare(`UPDATE games SET default_locale = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.defaultLocale, id, user.id));
  await DB.batch(statements);
  return Response.json({ game: {
    status: payload.status ?? game.status,
    allowDownload: payload.allowDownload ?? Boolean(game.allow_download),
    cloudSavesEnabled: payload.cloudSavesEnabled ?? Boolean(game.cloud_saves_enabled),
    multiplayerEnabled: payload.multiplayerEnabled ?? Boolean(game.multiplayer_enabled),
    multiplayerMaxPlayers: payload.multiplayerMaxPlayers ?? game.multiplayer_max_players,
    multiplayerModes: modes ?? JSON.parse(game.multiplayer_modes || '["shared"]'),
    multiplayerRoomPolicy: payload.multiplayerRoomPolicy ?? game.multiplayer_room_policy,
    multiplayerManagedUnlimited: payload.multiplayerManagedUnlimited ?? Boolean(game.multiplayer_managed_unlimited),
    supportedLocales: locales ?? JSON.parse(game.supported_locales || '["zh-Hant"]'),
    defaultLocale: payload.defaultLocale ?? game.default_locale,
  } }, { headers: { "Cache-Control": "private, no-store" } });
}
