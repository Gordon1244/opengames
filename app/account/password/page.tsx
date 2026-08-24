import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { getCurrentUser } from "../../../lib/auth";
import UpdatePasswordForm from "./UpdatePasswordForm";
import { copy, getLocale } from "../../../lib/i18n";

export const dynamic = "force-dynamic";
export default async function PasswordPage() {
  // Password-recovery links must remain usable when the user has lost their second factor.
  const user = await getCurrentUser({ requireMfa: false });
  const locale = await getLocale();
  return <main><SiteHeader /><section className="auth-page"><div className="auth-intro"><p className="eyebrow"><span /> ACCOUNT SECURITY</p><h1>{copy(locale, <>重新保護<br />你的帳號。</>, <>Protect your<br />account again.</>)}</h1><p>{copy(locale, "新密碼至少八個字元，並須包含大小寫英文字母與數字；較舊的登入工作階段會再以 Email 驗證碼確認。", "Use at least eight characters with lowercase and uppercase letters and a number. Older sign-in sessions also require an email verification code.")}</p></div>{user ? <UpdatePasswordForm locale={locale} /> : <div className="auth-card"><h2>{copy(locale, "連結已失效", "Link expired")}</h2><p>{copy(locale, "請重新申請密碼重設連結。", "Request a new password reset link.")}</p><a className="primary-button" href="/login">{copy(locale, "返回登入", "Back to sign in")} <span>↗</span></a></div>}</section><SiteFooter /></main>;
}
