import type { Metadata } from "next";
import { AuthSessionSync } from "../components/AuthSessionSync";
import { copy, getLocale } from "../lib/i18n";
import { getSiteOrigin } from "../lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const origin = getSiteOrigin();
  const locale = await getLocale();
  const title = copy(locale, "OpenGames — 好遊戲，不該被埋沒", "OpenGames — Great games deserve to be found");
  const description = copy(locale, "由玩家與創作者共同打造的開源遊戲平台。上傳作品，直接在瀏覽器遊玩。", "An open-source game platform built by players and creators. Upload your work and play instantly in the browser.");
  return {
    metadataBase: new URL(origin), title, description,
    icons: { icon: "/favicon.svg" },
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: copy(locale, "OpenGames 開源遊戲平台", "OpenGames open-source game platform") }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body><AuthSessionSync />{children}</body>
    </html>
  );
}
