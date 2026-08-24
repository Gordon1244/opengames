/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Vinext client navigation currently throws at runtime; static brand SVG needs no image optimization. */
import { getCurrentUser } from "../lib/auth";
import { copy, getLocale } from "../lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

export async function SiteHeader() {
  const locale = await getLocale();
  const user = await getCurrentUser({ requireMfa: false });
  const accountHref = user?.mfaRequired ? "/account/security?challenge=1&next=/dashboard" : "/dashboard";
  const accountLabel = user?.mfaRequired ? copy(locale, "完成驗證", "Verify") : copy(locale, "控制台", "Dashboard");
  return (
    <header className="site-header inner-header">
      <a className="brand" href="/" aria-label={copy(locale, "OpenGames 首頁", "OpenGames home")}><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>OpenGames</span></a>
      <nav className="main-nav" aria-label={copy(locale, "主要導覽", "Main navigation")}><a href="/games">{copy(locale, "探索遊戲", "Explore")}</a><a href="/upload">{copy(locale, "上傳作品", "Upload")}</a><a href="/convert">{copy(locale, "轉換檢查", "Converter")}</a><a href="/guides">{copy(locale, "匯出教學", "Guides")}</a><a href="/guidelines">{copy(locale, "社群規範", "Guidelines")}</a></nav>
      <div className="header-actions"><LanguageSwitch locale={locale} />{user ? <a className="sign-in" href={accountHref}>{accountLabel}</a> : <a className="sign-in" href="/login">{copy(locale, "登入", "Sign in")}</a>}</div>
      <details className="mobile-menu">
        <summary aria-label={copy(locale, "開啟網站選單", "Open site menu")}>{copy(locale, "選單", "Menu")}</summary>
        <nav aria-label={copy(locale, "行動版導覽", "Mobile navigation")}><a href="/games">{copy(locale, "探索遊戲", "Explore")}</a><a href="/upload">{copy(locale, "上傳作品", "Upload")}</a><a href="/convert">{copy(locale, "轉換檢查", "Converter")}</a><a href="/guides">{copy(locale, "匯出教學", "Guides")}</a><a href="/guidelines">{copy(locale, "社群規範", "Guidelines")}</a>{user ? <><a href={accountHref}>{accountLabel}</a><a href="/account/profile">{copy(locale, "創作者資料", "Creator profile")}</a><a href="/account/security">{copy(locale, "帳號安全", "Account security")}</a></> : <a href="/login">{copy(locale, "登入／註冊", "Sign in / Register")}</a>}<LanguageSwitch locale={locale} mobile /></nav>
      </details>
    </header>
  );
}

export async function SiteFooter() {
  const locale = await getLocale();
  return <footer id="about"><a className="brand footer-brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>OpenGames</span></a><p>Play freely. Build openly. © 2026 OpenGames.</p><div><a href="https://github.com/Gordon1244/opengames" rel="noreferrer">GitHub</a><a href="/guides">{copy(locale, "匯出教學", "Guides")}</a><a href="/guidelines">{copy(locale, "社群規範", "Guidelines")}</a><a href="/copyright">{copy(locale, "著作權", "Copyright")}</a><a href="/privacy">{copy(locale, "隱私", "Privacy")}</a></div></footer>;
}
