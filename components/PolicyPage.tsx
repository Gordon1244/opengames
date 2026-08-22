import { SiteHeader, SiteFooter } from "./SiteHeader";
export function PolicyPage({ kicker, title, intro, sections }: { kicker: string; title: string; intro: string; sections: { title: string; body: string }[] }) {
  return <main><SiteHeader /><article className="policy"><header><p className="eyebrow"><span /> {kicker}</p><h1>{title}</h1><p>{intro}</p></header><div className="policy-body">{sections.map((section, index) => <section key={section.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></section>)}</div><aside>政策會依平台功能、社群安全與適用法規持續更新；重大變更會在本頁說明。</aside></article><SiteFooter /></main>;
}
