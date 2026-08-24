import { getCurrentUser } from "../../../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";

const MAX_SAVE_BYTES = 64 * 1024;
const MAX_SLOTS = 10;

function validSlot(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9_-]{1,32}$/.test(value));
}

async function contextFor(gameId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Sign in to use cloud saves" }, { status: 401 }) };
  const { DB } = await getPlatformEnv();
  if (!DB) return { error: Response.json({ error: "Cloud saves are unavailable" }, { status: 503 }) };
  await ensureCoreTables(DB);
  const game = await DB.prepare(`SELECT cloud_saves_enabled FROM games WHERE id = ? AND status = 'published' LIMIT 1`).bind(gameId).first<{ cloud_saves_enabled: number }>();
  if (!game) return { error: Response.json({ error: "Game not found" }, { status: 404 }) };
  if (!game.cloud_saves_enabled) return { error: Response.json({ error: "The creator has not enabled cloud saves" }, { status: 403 }) };
  return { DB, user };
}

export async function GET(request: Request, context: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await context.params;
  const slot = new URL(request.url).searchParams.get("slot");
  if (!validSlot(slot)) return Response.json({ error: "Invalid save slot" }, { status: 400 });
  const state = await contextFor(gameId); if ("error" in state) return state.error;
  const row = await state.DB.prepare(`SELECT slot, data, version, updated_at FROM game_saves WHERE game_id = ? AND user_id = ? AND slot = ? LIMIT 1`).bind(gameId, state.user.id, slot).first<{ slot: string; data: string; version: number; updated_at: string }>();
  return Response.json({ save: row ? { slot: row.slot, data: JSON.parse(row.data), version: row.version, updatedAt: row.updated_at } : null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, context: { params: Promise<{ gameId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid save request" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const { gameId } = await context.params;
  const body = await request.json().catch(() => null) as { slot?: unknown; data?: unknown; version?: unknown } | null;
  const slot = typeof body?.slot === "string" ? body.slot : null;
  if (!validSlot(slot)) return Response.json({ error: "Invalid save slot" }, { status: 400 });
  const version = body?.version === undefined ? 0 : body.version;
  if (!Number.isInteger(version) || Number(version) < 0) return Response.json({ error: "Invalid save version" }, { status: 400 });
  const encoded = JSON.stringify(body?.data);
  if (encoded === undefined) return Response.json({ error: "Save data must be JSON-compatible" }, { status: 400 });
  if (new TextEncoder().encode(encoded).byteLength > MAX_SAVE_BYTES) return Response.json({ error: "Save data exceeds 64 KiB" }, { status: 413 });
  const state = await contextFor(gameId); if ("error" in state) return state.error;
  if (Number(version) === 0) {
    const count = await state.DB.prepare(`SELECT COUNT(*) AS count FROM game_saves WHERE game_id = ? AND user_id = ?`).bind(gameId, state.user.id).first<{ count: number }>();
    if (Number(count?.count || 0) >= MAX_SLOTS) return Response.json({ error: "This game already has 10 save slots" }, { status: 409 });
  }
  const nextVersion = Number(version) + 1;
  const result = await state.DB.prepare(`INSERT INTO game_saves (game_id, user_id, slot, data, version) VALUES (?, ?, ?, ?, ?) ON CONFLICT(game_id, user_id, slot) DO UPDATE SET data = excluded.data, version = excluded.version, updated_at = CURRENT_TIMESTAMP WHERE game_saves.version = ?`).bind(gameId, state.user.id, slot, encoded, nextVersion, Number(version)).run();
  if (!result.meta.changes) return Response.json({ error: "Save changed on another device", code: "VERSION_CONFLICT" }, { status: 409 });
  return Response.json({ save: { slot, data: body?.data, version: nextVersion } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ gameId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid save request" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const { gameId } = await context.params;
  const slot = new URL(request.url).searchParams.get("slot");
  if (!validSlot(slot)) return Response.json({ error: "Invalid save slot" }, { status: 400 });
  const state = await contextFor(gameId); if ("error" in state) return state.error;
  await state.DB.prepare(`DELETE FROM game_saves WHERE game_id = ? AND user_id = ? AND slot = ?`).bind(gameId, state.user.id, slot).run();
  return Response.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
}
