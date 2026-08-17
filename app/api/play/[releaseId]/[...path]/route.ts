import { getPlatformEnv } from "../../../../../lib/platform";

export async function GET(_request: Request, context: { params: Promise<{ releaseId: string; path: string[] }> }) {
  const { releaseId, path } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(releaseId)) return new Response("Not found", { status: 404 });
  const safePath = path.join("/");
  if (!safePath || safePath.includes("..") || safePath.includes("\\")) return new Response("Not found", { status: 404 });
  const { GAMES } = await getPlatformEnv();
  const object = await GAMES?.get(`releases/${releaseId}/${safePath}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Security-Policy", "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' https://opengames.com https://www.opengames.com http://localhost:3000");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=()");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
