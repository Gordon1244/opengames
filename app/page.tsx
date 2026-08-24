/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently throws at runtime; use reliable document navigation. */
import { SiteHeader, SiteFooter } from "../components/SiteHeader";
import { GameVisual } from "../components/GameVisual";
import { demoGames, localizeGame, sortRecommendedGames, uploadedRowToGame } from "../lib/games";
import { copy, getLocale, numberLocale, type Locale } from "../lib/i18n";
import { getRatingSummaries, getUploadedGames } from "../lib/platform";

async function homepageGames(locale: Locale) {
  const [uploaded, demoRatings] = await Promise.all([getUploadedGames(), getRatingSummaries(demoGames.map((game) => game.id))]);
  const dynamicGames = uploaded.map((row) => uploadedRowToGame(row, locale)).filter((game) => !demoGames.some((demo) => demo.slug === game.slug));
  const ratedDemos = demoGames.map((source) => { const game = localizeGame(source, locale); const summary = demoRatings.get(game.id); return { ...game, ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 }; });
  return sortRecommendedGames([...dynamicGames, ...ratedDemos]);
}

export default async function Home() {
  const locale = await getLocale();
  const rankedGames = await homepageGames(locale);
  const featured = rankedGames[0] ?? localizeGame(demoGames[0], locale);
  const recommendations = rankedGames.slice(1, 4);
  const featuredRating = featured.ratingCount ? `${featured.ratingAverage.toFixed(1)} / 5` : copy(locale, "尚無評價", "Not rated yet");
  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> THE OPEN ARCADE</p>
          <h1>{copy(locale, <>好遊戲，<br /><em>不該被埋沒。</em></>, <>Great games<br /><em>deserve to be found.</em></>)}</h1>
          <p className="hero-lead">{copy(locale, "一個由玩家與創作者共同打造的開源遊戲平台。上傳你的作品，讓全世界在瀏覽器裡直接玩。", "An open-source game platform built by players and creators. Upload your work and let anyone play it instantly in the browser.")}</p>
          <div className="hero-actions"><a className="primary-button" href="/games">{copy(locale, "開始探索", "Start exploring")} <span>↗</span></a><a className="secondary-button" href="/upload">{copy(locale, "上傳你的遊戲", "Upload your game")}</a></div>
          <div className="hero-proof" aria-label={copy(locale, "平台特色", "Platform highlights")}><div><strong>100%</strong><span>{copy(locale, "瀏覽器直接玩", "Play in browser")}</span></div><div><strong>OPEN</strong><span>{copy(locale, "MIT 開源平台", "MIT open source")}</span></div><div><strong>FAIR</strong><span>{copy(locale, "創作者保有權利", "Creators keep rights")}</span></div></div>
        </div>

        <div className="hero-stage" aria-label={copy(locale, "遊戲預覽", "Game preview")}>
          <div className="stage-halo" />
          <div className="play-window">
            <div className="window-bar"><span className="window-dots"><i /><i /><i /></span><span>PLAY IN BROWSER</span><span className="live-label"><i /> LIVE</span></div>
            <div className="hero-featured-art">
              <GameVisual art={featured.art} badge={copy(locale, "社群推薦", "Community pick")} />
              <div className="scene-copy"><span>COMMUNITY RATING / {featuredRating}</span><strong>{featured.title}</strong></div>
              <a href={`/games/${featured.slug}`} className="play-button" aria-label={`${copy(locale, "遊玩", "Play")} ${featured.title}`}><span>▶</span></a>
            </div>
            <div className="window-footer"><div><strong>{featured.title.toUpperCase()}</strong><span>by {featured.creator}</span></div><div className="window-tags"><span>{featured.category}</span><span>★ {featured.ratingCount ? featured.ratingAverage.toFixed(1) : "NEW"}</span></div></div>
          </div>
          <div className="floating-note note-one"><span>★</span> {featuredRating}</div><div className="floating-note note-two"><span>◎</span> {featured.ratingCount ? copy(locale, `${featured.ratingCount} 則玩家評價`, `${featured.ratingCount} player reviews`) : copy(locale, "等待第一則評價", "Waiting for the first review")}</div>
        </div>
      </section>

      <section className="discover" id="discover">
        <div className="section-heading"><div><p className="eyebrow"><span /> RATED BY THE COMMUNITY</p><h2>{copy(locale, "社群現在推薦這些遊戲。", "Games the community recommends right now.")}</h2></div><a href="/games">{copy(locale, "查看所有遊戲", "View all games")} <span>→</span></a></div>
        <div className="game-grid" id="all-games">
          {recommendations.map((game, index) => (
            <a className="game-card" key={game.title} href={`/games/${game.slug}`}>
              <GameVisual art={game.art} badge={index === 0 ? copy(locale, "社群高評價", "Highly rated") : game.badge} index={index + 2} />
              <div className="game-info"><div><h3>{game.title}</h3><p>by {game.creator}</p></div><span className="card-rating">★ {game.ratingCount ? game.ratingAverage.toFixed(1) : copy(locale, "新作", "NEW")}<small>{game.ratingCount ? copy(locale, `${game.ratingCount} 則評價`, `${game.ratingCount} reviews`) : copy(locale, `${game.plays.toLocaleString("zh-TW")} 次遊玩`, `${game.plays.toLocaleString(numberLocale(locale))} plays`)}</small></span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="creator-callout" id="creators">
        <div><p className="eyebrow light"><span /> BUILT IN THE OPEN</p><h2>{copy(locale, <>你做遊戲。<br />我們讓它被看見。</>, <>You make games.<br />We help them get seen.</>)}</h2></div>
        <div className="creator-copy"><p>{copy(locale, "保有作品權利，自由決定授權與下載方式。上傳 JavaScript、WebAssembly、Unity Web 或 .NET WebAssembly 建置，通過檢查後分享給全世界。", "Keep the rights to your work and choose its license and download options. Upload a JavaScript, WebAssembly, Unity Web, or .NET WebAssembly build and share it worldwide after validation.")}</p><a className="light-button" href="/upload">{copy(locale, "成為首批創作者", "Become an early creator")} <span>↗</span></a></div>
      </section>

      <SiteFooter />
    </main>
  );
}
