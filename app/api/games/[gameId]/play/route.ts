import { findDemoGameById } from "../../../../../lib/games";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";

const noStore = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "無效的遊玩紀錄要求。" }, { status: 403, headers: noStore });
  const gameId = (await context.params).gameId.slice(0, 80);
  if (!/^[a-zA-Z0-9-]+$/.test(gameId)) return Response.json({ error: "找不到公開作品。" }, { status: 404, headers: noStore });
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "遊玩統計服務尚未就緒。" }, { status: 503, headers: noStore });
  await ensureCoreTables(DB);
  if (!findDemoGameById(gameId)) {
    const published = await DB.prepare(`SELECT 1 FROM games WHERE id = ? AND status = 'published' LIMIT 1`).bind(gameId).first();
    if (!published) return Response.json({ error: "找不到公開作品。" }, { status: 404, headers: noStore });
  }
  const day = new Date().toISOString().slice(0, 10);
  await DB.prepare(`INSERT INTO play_metrics (game_id, day, plays) VALUES (?, ?, 1) ON CONFLICT(game_id, day) DO UPDATE SET plays = plays + 1`).bind(gameId, day).run();
  return new Response(null, { status: 204, headers: noStore });
}
