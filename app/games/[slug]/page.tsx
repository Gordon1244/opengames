import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "../../../components/SiteHeader";
import { GameVisual } from "../../../components/GameVisual";
import { findDemoGame, localizeGame, uploadedRowToGame, type Game } from "../../../lib/games";
import { copy, getLocale, type Locale } from "../../../lib/i18n";
import { getRatingSummaries, getUploadedGame } from "../../../lib/platform";
import ReportButton from "./ReportButton";
import RatingPanel from "./RatingPanel";

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
  return <main className="game-detail-page"><SiteHeader /><section className="game-detail-head"><div><p className="eyebrow"><span /> {game.category.toUpperCase()} / VERSION {game.version}</p><h1>{game.title}</h1><p>{game.description}</p><div className="tag-row">{game.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><GameVisual art={game.art} badge={game.badge} /></section>
    <section className="player-wrap"><div className="player-bar"><div><i /> SANDBOXED PLAYER</div><span>{copy(locale, "遊戲無法讀取 OpenGames 帳號或主站資料", "The game cannot access your OpenGames account or site data")}</span></div><iframe title={`${game.title} ${copy(locale, "遊戲", "game")}`} src={game.playUrl} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen; gamepad" allowFullScreen /></section>
    <RatingPanel locale={locale} gameId={game.id} slug={game.slug} title={game.title} initialAverage={game.ratingAverage} initialCount={game.ratingCount} />
    <section className="game-detail-info"><div><span className="info-label">CREATOR</span><h2>{game.creator}</h2><p>@{game.creatorHandle}</p></div><div><span className="info-label">RIGHTS</span><h2>{game.license}</h2><p>{game.allowDownload ? copy(locale, "創作者允許下載此版本", "The creator allows this version to be downloaded") : copy(locale, "僅限線上遊玩", "Online play only")}</p></div><div className="detail-actions">{game.sourceUrl && <a href={game.sourceUrl} rel="noreferrer">{copy(locale, "查看原始碼", "View source")} ↗</a>}{game.allowDownload && game.releaseId && <a href={`/api/downloads/${game.releaseId}`}>{copy(locale, "下載 ZIP", "Download ZIP")} ↓</a>}{game.releaseId && <ReportButton locale={locale} gameId={game.id} />}</div></section><SiteFooter />
  </main>;
}
