/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently throws at runtime; use reliable document navigation. */
import { getCurrentUser } from "../lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="site-header inner-header">
      <a className="brand" href="/" aria-label="OpenGames 首頁"><span className="brand-mark">O</span><span>OpenGames</span></a>
      <nav className="main-nav" aria-label="主要導覽"><a href="/games">探索遊戲</a><a href="/upload">上傳作品</a><a href="/guidelines">社群規範</a></nav>
      <div className="header-actions">{user ? <a className="sign-in" href="/dashboard">控制台</a> : <a className="sign-in" href="/login">登入</a>}</div>
      <details className="mobile-menu">
        <summary aria-label="開啟網站選單">選單</summary>
        <nav aria-label="行動版導覽"><a href="/games">探索遊戲</a><a href="/upload">上傳作品</a><a href="/guidelines">社群規範</a>{user ? <a href="/dashboard">作品控制台</a> : <a href="/login">登入／註冊</a>}</nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return <footer id="about"><a className="brand footer-brand" href="/"><span className="brand-mark">O</span><span>OpenGames</span></a><p>Play freely. Build openly. © 2026 OpenGames.</p><div><a href="https://github.com/Gordon1244/opengames" rel="noreferrer">GitHub</a><a href="/guidelines">社群規範</a><a href="/copyright">著作權</a><a href="/privacy">隱私</a></div></footer>;
}
