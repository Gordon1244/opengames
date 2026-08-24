import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "../../../components/SiteHeader";
import { GameVisual } from "../../../components/GameVisual";
import { findDemoGame, localizeGame, uploadedRowToGame, type Game } from "../../../lib/games";
import { copy, getLocale, type Locale } from "../../../lib/i18n";
import { getRatingSummaries, getUploadedGame } from "../../../lib/platform";
import ReportButton from "./ReportButton";
import RatingPanel from "./RatingPanel";
import GamePlayer from "../../../components/GamePlayer";
import { getGameLanguage } from "../../../lib/i18n";
import { getCurrentUser } from "../../../lib/auth";

async function loadGame(slug: string, locale: Locale): Promise<Game | null> {
  const demo = findDemoGame(slug);
  if (demo) {
    const summary = (await getRatingSummaries([demo.id])).get(demo.id);
    return { ...localizeGame(demo, locale), ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 };
  }
  const row = await getUploadedGame(slug); if (!row) return null;
  return uploadedRowToGame(row, locale);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const locale = await getLocale();
  const game = await loadGame((await params).slug, locale); if (!game) return { title: copy(locale, "找不到遊戲 — OpenGames", "Game not found — OpenGames") };
  const description = `${game.description.slice(0, 130)} — ${copy(locale, "在 OpenGames 瀏覽器直接玩。", "Play instantly in your browser on OpenGames.")}`;
  return { title: `${game.title} — OpenGames`, description, openGraph: { title: `${game.title} — OpenGames`, description, images: [] }, twitter: { card: "summary", title: `${game.title} — OpenGames`, description, images: [] } };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale();
  const game = await loadGame((await params).slug, locale); if (!game) notFound();
  const supportedLocales = game.supportedLocales ?? [game.defaultLocale || locale];
  const language = await getGameLanguage(supportedLocales, game.defaultLocale || supportedLocales[0]);
  const user = await getCurrentUser();
  return <main className="game-detail-page"><SiteHeader /><section className="game-detail-head"><div><p className="eyebrow"><span /> {game.category.toUpperCase()} / VERSION {game.version}</p><h1>{game.title}</h1><p>{game.description}</p><div className="tag-row">{game.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><GameVisual art={game.art} badge={game.badge} /></section>
    <GamePlayer title={game.title} playUrl={game.playUrl} gameId={game.id} uiLocale={locale} gameLocale={language.locale} region={language.region} signedIn={Boolean(user)} cloudSavesEnabled={Boolean(game.cloudSavesEnabled)} multiplayerEnabled={Boolean(game.multiplayerEnabled)} multiplayerMaxPlayers={game.multiplayerMaxPlayers ?? 4} multiplayerModes={game.multiplayerModes ?? ["shared"]} roomPolicy={game.multiplayerRoomPolicy ?? "player"} managedUnlimited={Boolean(game.multiplayerManagedUnlimited)} canManageRooms={Boolean(user && game.creatorId === user.id)} />
    <RatingPanel locale={locale} gameId={game.id} slug={game.slug} title={game.title} initialAverage={game.ratingAverage} initialCount={game.ratingCount} />
    <section className="game-detail-info"><div><span className="info-label">CREATOR</span><h2>{game.creator}</h2><p>@{game.creatorHandle}</p></div><div><span className="info-label">RIGHTS</span><h2>{game.license}</h2><p>{game.allowDownload ? copy(locale, "創作者允許下載此版本", "The creator allows this version to be downloaded") : copy(locale, "僅限線上遊玩", "Online play only")}</p></div><div className="detail-actions">{game.sourceUrl && <a href={game.sourceUrl} rel="noreferrer">{copy(locale, "查看原始碼", "View source")} ↗</a>}{game.allowDownload && game.releaseId && <a href={`/api/downloads/${game.releaseId}`}>{copy(locale, "下載 ZIP", "Download ZIP")} ↓</a>}{game.releaseId && <ReportButton locale={locale} gameId={game.id} />}</div></section><SiteFooter />
  </main>;
}
