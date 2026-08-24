import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { getCurrentUser } from "../../../lib/auth";
import { copy, getLocale } from "../../../lib/i18n";
import { ensureCreatorProfile } from "../../../lib/platform";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function CreatorProfileSettingsPage() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  if (!user) return <main><SiteHeader /><section className="login-gate"><span>CREATOR PROFILE</span><h1>{copy(locale, "請先登入，再編輯創作者資料。", "Sign in before editing your creator profile.")}</h1><a className="primary-button" href="/login?next=/account/profile">{copy(locale, "登入", "Sign in")} <span>↗</span></a></section><SiteFooter /></main>;
  const profile = await ensureCreatorProfile(user);
  return <main><SiteHeader /><section className="profile-settings-hero"><p className="eyebrow"><span /> CREATOR PROFILE</p><h1>{copy(locale, <>定義你的<br />創作者身分。</>, <>Shape your<br />creator identity.</>)}</h1><p>{copy(locale, "玩家會從作品認識你，也應該有一個地方理解你是誰、擅長什麼。", "Give players a clear place to understand who you are and what you create.")}</p></section>{profile ? <ProfileForm locale={locale} email={user.email} initial={profile} /> : <section className="login-gate"><h2>{copy(locale, "個人檔案服務暫時無法使用。", "Creator profiles are temporarily unavailable.")}</h2></section>}<SiteFooter /></main>;
}
