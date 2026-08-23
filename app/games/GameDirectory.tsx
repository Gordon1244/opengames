"use client";
import { useEffect, useMemo, useState } from "react";
import type { Game } from "../../lib/games";
import { GameVisual } from "../../components/GameVisual";
import type { Locale } from "../../lib/i18n";

const categories = { "zh-Hant": ["全部", "動作", "冒險", "益智", "策略", "休閒"], en: ["All", "Action", "Adventure", "Puzzle", "Strategy", "Casual"] } as const;
export default function GameDirectory({ locale }: { locale: Locale }) {
  const english = locale === "en"; const all = english ? "All" : "全部";
  const [games, setGames] = useState<Game[]>([]); const [q, setQ] = useState(""); const [category, setCategory] = useState(all); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/games?locale=${encodeURIComponent(locale)}`, { signal: controller.signal }).then((res) => { if (!res.ok) throw new Error("catalog"); return res.json(); }).then((data) => setGames(data.games ?? [])).catch((reason) => { if (reason?.name !== "AbortError") setError(true); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [locale]);
  const visible = useMemo(() => games.filter((game) => (category === all || game.category === category) && (!q || `${game.title} ${game.titleEn} ${game.creator} ${game.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [games, q, category, all]);
  return <>
    <div className="directory-tools"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label={english ? "Search games, creators, or tags" : "搜尋遊戲、創作者或標籤"} value={q} onChange={(event) => setQ(event.target.value)} placeholder={english ? "Search games, creators, or tags" : "搜尋遊戲、創作者或標籤"} /></label><div className="category-tabs">{categories[locale].map((item) => <button type="button" aria-pressed={item === category} className={item === category ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    <div className="directory-count">{loading ? (english ? "Loading…" : "載入中…") : (english ? `${visible.length} games ready to play` : `${visible.length} 款可以立即遊玩的作品`)}<span>{english ? "Sorted by community-weighted rating" : "依社群加權評價排序"}</span></div>
    <div className="game-grid directory-grid">{visible.map((game, index) => <a className="game-card" key={game.id} href={`/games/${game.slug}`}><GameVisual art={game.art} badge={game.badge} index={index + 1} /><div className="game-info"><div><h3>{game.title}</h3><p>by {game.creator}</p></div><span className="card-rating">★ {game.ratingCount ? game.ratingAverage.toFixed(1) : (english ? "NEW" : "新作")}<small>{game.ratingCount ? (english ? `${game.ratingCount} reviews` : `${game.ratingCount} 則`) : (english ? `${game.plays.toLocaleString("en-US")} plays` : `${game.plays.toLocaleString("zh-TW")} 次遊玩`)}</small></span></div></a>)}</div>
    {!loading && error && <div className="empty-state"><strong>{english ? "The game catalog is temporarily unavailable." : "遊戲目錄暫時無法載入。"}</strong><span>{english ? "Refresh the page and try again." : "請重新整理頁面再試一次。"}</span></div>}
    {!loading && !error && visible.length === 0 && <div className="empty-state"><strong>{english ? "No games match your search yet." : "這裡暫時沒有符合的遊戲。"}</strong><span>{english ? "Try another keyword, or become the first creator to upload one." : "換一個關鍵字，或成為第一位上傳這類作品的創作者。"}</span></div>}
  </>;
}
