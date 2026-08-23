import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { getCurrentUser } from "../../../lib/auth";
import SecuritySettings from "./SecuritySettings";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ challenge?: string; next?: string }> }) {
  const user = await getCurrentUser({ requireMfa: false });
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  if (!user) return <main><SiteHeader /><section className="login-gate"><span>ACCOUNT SECURITY</span><h1>請先登入 OpenGames。</h1><a className="primary-button" href="/login?next=/account/security">登入 <span>↗</span></a></section><SiteFooter /></main>;
  return <main><SiteHeader /><section className="security-hero"><p className="eyebrow"><span /> ACCOUNT SECURITY</p><h1>保護你的<br />創作者帳號。</h1><p>{user.email}</p></section><SecuritySettings challenge={params.challenge === "1" || user.mfaRequired} nextPath={nextPath} /><SiteFooter /></main>;
}
