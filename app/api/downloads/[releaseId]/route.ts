import { getPlatformEnv } from "../../../../lib/platform";

export async function GET(_request: Request, context: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await context.params;
  const { DB, GAMES } = await getPlatformEnv();
  const allowed = await DB?.prepare(`SELECT 1 FROM games WHERE current_release_id = ? AND allow_download = 1 AND status = 'published'`).bind(releaseId).first();
  if (!allowed) return new Response("Not found", { status: 404 });
  const object = await GAMES?.get(`archives/${releaseId}.zip`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("ETag", object.httpEtag); headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
