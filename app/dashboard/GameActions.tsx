"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "../../lib/i18n";

const languageOptions = [
  ["zh-Hant", "繁體中文"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"],
  ["zh-Hans", "简体中文"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"],
] as const;

type GameSettings = {
  status: string; allowDownload: boolean; cloudSavesEnabled: boolean; multiplayerEnabled: boolean;
  multiplayerMaxPlayers: number; multiplayerModes: string[]; multiplayerRoomPolicy: "player" | "creator" | "global" | "hybrid"; multiplayerManagedUnlimited: boolean; supportedLocales: string[]; defaultLocale: string;
};

export default function GameActions({ locale, gameId, initialStatus, initialAllowDownload, initialCloudSavesEnabled, initialMultiplayerEnabled, initialMultiplayerMaxPlayers, initialMultiplayerModes, initialMultiplayerRoomPolicy = "player", initialMultiplayerManagedUnlimited = false, initialSupportedLocales, initialDefaultLocale }: {
  locale: Locale; gameId: string; initialStatus: string; initialAllowDownload: boolean; initialCloudSavesEnabled: boolean;
  initialMultiplayerEnabled: boolean; initialMultiplayerMaxPlayers: number; initialMultiplayerModes: string[]; initialMultiplayerRoomPolicy?: "player" | "creator" | "global" | "hybrid"; initialMultiplayerManagedUnlimited?: boolean; initialSupportedLocales: string[]; initialDefaultLocale: string;
}) {
  const english = locale === "en";
  const router = useRouter();
  const initial = { status: initialStatus, allowDownload: initialAllowDownload, cloudSavesEnabled: initialCloudSavesEnabled, multiplayerEnabled: initialMultiplayerEnabled, multiplayerMaxPlayers: initialMultiplayerMaxPlayers, multiplayerModes: initialMultiplayerModes.length ? initialMultiplayerModes : ["shared"], multiplayerRoomPolicy: initialMultiplayerRoomPolicy, multiplayerManagedUnlimited: initialMultiplayerManagedUnlimited, supportedLocales: initialSupportedLocales.length ? initialSupportedLocales : ["zh-Hant"], defaultLocale: initialDefaultLocale };
  const [settings, setSettings] = useState<GameSettings>(initial);
  const [draft, setDraft] = useState<GameSettings>(initial);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function update(payload: Partial<GameSettings>, action: string) {
    setBusy(action); setMessage("");
    const response = await fetch(`/api/creator/games/${gameId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({})) as { game?: GameSettings; error?: string };
    if (response.ok && result.game) {
      setSettings(result.game); setDraft(result.game); setMessage(english ? "Settings saved." : "設定已儲存。"); router.refresh();
    } else setMessage(result.error || (english ? "Could not save settings." : "無法儲存設定。"));
    setBusy("");
  }

  async function togglePanel() {
    const next = !expanded; setExpanded(next);
    if (!next || loaded) return;
    setBusy("load");
    const response = await fetch(`/api/creator/games/${gameId}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as { game?: GameSettings; error?: string };
    if (response.ok && result.game) { setSettings(result.game); setDraft(result.game); setLoaded(true); }
    else setMessage(result.error || (english ? "Could not load settings." : "無法載入設定。"));
    setBusy("");
  }

  function toggleLanguage(code: string) {
    setDraft((current) => {
      const selected = current.supportedLocales.includes(code);
      if (selected && current.supportedLocales.length === 1) return current;
      const supportedLocales = selected ? current.supportedLocales.filter((item) => item !== code) : [...current.supportedLocales, code];
      return { ...current, supportedLocales, defaultLocale: supportedLocales.includes(current.defaultLocale) ? current.defaultLocale : supportedLocales[0] };
    });
  }

  function toggleMode(mode: string) {
    setDraft((current) => {
      const selected = current.multiplayerModes.includes(mode);
      if (selected && current.multiplayerModes.length === 1) return current;
      return { ...current, multiplayerModes: selected ? current.multiplayerModes.filter((item) => item !== mode) : [...current.multiplayerModes, mode] };
    });
  }

  return <div className="game-manage">
    <div className="game-manage-actions" aria-label={english ? "Game management" : "作品管理"}>
      <button disabled={Boolean(busy)} onClick={() => update({ status: settings.status === "published" ? "hidden" : "published" }, "visibility")}>{busy === "visibility" ? (english ? "Updating…" : "更新中…") : settings.status === "published" ? (english ? "Unpublish" : "暫停公開") : (english ? "Publish again" : "重新公開")}</button>
      <button disabled={Boolean(busy)} onClick={() => update({ allowDownload: !settings.allowDownload }, "download")}>{busy === "download" ? (english ? "Updating…" : "更新中…") : settings.allowDownload ? (english ? "Disable downloads" : "關閉下載") : (english ? "Allow downloads" : "允許下載")}</button>
      <button className="capability-button" aria-expanded={expanded} onClick={togglePanel}>{busy === "load" ? (english ? "Loading…" : "載入中…") : (english ? "Game services" : "遊戲服務")} {expanded ? "↑" : "↓"}</button>
    </div>
    {expanded && <section className="game-capability-panel">
      <header><strong>{english ? "OpenGames account services" : "OpenGames 帳號服務"}</strong><span>{english ? "The game receives capabilities, never account credentials." : "遊戲只會取得功能，不會取得帳號憑證。"}</span></header>
      <label className="capability-toggle"><input aria-label={english ? "Enable cloud saves" : "啟用帳號雲端存檔"} type="checkbox" checked={draft.cloudSavesEnabled} onChange={(event) => setDraft({ ...draft, cloudSavesEnabled: event.target.checked })} /><span><strong>{english ? "Cloud saves" : "帳號雲端存檔"}</strong><small>{english ? "Up to 10 slots, 64 KiB each, per player." : "每位玩家最多 10 個欄位，每格 64 KiB。"}</small></span></label>
      <label className="capability-toggle"><input aria-label={english ? "Enable multiplayer" : "啟用多人連線"} type="checkbox" checked={draft.multiplayerEnabled} onChange={(event) => setDraft({ ...draft, multiplayerEnabled: event.target.checked })} /><span><strong>{english ? "Invite-code multiplayer" : "邀請碼多人連線"}</strong><small>{english ? "Authenticated rooms using OpenGames accounts; no voice chat." : "使用 OpenGames 帳號加入房間；不包含語音。"}</small></span></label>
      {draft.multiplayerEnabled && <label className="player-limit">{english ? "Maximum players" : "房間人數上限"}<select value={draft.multiplayerMaxPlayers} onChange={(event) => setDraft({ ...draft, multiplayerMaxPlayers: Number(event.target.value) })}>{[2,3,4,5,6,7,8].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>}
      {draft.multiplayerEnabled && <label className="player-limit">{english ? "Who controls rooms" : "房間管理方式"}<select value={draft.multiplayerRoomPolicy} onChange={(event) => setDraft({ ...draft, multiplayerRoomPolicy: event.target.value as GameSettings["multiplayerRoomPolicy"] })}><option value="player">{english ? "Players create rooms" : "玩家自行開房"}</option><option value="creator">{english ? "Creator rooms only" : "僅限創作者房間"}</option><option value="global">{english ? "One game-wide world" : "全遊戲共用世界"}</option><option value="hybrid">{english ? "Player and creator rooms" : "玩家房＋創作者房"}</option></select></label>}
      {draft.multiplayerEnabled && ["creator", "global", "hybrid"].includes(draft.multiplayerRoomPolicy) && <label className="capability-toggle"><input aria-label={english ? "Remove the OpenGames player cap for managed rooms" : "創作者與全遊戲房不設平台人數上限"} type="checkbox" checked={draft.multiplayerManagedUnlimited} onChange={(event) => setDraft({ ...draft, multiplayerManagedUnlimited: event.target.checked })} /><span><strong>{english ? "No OpenGames player cap for managed rooms" : "創作者／全遊戲房不設平台人數上限"}</strong><small>{english ? "Provider connection quotas still apply; this is not infinite capacity." : "仍受供應商同時連線配額限制，並非無限容量。"}</small></span></label>}
      {draft.multiplayerEnabled && <fieldset className="language-options room-mode-options"><legend>{english ? "Room modes players may create" : "玩家可建立的房間模式"}</legend>{[
        ["shared", english ? "Everyone together" : "全體共享"], ["co-op", english ? "Co-op" : "合作"], ["versus", english ? "Versus" : "對戰"], ["teams", english ? "Teams" : "分組"],
      ].map(([mode, label]) => <label key={mode}><input type="checkbox" checked={draft.multiplayerModes.includes(mode)} onChange={() => toggleMode(mode)} /> {label}<small>{mode}</small></label>)}</fieldset>}
      <fieldset className="language-options"><legend>{english ? "Languages included in this game" : "遊戲內已提供的語言"}</legend>{languageOptions.map(([code, label]) => <label key={code}><input type="checkbox" checked={draft.supportedLocales.includes(code)} onChange={() => toggleLanguage(code)} /> {label}<small>{code}</small></label>)}</fieldset>
      <label className="player-limit">{english ? "Fallback language" : "預設語言"}<select value={draft.defaultLocale} onChange={(event) => setDraft({ ...draft, defaultLocale: event.target.value })}>{languageOptions.filter(([code]) => draft.supportedLocales.includes(code)).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <footer><button disabled={Boolean(busy)} onClick={() => update({ cloudSavesEnabled: draft.cloudSavesEnabled, multiplayerEnabled: draft.multiplayerEnabled, multiplayerMaxPlayers: draft.multiplayerMaxPlayers, multiplayerModes: draft.multiplayerModes, multiplayerRoomPolicy: draft.multiplayerRoomPolicy, multiplayerManagedUnlimited: draft.multiplayerManagedUnlimited, supportedLocales: draft.supportedLocales, defaultLocale: draft.defaultLocale }, "services")}>{busy === "services" ? (english ? "Saving…" : "儲存中…") : (english ? "Save game services" : "儲存遊戲服務")}</button>{message && <span role="status">{message}</span>}</footer>
    </section>}
  </div>;
}
