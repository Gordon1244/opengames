import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "../../../components/SiteHeader";
import { GameVisual } from "../../../components/GameVisual";
import { findDemoGame, uploadedRowToGame, type Game } from "../../../lib/games";
import { getRatingSummaries, getUploadedGame } from "../../../lib/platform";
import ReportButton from "./ReportButton";
import RatingPanel from "./RatingPanel";

async function loadGame(slug: string): Promise<Game | null> {
  const demo = findDemoGame(slug);
  if (demo) {
    const summary = (await getRatingSummaries([demo.id])).get(demo.id);
    return { ...demo, ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 };
  }
  const row = await getUploadedGame(slug); if (!row) return null;
  return uploadedRowToGame(row);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = await loadGame((await params).slug); if (!game) return { title: "找不到遊戲 — OpenGames" };
  const description = `${game.description.slice(0, 130)} — 在 OpenGames 瀏覽器直接玩。`;
  return { title: `${game.title} — OpenGames`, description, openGraph: { title: `${game.title} — OpenGames`, description, images: [] }, twitter: { card: "summary", title: `${game.title} — OpenGames`, description, images: [] } };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const game = await loadGame((await params).slug); if (!game) notFound();
  return <main className="game-detail-page"><SiteHeader /><section className="game-detail-head"><div><p className="eyebrow"><span /> {game.category.toUpperCase()} / VERSION {game.version}</p><h1>{game.title}</h1><p>{game.description}</p><div className="tag-row">{game.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><GameVisual art={game.art} badge={game.badge} /></section>
    <section className="player-wrap"><div className="player-bar"><div><i /> SANDBOXED PLAYER</div><span>遊戲無法讀取 OpenGames 帳號或主站資料</span></div><iframe title={`${game.title} 遊戲`} src={game.playUrl} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen; gamepad" allowFullScreen /></section>
    <RatingPanel gameId={game.id} slug={game.slug} title={game.title} initialAverage={game.ratingAverage} initialCount={game.ratingCount} />
    <section className="game-detail-info"><div><span className="info-label">CREATOR</span><h2>{game.creator}</h2><p>@{game.creatorHandle}</p></div><div><span className="info-label">RIGHTS</span><h2>{game.license}</h2><p>{game.allowDownload ? "創作者允許下載此版本" : "僅限線上遊玩"}</p></div><div className="detail-actions">{game.sourceUrl && <a href={game.sourceUrl} rel="noreferrer">查看原始碼 ↗</a>}{game.allowDownload && game.releaseId && <a href={`/api/downloads/${game.releaseId}`}>下載 ZIP ↓</a>}{game.releaseId && <ReportButton gameId={game.id} />}</div></section><SiteFooter />
  </main>;
}
