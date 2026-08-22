import { ensureCoreTables, getPlatformEnv } from "../../../../lib/platform";

export async function GET(_request: Request, context: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(releaseId)) return new Response("Not found", { status: 404 });
  const { DB, GAMES } = await getPlatformEnv();
  if (!DB || !GAMES) return new Response("Not found", { status: 404 });
  await ensureCoreTables(DB);
  const allowed = await DB.prepare(`SELECT 1 FROM games g JOIN game_releases r ON r.id = g.current_release_id WHERE r.id = ? AND r.status = 'published' AND g.allow_download = 1 AND g.status = 'published'`).bind(releaseId).first();
  if (!allowed) return new Response("Not found", { status: 404 });
  const object = await GAMES.get(`archives/${releaseId}.zip`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("ETag", object.httpEtag); headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
