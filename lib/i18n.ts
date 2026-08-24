import { cookies, headers } from "next/headers";

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

function languageCandidates(value: string) {
  return value.split(",").map((part) => part.trim().split(";")[0]).filter(Boolean);
}

export function chooseSupportedLocale(supported: string[], fallback: string, preferred: string[], region = "") {
  const normalized = supported.length ? supported : [fallback || "zh-Hant"];
  const exact = new Map(normalized.map((item) => [item.toLowerCase(), item]));
  const candidates = [...preferred];
  if (["TW", "HK", "MO"].includes(region)) candidates.push("zh-Hant");
  if (["CN", "SG"].includes(region)) candidates.push("zh-Hans");
  for (const candidate of candidates) {
    const direct = exact.get(candidate.toLowerCase());
    if (direct) return direct;
    const base = candidate.toLowerCase().split("-")[0];
    const compatible = normalized.find((item) => item.toLowerCase().split("-")[0] === base);
    if (compatible) return compatible;
  }
  return exact.get(fallback.toLowerCase()) ?? normalized[0];
}

export async function getGameLanguage(supported: string[], fallback: string) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const remembered = cookieStore.get(localeCookie)?.value;
  const regionHeader = (requestHeaders.get("cf-ipcountry") || requestHeaders.get("x-vercel-ip-country") || "").toUpperCase();
  const region = /^[A-Z]{2}$/.test(regionHeader) ? regionHeader : "";
  const preferred = [remembered, ...languageCandidates(requestHeaders.get("accept-language") || "")].filter((item): item is string => Boolean(item));
  return { locale: chooseSupportedLocale(supported, fallback, preferred, region), region: region || "XX" };
}
