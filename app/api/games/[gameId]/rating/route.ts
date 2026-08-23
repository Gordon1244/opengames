import { getCurrentUser } from "../../../../../lib/auth";
import { findDemoGameById } from "../../../../../lib/games";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";

const noStore = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function ratingState(DB: D1Database, gameId: string, userId?: string) {
  const row = await DB.prepare(`SELECT ROUND(AVG(rating), 1) AS rating_average, COUNT(*) AS rating_count, MAX(CASE WHEN user_id = ? THEN rating END) AS user_rating FROM game_ratings WHERE game_id = ?`).bind(userId ?? "", gameId).first<{ rating_average: number | null; rating_count: number; user_rating: number | null }>();
  return { average: Number(row?.rating_average || 0), count: Number(row?.rating_count || 0), userRating: row?.user_rating ? Number(row.user_rating) : null };
}

async function publishedGame(DB: D1Database, gameId: string) {
  if (findDemoGameById(gameId)) return { creatorId: null };
  const row = await DB.prepare(`SELECT creator_id FROM games WHERE id = ? AND status = 'published' LIMIT 1`).bind(gameId).first<{ creator_id: string }>();
  return row ? { creatorId: row.creator_id } : null;
}

export async function GET(_request: Request, context: { params: Promise<{ gameId: string }> }) {
  const gameId = (await context.params).gameId.slice(0, 80);
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ average: 0, count: 0, userRating: null, signedIn: false }, { headers: noStore });
  await ensureCoreTables(DB);
  if (!await publishedGame(DB, gameId)) return Response.json({ error: "找不到公開作品。" }, { status: 404, headers: noStore });
  const user = await getCurrentUser({ requireMfa: false });
  return Response.json({ ...await ratingState(DB, gameId, user?.id), signedIn: Boolean(user) }, { headers: noStore });
}

export async function PUT(request: Request, context: { params: Promise<{ gameId: string }> }) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "無效的評價要求。" }, { status: 403, headers: noStore });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入並完成帳號驗證。" }, { status: 401, headers: noStore });
  const payload = await request.json().catch(() => ({})) as { rating?: unknown };
  if (!Number.isInteger(payload.rating) || Number(payload.rating) < 1 || Number(payload.rating) > 5) return Response.json({ error: "評分必須是 1 到 5 顆星。" }, { status: 400, headers: noStore });
  const gameId = (await context.params).gameId.slice(0, 80);
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "評價服務尚未就緒。" }, { status: 503, headers: noStore });
  await ensureCoreTables(DB);
  const game = await publishedGame(DB, gameId);
  if (!game) return Response.json({ error: "找不到公開作品。" }, { status: 404, headers: noStore });
  if (game.creatorId === user.id) return Response.json({ error: "創作者不能評價自己的作品。" }, { status: 403, headers: noStore });
  await DB.prepare(`INSERT INTO game_ratings (game_id,user_id,rating) VALUES (?,?,?) ON CONFLICT(game_id,user_id) DO UPDATE SET rating = excluded.rating, updated_at = CURRENT_TIMESTAMP`).bind(gameId, user.id, Number(payload.rating)).run();
  return Response.json({ ...await ratingState(DB, gameId, user.id), signedIn: true }, { headers: noStore });
}

export async function DELETE(request: Request, context: { params: Promise<{ gameId: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "無效的評價要求。" }, { status: 403, headers: noStore });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入並完成帳號驗證。" }, { status: 401, headers: noStore });
  const gameId = (await context.params).gameId.slice(0, 80);
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "評價服務尚未就緒。" }, { status: 503, headers: noStore });
  await ensureCoreTables(DB);
  await DB.prepare(`DELETE FROM game_ratings WHERE game_id = ? AND user_id = ?`).bind(gameId, user.id).run();
  return Response.json({ ...await ratingState(DB, gameId, user.id), signedIn: true }, { headers: noStore });
}
