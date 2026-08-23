"use client";

import { useRef } from "react";
import type { Locale } from "../lib/i18n";

export function LanguageSwitch({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const nextRef = useRef<HTMLInputElement>(null);
  return <form className={`language-switch${mobile ? " mobile-language-switch" : ""}`} action="/api/locale" method="post" onSubmit={() => {
    if (nextRef.current) nextRef.current.value = `${location.pathname}${location.search}`;
  }}>
    <input type="hidden" name="locale" value={locale === "en" ? "zh-Hant" : "en"} />
    <input ref={nextRef} type="hidden" name="next" value="/" readOnly />
    <button type="submit" aria-label={locale === "en" ? "切換至繁體中文" : "Switch to English"}><span aria-hidden="true">文</span>{locale === "en" ? "繁中" : "EN"}</button>
  </form>;
}
