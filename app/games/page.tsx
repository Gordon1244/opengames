import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import GameDirectory from "./GameDirectory";
import { copy, getLocale } from "../../lib/i18n";
export default async function GamesPage() { const locale = await getLocale(); return <main><SiteHeader /><section className="page-hero directory-hero"><p className="eyebrow"><span /> THE OPEN CATALOG</p><h1>{copy(locale, <>下一款喜歡的遊戲，<br />也許還沒被演算法看見。</>, <>Your next favorite game<br />may be hiding beyond the algorithm.</>)}</h1></section><section className="directory"><GameDirectory locale={locale} /></section><SiteFooter /></main>; }
