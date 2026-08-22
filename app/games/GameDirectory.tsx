"use client";
import { useEffect, useMemo, useState } from "react";
import type { Game } from "../../lib/games";
import { GameVisual } from "../../components/GameVisual";

const categories = ["全部", "動作", "冒險", "益智", "策略", "休閒"];
export default function GameDirectory() {
  const [games, setGames] = useState<Game[]>([]); const [q, setQ] = useState(""); const [category, setCategory] = useState("全部"); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/games", { signal: controller.signal }).then((res) => { if (!res.ok) throw new Error("catalog"); return res.json(); }).then((data) => setGames(data.games ?? [])).catch((reason) => { if (reason?.name !== "AbortError") setError(true); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const visible = useMemo(() => games.filter((game) => (category === "全部" || game.category === category) && (!q || `${game.title} ${game.titleEn} ${game.creator} ${game.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [games, q, category]);
  return <>
    <div className="directory-tools"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="搜尋遊戲、創作者或標籤" value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋遊戲、創作者或標籤" /></label><div className="category-tabs">{categories.map((item) => <button type="button" aria-pressed={item === category} className={item === category ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    <div className="directory-count">{loading ? "載入中…" : `${visible.length} 款可以立即遊玩的作品`}<span>依最新發布排序</span></div>
    <div className="game-grid directory-grid">{visible.map((game, index) => <a className="game-card" key={game.id} href={`/games/${game.slug}`}><GameVisual art={game.art} badge={game.badge} index={index + 1} /><div className="game-info"><div><h3>{game.title}</h3><p>by {game.creator}</p></div><span>{game.category} · {game.plays.toLocaleString()} 次</span></div></a>)}</div>
    {!loading && error && <div className="empty-state"><strong>遊戲目錄暫時無法載入。</strong><span>請重新整理頁面再試一次。</span></div>}
    {!loading && !error && visible.length === 0 && <div className="empty-state"><strong>這裡暫時沒有符合的遊戲。</strong><span>換一個關鍵字，或成為第一位上傳這類作品的創作者。</span></div>}
  </>;
}
