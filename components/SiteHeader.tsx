/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Vinext client navigation currently throws at runtime; static brand SVG needs no image optimization. */
import { getCurrentUser } from "../lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser({ requireMfa: false });
  const accountHref = user?.mfaRequired ? "/account/security?challenge=1&next=/dashboard" : "/dashboard";
  const accountLabel = user?.mfaRequired ? "完成驗證" : "控制台";
  return (
    <header className="site-header inner-header">
      <a className="brand" href="/" aria-label="OpenGames 首頁"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>OpenGames</span></a>
      <nav className="main-nav" aria-label="主要導覽"><a href="/games">探索遊戲</a><a href="/upload">上傳作品</a><a href="/guidelines">社群規範</a></nav>
      <div className="header-actions">{user ? <a className="sign-in" href={accountHref}>{accountLabel}</a> : <a className="sign-in" href="/login">登入</a>}</div>
      <details className="mobile-menu">
        <summary aria-label="開啟網站選單">選單</summary>
        <nav aria-label="行動版導覽"><a href="/games">探索遊戲</a><a href="/upload">上傳作品</a><a href="/guidelines">社群規範</a>{user ? <><a href={accountHref}>{accountLabel}</a><a href="/account/security">帳號安全</a></> : <a href="/login">登入／註冊</a>}</nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return <footer id="about"><a className="brand footer-brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>OpenGames</span></a><p>Play freely. Build openly. © 2026 OpenGames.</p><div><a href="https://github.com/Gordon1244/opengames" rel="noreferrer">GitHub</a><a href="/guidelines">社群規範</a><a href="/copyright">著作權</a><a href="/privacy">隱私</a></div></footer>;
}
