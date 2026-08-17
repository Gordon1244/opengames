import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import { getCurrentUser } from "../../lib/auth";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";
export default async function UploadPage() {
  const user = await getCurrentUser();
  return <main><SiteHeader /><section className="page-hero upload-hero"><p className="eyebrow"><span /> PUBLISH YOUR GAME</p><h1>讓作品被玩到，<br />不是只被看到。</h1><p>上傳純前端 HTML5 遊戲。通過結構與檔案安全檢查後，立即建立可分享的遊戲頁。</p></section>{user ? <UploadForm /> : <section className="login-gate"><span>LOCKED / CREATOR ONLY</span><h2>先登入，才能發布作品。</h2><p>OpenGames 使用 Email、Google 或 GitHub 建立獨立創作者帳號。</p><a className="primary-button" href="/login?next=/upload">登入或免費註冊 <span>↗</span></a></section>}<SiteFooter /></main>;
}
