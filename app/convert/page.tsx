import { SiteFooter, SiteHeader } from "../../components/SiteHeader";
import { copy, getLocale } from "../../lib/i18n";
import Converter from "./Converter";

export default async function ConvertPage() {
  const locale = await getLocale();
  return <main>
    <SiteHeader />
    <section className="page-hero converter-hero">
      <p className="eyebrow"><span /> WEB CONVERSION CHECK</p>
      <h1>{copy(locale, <>先檢查，<br />再決定怎麼上網。</>, <>Inspect first.<br />Choose the right path to web.</>)}</h1>
      <p>{copy(locale, "辨識 Unity、C／C++、C#／.NET、Godot 原始專案，以及 EXE／APK 成品的網頁相容性。", "Check the web compatibility of Unity, C/C++, C#/.NET, and Godot source projects, plus finished EXE and APK binaries.")}</p>
    </section>
    <Converter locale={locale} />
    <SiteFooter />
  </main>;
}
