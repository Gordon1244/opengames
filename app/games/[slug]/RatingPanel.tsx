"use client";

import { useEffect, useState } from "react";

type RatingState = { average: number; count: number; userRating: number | null; signedIn: boolean };

export default function RatingPanel({ gameId, slug, title, initialAverage, initialCount }: { gameId: string; slug: string; title: string; initialAverage: number; initialCount: number }) {
  const [state, setState] = useState<RatingState>({ average: initialAverage, count: initialCount, userRating: null, signedIn: false });
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("rating")))
      .then((data: RatingState) => setState(data))
      .catch((error) => { if (error?.name !== "AbortError") setMessage("目前無法讀取你的評分狀態。"); });
    return () => controller.abort();
  }, [gameId]);

  async function saveRating(rating: number) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { setState((current) => ({ ...current, signedIn: false })); setMessage("請先登入，再留下評價。"); }
    else if (!response.ok) setMessage(data.error ?? "評價儲存失敗，請稍後再試。");
    else { setState(data); setMessage("你的評價已更新。首頁推薦會採用新的評分。" ); }
    setBusy(false);
  }

  async function clearRating() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "無法移除評價。");
    else { setState(data); setMessage("已移除你的評價。" ); }
    setBusy(false);
  }

  const preview = hovered || state.userRating || 0;
  return <section className="rating-panel" aria-labelledby="rating-title">
    <div className="rating-score"><span>COMMUNITY RATING</span><strong>{state.count ? state.average.toFixed(1) : "—"}</strong><div aria-label={state.count ? `平均 ${state.average.toFixed(1)} 顆星` : "尚無評價"}>★★★★★</div><small>{state.count ? `${state.count.toLocaleString()} 則評價` : "成為第一位評價的玩家"}</small></div>
    <div className="rating-action"><p id="rating-title">你覺得《{title}》值得幾顆星？</p><div className="rating-stars" role="group" aria-label={`評價 ${title}`} onMouseLeave={() => setHovered(0)}>{[1,2,3,4,5].map((value) => <button key={value} type="button" aria-label={`${value} 顆星`} aria-pressed={state.userRating === value} className={value <= preview ? "active" : ""} disabled={busy} onMouseEnter={() => setHovered(value)} onFocus={() => setHovered(value)} onBlur={() => setHovered(0)} onClick={() => void saveRating(value)}>★</button>)}</div>
      <div className="rating-meta">{state.userRating ? <><span>你目前給了 {state.userRating} 顆星</span><button type="button" disabled={busy} onClick={() => void clearRating()}>移除評價</button></> : <span>每個帳號只計算一票，可隨時修改。</span>}</div>
      {!state.signedIn && <a className="rating-login" href={`/login?next=/games/${encodeURIComponent(slug)}`}>登入後評價 →</a>}
      {message && <span className="rating-message" role="status">{message}</span>}
    </div>
  </section>;
}
