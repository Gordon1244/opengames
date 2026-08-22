import { demoGames, parseTags } from "../../../lib/games";
import { getUploadedGames } from "../../../lib/platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "";
  const uploaded = await getUploadedGames();
  const dynamicGames = uploaded.map((row) => ({
    id: String(row.id), slug: String(row.slug), title: String(row.title_zh), titleEn: String(row.title_en), creator: String(row.display_name), creatorHandle: String(row.handle),
    description: String(row.description_zh), category: String(row.category), tags: parseTags(row.tags), plays: Number(row.plays || 0), badge: "社群新作", art: "void",
    license: String(row.license), allowDownload: Boolean(row.allow_download), sourceUrl: row.source_url ? String(row.source_url) : undefined, version: "1.0.0", releaseId: String(row.current_release_id), playUrl: `/api/play/${String(row.current_release_id)}/index.html`,
  }));
  const games = [...dynamicGames, ...demoGames].filter((game) => (!category || game.category === category) && (!q || `${game.title} ${game.titleEn} ${game.creator} ${game.tags.join(" ")}`.toLowerCase().includes(q)));
  return Response.json({ games, total: games.length }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
