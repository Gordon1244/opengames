import { cookies } from "next/headers";

export type Locale = "zh-Hant" | "en";

export const localeCookie = "opengames_locale";

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "zh-Hant";
}

export async function getLocale(): Promise<Locale> {
  return normalizeLocale((await cookies()).get(localeCookie)?.value);
}

export function copy<T>(locale: Locale, zh: T, en: T): T {
  return locale === "en" ? en : zh;
}

export function numberLocale(locale: Locale) {
  return locale === "en" ? "en-US" : "zh-TW";
}
