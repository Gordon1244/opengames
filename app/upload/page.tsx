import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import { getCurrentUser } from "../../lib/auth";
import UploadForm from "./UploadForm";
import { copy, getLocale } from "../../lib/i18n";

export const dynamic = "force-dynamic";
export default async function UploadPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  return <main><SiteHeader /><section className="page-hero upload-hero"><p className="eyebrow"><span /> PUBLISH YOUR GAME</p><h1>{copy(locale, <>讓作品被玩到，<br />不是只被看到。</>, <>Let your game be played,<br />not merely seen.</>)}</h1><p>{copy(locale, "上傳純前端 HTML5 遊戲。通過結構與檔案安全檢查後，立即建立可分享的遊戲頁。", "Upload a client-side HTML5 game. After structure and file safety checks, you will get a shareable game page instantly.")}</p></section>{user ? <UploadForm locale={locale} /> : <section className="login-gate"><span>LOCKED / CREATOR ONLY</span><h2>{copy(locale, "先登入，才能發布作品。", "Sign in before publishing a game.")}</h2><p>{copy(locale, "OpenGames 使用 Email 建立獨立創作者帳號。", "OpenGames uses email to create an independent creator account.")}</p><a className="primary-button" href="/login?next=/upload">{copy(locale, "登入或免費註冊", "Sign in or register free")} <span>↗</span></a></section>}<SiteFooter /></main>;
}
