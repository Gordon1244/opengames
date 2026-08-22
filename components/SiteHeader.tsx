import { getCurrentUser } from "../lib/auth";
import Link from "next/link";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="site-header inner-header">
      <Link className="brand" href="/" aria-label="OpenGames 首頁"><span className="brand-mark">O</span><span>OpenGames</span></Link>
      <nav className="main-nav" aria-label="主要導覽"><Link href="/games">探索遊戲</Link><Link href="/upload">上傳作品</Link><Link href="/guidelines">社群規範</Link></nav>
      <div className="header-actions">{user ? <Link className="sign-in" href="/dashboard">控制台</Link> : <Link className="sign-in" href="/login">登入</Link>}</div>
      <details className="mobile-menu">
        <summary aria-label="開啟網站選單">選單</summary>
        <nav aria-label="行動版導覽"><Link href="/games">探索遊戲</Link><Link href="/upload">上傳作品</Link><Link href="/guidelines">社群規範</Link>{user ? <Link href="/dashboard">作品控制台</Link> : <Link href="/login">登入／註冊</Link>}</nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return <footer id="about"><Link className="brand footer-brand" href="/"><span className="brand-mark">O</span><span>OpenGames</span></Link><p>Play freely. Build openly. © 2026 OpenGames.</p><div><a href="https://github.com/Gordon1244/opengames" rel="noreferrer">GitHub</a><Link href="/guidelines">社群規範</Link><Link href="/copyright">著作權</Link><Link href="/privacy">隱私</Link></div></footer>;
}
