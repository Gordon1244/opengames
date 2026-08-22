import { ensureCoreTables, getPlatformEnv } from "../../../../../lib/platform";

export async function GET(_request: Request, context: { params: Promise<{ releaseId: string; path: string[] }> }) {
  const { releaseId, path } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(releaseId)) return new Response("Not found", { status: 404 });
  const safePath = path.join("/");
  if (!safePath || safePath.includes("..") || safePath.includes("\\")) return new Response("Not found", { status: 404 });
  const { DB, GAMES } = await getPlatformEnv();
  if (!DB || !GAMES) return new Response("Not found", { status: 404 });
  await ensureCoreTables(DB);
  const release = await DB.prepare(`SELECT r.entry_path, g.id AS game_id FROM game_releases r JOIN games g ON g.current_release_id = r.id WHERE r.id = ? AND r.status = 'published' AND g.status = 'published' LIMIT 1`).bind(releaseId).first<{ entry_path: string; game_id: string }>();
  if (!release) return new Response("Not found", { status: 404 });
  const object = await GAMES?.get(`releases/${releaseId}/${safePath}`);
  if (!object) return new Response("Not found", { status: 404 });
  if (safePath === release.entry_path) {
    const day = new Date().toISOString().slice(0, 10);
    await DB.prepare(`INSERT INTO play_metrics (game_id, day, plays) VALUES (?, ?, 1) ON CONFLICT(game_id, day) DO UPDATE SET plays = plays + 1`).bind(release.game_id, day).run();
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Security-Policy", "sandbox allow-scripts allow-pointer-lock; default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=()");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(object.body, { headers });
}
