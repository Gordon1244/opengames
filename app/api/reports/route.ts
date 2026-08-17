import { getCurrentUser } from "../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../lib/platform";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { gameId?: string; reason?: string; details?: string };
  if (!payload.gameId || !payload.reason) return Response.json({ error: "缺少檢舉原因。" }, { status: 400 });
  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "服務尚未就緒。" }, { status: 503 });
  await ensureCoreTables(DB);
  const user = await getCurrentUser();
  await DB.prepare(`INSERT INTO reports (id,game_id,reporter_id,reason,details) VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(), payload.gameId.slice(0, 80), user?.id ?? null, payload.reason.slice(0, 80), (payload.details ?? "").slice(0, 1000)).run();
  return Response.json({ ok: true }, { status: 201 });
}
