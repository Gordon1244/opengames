import { getCurrentUser } from "../../../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { status } = await request.json() as { status?: string }; if (!status || !["published","hidden","removed"].includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  const { DB } = await getPlatformEnv(); if (!DB) return Response.json({ error: "Unavailable" }, { status: 503 }); await ensureCoreTables(DB);
  const { id } = await context.params; await DB.prepare(`UPDATE games SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
  return Response.json({ ok: true });
}
