import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import LoginForm from "./LoginForm";
import { copy, getLocale } from "../../lib/i18n";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next;
  const locale = await getLocale();
  const nextPath = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  return <main><SiteHeader /><section className="auth-page"><div className="auth-intro"><p className="eyebrow"><span /> CREATOR ACCESS</p><h1>{copy(locale, <>加入開放的<br />遊戲創作社群。</>, <>Join an open<br />game-making community.</>)}</h1><p>{copy(locale, "建立作品頁、發布新版本，並保有你對作品的每一項權利。", "Create game pages, publish new versions, and keep every right to your work.")}</p></div><LoginForm locale={locale} nextPath={nextPath} /></section><SiteFooter /></main>;
}
