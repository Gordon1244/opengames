import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { getCurrentUser } from "../../../lib/auth";
import SecurityGate from "./SecurityGate";
import { copy, getLocale } from "../../../lib/i18n";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ challenge?: string; notify?: string; next?: string }> }) {
  const user = await getCurrentUser({ requireMfa: false });
  const locale = await getLocale();
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  if (!user) return <main><SiteHeader /><section className="login-gate"><span>ACCOUNT SECURITY</span><h1>{copy(locale, "請先登入 OpenGames。", "Sign in to OpenGames first.")}</h1><a className="primary-button" href="/login?next=/account/security">{copy(locale, "登入", "Sign in")} <span>↗</span></a></section><SiteFooter /></main>;
  return <main><SiteHeader /><section className="security-hero"><p className="eyebrow"><span /> ACCOUNT SECURITY</p><h1>{copy(locale, <>保護你的<br />創作者帳號。</>, <>Protect your<br />creator account.</>)}</h1><p>{copy(locale, "敏感設定已鎖定，請先再次確認身分。", "Sensitive settings are locked until you confirm your identity again.")}</p></section><SecurityGate locale={locale} userId={user.id} challenge={params.challenge === "1" || user.mfaRequired} notificationPending={params.notify === "1"} nextPath={nextPath} /><SiteFooter /></main>;
}
