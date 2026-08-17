import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import GameDirectory from "./GameDirectory";
export default function GamesPage() { return <main><SiteHeader /><section className="page-hero directory-hero"><p className="eyebrow"><span /> THE OPEN CATALOG</p><h1>下一款喜歡的遊戲，<br />也許還沒被演算法看見。</h1></section><section className="directory"><GameDirectory /></section><SiteFooter /></main>; }
