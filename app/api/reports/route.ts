import { getCurrentUser } from "../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../lib/platform";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { gameId?: string; reason?: string; details?: string };
  const reasons = new Set(["疑似侵權", "不適齡內容", "惡意或可疑行為", "冒用或誤導資訊", "其他"]);
  if (!payload.gameId || !payload.reason || !reasons.has(payload.reason)) return Response.json({ error: "缺少或無效的檢舉原因。" }, { status: 400 });
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "服務尚未就緒。" }, { status: 503 });
  await ensureCoreTables(DB);
  const user = await getCurrentUser();
  const gameId = payload.gameId.slice(0, 80);
  const game = await DB.prepare(`SELECT 1 FROM games WHERE id = ? AND status = 'published' LIMIT 1`).bind(gameId).first();
  if (!game) return Response.json({ error: "找不到可檢舉的公開作品。" }, { status: 404 });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const count = user
    ? await DB.prepare(`SELECT COUNT(*) AS count FROM reports WHERE reporter_id = ? AND created_at >= ?`).bind(user.id, since).first<{ count: number }>()
    : await DB.prepare(`SELECT COUNT(*) AS count FROM reports WHERE reporter_id IS NULL AND created_at >= ?`).bind(since).first<{ count: number }>();
  if ((count?.count ?? 0) >= (user ? 20 : 100)) return Response.json({ error: "今日檢舉次數已達上限。" }, { status: 429 });
  await DB.prepare(`INSERT INTO reports (id,game_id,reporter_id,reason,details) VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(), gameId, user?.id ?? null, payload.reason, (payload.details ?? "").slice(0, 1000)).run();
  return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
