import { demoGames, localizeGame, sortRecommendedGames, uploadedRowToGame } from "../../../lib/games";
import { normalizeLocale } from "../../../lib/i18n";
import { getRatingSummaries, getUploadedGames } from "../../../lib/platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "";
  const locale = normalizeLocale(searchParams.get("locale"));
  const [uploaded, demoRatings] = await Promise.all([getUploadedGames(), getRatingSummaries(demoGames.map((game) => game.id))]);
  const dynamicGames = uploaded.map((row) => uploadedRowToGame(row, locale)).filter((game) => !demoGames.some((demo) => demo.slug === game.slug));
  const ratedDemos = demoGames.map((source) => { const game = localizeGame(source, locale); const summary = demoRatings.get(game.id); return { ...game, ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 }; });
  const games = sortRecommendedGames([...dynamicGames, ...ratedDemos]).filter((game) => (!category || game.category === category) && (!q || `${game.title} ${game.titleEn} ${game.creator} ${game.tags.join(" ")}`.toLowerCase().includes(q)));
  return Response.json({ games, total: games.length }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
