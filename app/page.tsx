import Link from "next/link";

const games = [
  { title: "Neon Tideline", creator: "Morrow Studio", meta: "節奏冒險 · 6.2k 次遊玩", art: "tide", badge: "本週精選", slug: "neon-tideline" },
  { title: "Orbital Common", creator: "Ada & Finch", meta: "策略 · 4.8k 次遊玩", art: "orbit", badge: "開放原始碼", slug: "orbital-common" },
  { title: "Moon Garden", creator: "Soft Relay", meta: "休閒 · 3.9k 次遊玩", art: "garden", badge: "新作", slug: "moon-garden" },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="OpenGames 首頁"><span className="brand-mark">O</span><span>OpenGames</span></a>
        <nav className="main-nav" aria-label="主要導覽"><Link href="/games">探索遊戲</Link><Link href="/upload">創作者</Link><Link href="/guidelines">關於開源</Link></nav>
        <div className="header-actions"><Link className="language-button" href="/?lang=en" aria-label="切換語言">中 / EN</Link><Link className="sign-in" href="/login">登入</Link></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> THE OPEN ARCADE</p>
          <h1>好遊戲，<br /><em>不該被埋沒。</em></h1>
          <p className="hero-lead">一個由玩家與創作者共同打造的開源遊戲平台。上傳你的作品，讓全世界在瀏覽器裡直接玩。</p>
          <div className="hero-actions"><Link className="primary-button" href="/games">開始探索 <span>↗</span></Link><Link className="secondary-button" href="/upload">上傳你的遊戲</Link></div>
          <div className="hero-proof" aria-label="平台特色"><div><strong>100%</strong><span>瀏覽器直接玩</span></div><div><strong>OPEN</strong><span>MIT 開源平台</span></div><div><strong>FAIR</strong><span>創作者保有權利</span></div></div>
        </div>

        <div className="hero-stage" aria-label="遊戲預覽">
          <div className="stage-halo" />
          <div className="play-window">
            <div className="window-bar"><span className="window-dots"><i /><i /><i /></span><span>PLAY.OPENGAMES.COM</span><span className="live-label"><i /> LIVE</span></div>
            <div className="game-scene">
              <div className="scene-grid" /><div className="scene-moon" /><div className="scene-ship">▲</div>
              <div className="scene-copy"><span>COMMUNITY PICK / 001</span><strong>VOID<br />RUNNER</strong></div>
              <Link href="/games/void-runner" className="play-button" aria-label="遊玩 Void Runner"><span>▶</span></Link>
            </div>
            <div className="window-footer"><div><strong>VOID RUNNER</strong><span>by Kurobyte</span></div><div className="window-tags"><span>動作</span><span>WebGL</span></div></div>
          </div>
          <div className="floating-note note-one"><span>✦</span> 無需安裝</div><div className="floating-note note-two"><span>◎</span> 安全隔離執行</div>
        </div>
      </section>

      <section className="discover" id="discover">
        <div className="section-heading"><div><p className="eyebrow"><span /> DISCOVER SOMETHING NEW</p><h2>現在，玩點不一樣的。</h2></div><a href="#all-games">查看所有遊戲 <span>→</span></a></div>
        <div className="game-grid" id="all-games">
          {games.map((game, index) => (
            <Link className="game-card" key={game.title} href={`/games/${game.slug}`}>
              <div className={`game-art ${game.art}`}><span className="card-index">0{index + 1}</span><span className="card-badge">{game.badge}</span><div className="art-object" /><span className="card-play" aria-label={`遊玩 ${game.title}`}>▶</span></div>
              <div className="game-info"><div><h3>{game.title}</h3><p>by {game.creator}</p></div><span>{game.meta}</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="creator-callout" id="creators">
        <div><p className="eyebrow light"><span /> BUILT IN THE OPEN</p><h2>你做遊戲。<br />我們讓它被看見。</h2></div>
        <div className="creator-copy"><p>保有作品權利，自由決定授權與下載方式。打包 HTML5 遊戲、通過安全檢查，幾分鐘內分享給全世界。</p><Link className="light-button" href="/upload">成為首批創作者 <span>↗</span></Link></div>
      </section>

      <footer id="about"><a className="brand footer-brand" href="#top"><span className="brand-mark">O</span><span>OpenGames</span></a><p>Play freely. Build openly. © 2026 OpenGames.</p><div><a href="https://github.com/Gordon1244/opengames">GitHub</a><Link href="/guidelines">社群規範</Link><Link href="/privacy">隱私</Link></div></footer>
    </main>
  );
}
