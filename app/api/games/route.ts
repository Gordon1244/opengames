import { demoGames, sortRecommendedGames, uploadedRowToGame } from "../../../lib/games";
import { getRatingSummaries, getUploadedGames } from "../../../lib/platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "";
  const [uploaded, demoRatings] = await Promise.all([getUploadedGames(), getRatingSummaries(demoGames.map((game) => game.id))]);
  const dynamicGames = uploaded.map(uploadedRowToGame).filter((game) => !demoGames.some((demo) => demo.slug === game.slug));
  const ratedDemos = demoGames.map((game) => { const summary = demoRatings.get(game.id); return { ...game, ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 }; });
  const games = sortRecommendedGames([...dynamicGames, ...ratedDemos]).filter((game) => (!category || game.category === category) && (!q || `${game.title} ${game.titleEn} ${game.creator} ${game.tags.join(" ")}`.toLowerCase().includes(q)));
  return Response.json({ games, total: games.length }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
