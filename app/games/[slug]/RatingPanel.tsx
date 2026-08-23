"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../../../lib/i18n";

type RatingState = { average: number; count: number; userRating: number | null; signedIn: boolean };

export default function RatingPanel({ locale, gameId, slug, title, initialAverage, initialCount }: { locale: Locale; gameId: string; slug: string; title: string; initialAverage: number; initialCount: number }) {
  const english = locale === "en";
  const [state, setState] = useState<RatingState>({ average: initialAverage, count: initialCount, userRating: null, signedIn: false });
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("rating")))
      .then((data: RatingState) => setState(data))
      .catch((error) => { if (error?.name !== "AbortError") setMessage(english ? "We cannot load your rating status right now." : "目前無法讀取你的評分狀態。"); });
    return () => controller.abort();
  }, [gameId, english]);

  async function saveRating(rating: number) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { setState((current) => ({ ...current, signedIn: false })); setMessage(english ? "Sign in to leave a rating." : "請先登入，再留下評價。"); }
    else if (!response.ok) setMessage(english ? "We could not save your rating. Try again later." : (data.error ?? "評價儲存失敗，請稍後再試。"));
    else { setState(data); setMessage(english ? "Your rating is updated. Homepage recommendations now use the new score." : "你的評價已更新。首頁推薦會採用新的評分。" ); }
    setBusy(false);
  }

  async function clearRating() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(english ? "We could not remove your rating." : (data.error ?? "無法移除評價。"));
    else { setState(data); setMessage(english ? "Your rating has been removed." : "已移除你的評價。" ); }
    setBusy(false);
  }

  const preview = hovered || state.userRating || 0;
  return <section className="rating-panel" aria-labelledby="rating-title">
    <div className="rating-score"><span>COMMUNITY RATING</span><strong>{state.count ? state.average.toFixed(1) : "—"}</strong><div aria-label={state.count ? (english ? `Average ${state.average.toFixed(1)} stars` : `平均 ${state.average.toFixed(1)} 顆星`) : (english ? "Not rated yet" : "尚無評價")}>★★★★★</div><small>{state.count ? (english ? `${state.count.toLocaleString("en-US")} reviews` : `${state.count.toLocaleString("zh-TW")} 則評價`) : (english ? "Be the first player to rate it" : "成為第一位評價的玩家")}</small></div>
    <div className="rating-action"><p id="rating-title">{english ? `How many stars does ${title} deserve?` : `你覺得《${title}》值得幾顆星？`}</p><div className="rating-stars" role="group" aria-label={english ? `Rate ${title}` : `評價 ${title}`} onMouseLeave={() => setHovered(0)}>{[1,2,3,4,5].map((value) => <button key={value} type="button" aria-label={english ? `${value} stars` : `${value} 顆星`} aria-pressed={state.userRating === value} className={value <= preview ? "active" : ""} disabled={busy} onMouseEnter={() => setHovered(value)} onFocus={() => setHovered(value)} onBlur={() => setHovered(0)} onClick={() => void saveRating(value)}>★</button>)}</div>
      <div className="rating-meta">{state.userRating ? <><span>{english ? `Your current rating is ${state.userRating} stars` : `你目前給了 ${state.userRating} 顆星`}</span><button type="button" disabled={busy} onClick={() => void clearRating()}>{english ? "Remove rating" : "移除評價"}</button></> : <span>{english ? "One vote per account. You can change it anytime." : "每個帳號只計算一票，可隨時修改。"}</span>}</div>
      {!state.signedIn && <a className="rating-login" href={`/login?next=/games/${encodeURIComponent(slug)}`}>{english ? "Sign in to rate" : "登入後評價"} →</a>}
      {message && <span className="rating-message" role="status">{message}</span>}
    </div>
  </section>;
}
