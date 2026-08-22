import { getCurrentUser } from "../../../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { status?: string; allowDownload?: unknown };
  if (payload.status !== undefined && !["published", "hidden"].includes(payload.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (payload.allowDownload !== undefined && typeof payload.allowDownload !== "boolean") return Response.json({ error: "Invalid download setting" }, { status: 400 });
  if (payload.status === undefined && payload.allowDownload === undefined) return Response.json({ error: "Nothing to update" }, { status: 400 });

  const { id } = await context.params;
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "Unavailable" }, { status: 503 });
  await ensureCoreTables(DB);
  const game = await DB.prepare(`SELECT g.status, g.allow_download, g.current_release_id, r.status AS release_status FROM games g LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.id = ? AND g.creator_id = ? LIMIT 1`).bind(id, user.id).first<{ status: string; allow_download: number; current_release_id: string | null; release_status: string | null }>();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });
  if (payload.status === "published" && (!game.current_release_id || game.release_status !== "published")) return Response.json({ error: "目前沒有可公開的安全版本。" }, { status: 409 });

  const statements = [];
  if (payload.status !== undefined) statements.push(DB.prepare(`UPDATE games SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.status, id, user.id));
  if (payload.allowDownload !== undefined) statements.push(DB.prepare(`UPDATE games SET allow_download = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?`).bind(payload.allowDownload ? 1 : 0, id, user.id));
  await DB.batch(statements);
  return Response.json({ game: { status: payload.status ?? game.status, allowDownload: payload.allowDownload ?? Boolean(game.allow_download) } }, { headers: { "Cache-Control": "private, no-store" } });
}
