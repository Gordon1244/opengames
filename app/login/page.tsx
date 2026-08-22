import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next;
  const nextPath = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  return <main><SiteHeader /><section className="auth-page"><div className="auth-intro"><p className="eyebrow"><span /> CREATOR ACCESS</p><h1>加入開放的<br />遊戲創作社群。</h1><p>建立作品頁、發布新版本，並保有你對作品的每一項權利。</p></div><LoginForm nextPath={nextPath} /></section><SiteFooter /></main>;
}
