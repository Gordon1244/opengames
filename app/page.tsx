/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently throws at runtime; use reliable document navigation. */
import { SiteHeader, SiteFooter } from "../components/SiteHeader";
import { GameVisual } from "../components/GameVisual";
import { demoGames, sortRecommendedGames, uploadedRowToGame } from "../lib/games";
import { getRatingSummaries, getUploadedGames } from "../lib/platform";

async function homepageGames() {
  const [uploaded, demoRatings] = await Promise.all([getUploadedGames(), getRatingSummaries(demoGames.map((game) => game.id))]);
  const dynamicGames = uploaded.map(uploadedRowToGame).filter((game) => !demoGames.some((demo) => demo.slug === game.slug));
  const ratedDemos = demoGames.map((game) => { const summary = demoRatings.get(game.id); return { ...game, ratingAverage: summary?.average ?? 0, ratingCount: summary?.count ?? 0 }; });
  return sortRecommendedGames([...dynamicGames, ...ratedDemos]);
}

export default async function Home() {
  const rankedGames = await homepageGames();
  const featured = rankedGames[0] ?? demoGames[0];
  const recommendations = rankedGames.slice(1, 4);
  const featuredRating = featured.ratingCount ? `${featured.ratingAverage.toFixed(1)} / 5` : "尚無評價";
  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> THE OPEN ARCADE</p>
          <h1>好遊戲，<br /><em>不該被埋沒。</em></h1>
          <p className="hero-lead">一個由玩家與創作者共同打造的開源遊戲平台。上傳你的作品，讓全世界在瀏覽器裡直接玩。</p>
          <div className="hero-actions"><a className="primary-button" href="/games">開始探索 <span>↗</span></a><a className="secondary-button" href="/upload">上傳你的遊戲</a></div>
          <div className="hero-proof" aria-label="平台特色"><div><strong>100%</strong><span>瀏覽器直接玩</span></div><div><strong>OPEN</strong><span>MIT 開源平台</span></div><div><strong>FAIR</strong><span>創作者保有權利</span></div></div>
        </div>

        <div className="hero-stage" aria-label="遊戲預覽">
          <div className="stage-halo" />
          <div className="play-window">
            <div className="window-bar"><span className="window-dots"><i /><i /><i /></span><span>PLAY IN BROWSER</span><span className="live-label"><i /> LIVE</span></div>
            <div className="hero-featured-art">
              <GameVisual art={featured.art} badge="社群推薦" />
              <div className="scene-copy"><span>COMMUNITY RATING / {featuredRating}</span><strong>{featured.title}</strong></div>
              <a href={`/games/${featured.slug}`} className="play-button" aria-label={`遊玩 ${featured.title}`}><span>▶</span></a>
            </div>
            <div className="window-footer"><div><strong>{featured.title.toUpperCase()}</strong><span>by {featured.creator}</span></div><div className="window-tags"><span>{featured.category}</span><span>★ {featured.ratingCount ? featured.ratingAverage.toFixed(1) : "NEW"}</span></div></div>
          </div>
          <div className="floating-note note-one"><span>★</span> {featuredRating}</div><div className="floating-note note-two"><span>◎</span> {featured.ratingCount ? `${featured.ratingCount} 則玩家評價` : "等待第一則評價"}</div>
        </div>
      </section>

      <section className="discover" id="discover">
        <div className="section-heading"><div><p className="eyebrow"><span /> RATED BY THE COMMUNITY</p><h2>社群現在推薦這些遊戲。</h2></div><a href="/games">查看所有遊戲 <span>→</span></a></div>
        <div className="game-grid" id="all-games">
          {recommendations.map((game, index) => (
            <a className="game-card" key={game.title} href={`/games/${game.slug}`}>
              <GameVisual art={game.art} badge={index === 0 ? "社群高評價" : game.badge} index={index + 2} />
              <div className="game-info"><div><h3>{game.title}</h3><p>by {game.creator}</p></div><span className="card-rating">★ {game.ratingCount ? game.ratingAverage.toFixed(1) : "新作"}<small>{game.ratingCount ? `${game.ratingCount} 則評價` : `${game.plays.toLocaleString()} 次遊玩`}</small></span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="creator-callout" id="creators">
        <div><p className="eyebrow light"><span /> BUILT IN THE OPEN</p><h2>你做遊戲。<br />我們讓它被看見。</h2></div>
        <div className="creator-copy"><p>保有作品權利，自由決定授權與下載方式。打包 HTML5 遊戲、通過安全檢查，幾分鐘內分享給全世界。</p><a className="light-button" href="/upload">成為首批創作者 <span>↗</span></a></div>
      </section>

      <SiteFooter />
    </main>
  );
}
