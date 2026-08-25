import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameVisual } from "../../../components/GameVisual";
import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { uploadedRowToGame } from "../../../lib/games";
import { copy, getLocale, numberLocale } from "../../../lib/i18n";
import { getPublicCreatorGames, getPublicCreatorProfile } from "../../../lib/platform";

async function load(handle: string) {
  if (!/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/.test(handle)) return null;
  return getPublicCreatorProfile(handle);
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const profile = await load((await params).handle);
  if (!profile) return { title: "Creator not found — OpenGames" };
  const description = profile.bio.slice(0, 150) || `${profile.displayName} on OpenGames`;
  return { title: `${profile.displayName} — OpenGames`, description, openGraph: { title: `${profile.displayName} — OpenGames`, description, images: [] }, twitter: { card: "summary", title: `${profile.displayName} — OpenGames`, description, images: [] } };
}

export default async function PublicCreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const locale = await getLocale();
  const profile = await load((await params).handle); if (!profile) notFound();
  const rows = await getPublicCreatorGames(profile.id);
  const games = rows.map((row) => uploadedRowToGame(row, locale));
  const totalPlays = games.reduce((sum, game) => sum + game.plays, 0);
  const joined = profile.createdAt ? new Intl.DateTimeFormat(numberLocale(locale), { year: "numeric", month: "long" }).format(new Date(`${profile.createdAt.replace(" ", "T")}Z`)) : "—";
  return <main><SiteHeader /><section className="creator-profile-hero"><div className="creator-profile-avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow"><span /> OPEN CREATOR / @{profile.handle}</p><h1>{profile.displayName}</h1><strong>{profile.headline || copy(locale, "OpenGames 創作者", "OpenGames creator")}</strong><p>{profile.bio || copy(locale, "這位創作者尚未填寫個人簡介。", "This creator has not added a bio yet.")}</p><div className="creator-profile-meta">{profile.location && <span>◎ {profile.location}</span>}<span>＋ {copy(locale, `加入於 ${joined}`, `Joined ${joined}`)}</span>{profile.websiteUrl && <a href={profile.websiteUrl} rel="noreferrer">{copy(locale, "個人網站 ↗", "Website ↗")}</a>}</div><div className="creator-skill-row">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div></section>
    <section className="creator-profile-stats"><div><strong>{games.length}</strong><span>{copy(locale, "公開作品", "Published games")}</span></div><div><strong>{totalPlays.toLocaleString(numberLocale(locale))}</strong><span>{copy(locale, "累積遊玩", "Total plays")}</span></div><div><strong>{games.reduce((sum, game) => sum + game.ratingCount, 0)}</strong><span>{copy(locale, "社群評價", "Community reviews")}</span></div></section>
    <section className="creator-works"><header><p className="eyebrow"><span /> SELECTED WORK</p><h2>{copy(locale, "公開作品", "Published work")}</h2></header>{games.length ? <div className="game-grid">{games.map((game, index) => <a className="game-card" key={game.id} href={`/games/${game.slug}`}><GameVisual art={game.art} badge={game.badge} index={index + 1} /><div className="game-info"><div><h3>{game.title}</h3><p>{game.category}</p></div><span className="card-rating">★ {game.ratingCount ? game.ratingAverage.toFixed(1) : (game.isNew ? copy(locale, "新作", "NEW") : copy(locale, "尚無評價", "NOT RATED"))}<small>{copy(locale, `${game.plays.toLocaleString("zh-TW")} 次遊玩`, `${game.plays.toLocaleString("en-US")} plays`)}</small></span></div></a>)}</div> : <div className="empty-state"><strong>{copy(locale, "尚無公開作品。", "No published games yet.")}</strong><span>{copy(locale, "作品發布後會顯示在這裡。", "Published work will appear here.")}</span></div>}</section><SiteFooter /></main>;
}
