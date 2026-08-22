import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { getCurrentUser } from "../../../lib/auth";
import UpdatePasswordForm from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";
export default async function PasswordPage() {
  const user = await getCurrentUser();
  return <main><SiteHeader /><section className="auth-page"><div className="auth-intro"><p className="eyebrow"><span /> ACCOUNT SECURITY</p><h1>重新保護<br />你的帳號。</h1><p>密碼至少八個字元。更新後請使用新密碼登入。</p></div>{user ? <UpdatePasswordForm /> : <div className="auth-card"><h2>連結已失效</h2><p>請重新申請密碼重設連結。</p><a className="primary-button" href="/login">返回登入 <span>↗</span></a></div>}</section><SiteFooter /></main>;
}
