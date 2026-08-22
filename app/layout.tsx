import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionSync } from "../components/AuthSessionSync";
import { getSiteOrigin } from "../lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const origin = getSiteOrigin();
  const description = "由玩家與創作者共同打造的開源遊戲平台。上傳作品，直接在瀏覽器遊玩。";
  return {
    metadataBase: new URL(origin), title: "OpenGames — 好遊戲，不該被埋沒", description,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: { title: "OpenGames — 好遊戲，不該被埋沒", description, type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "OpenGames 開源遊戲平台" }] },
    twitter: { card: "summary_large_image", title: "OpenGames — 好遊戲，不該被埋沒", description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable}`}><AuthSessionSync />{children}</body>
    </html>
  );
}
