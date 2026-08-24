"use client";

import { FormEvent, useState } from "react";
import type { CreatorProfile } from "../../../lib/creator-profile";
import type { Locale } from "../../../lib/i18n";

export default function ProfileForm({ locale, email, initial }: { locale: Locale; email: string; initial: CreatorProfile }) {
  const english = locale === "en";
  const [profile, setProfile] = useState(initial);
  const [skills, setSkills] = useState(initial.skills.join(", "));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/account/profile", {
      method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, skills: skills.split(",") }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; profile?: CreatorProfile };
    if (!response.ok) setMessage(result.error || (english ? "Could not save your profile." : "無法儲存個人檔案。"));
    else {
      if (result.profile) { setProfile((current) => ({ ...current, ...result.profile })); setSkills(result.profile.skills.join(", ")); }
      setMessage(english ? "Creator profile saved." : "創作者個人檔案已儲存。");
    }
    setBusy(false);
  }

  const publicUrl = `/creators/${profile.handle}`;
  return <section className="profile-editor">
    <header><div className="profile-avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toUpperCase() || "O"}</div><div><p>PUBLIC CREATOR IDENTITY</p><h2>{english ? "How players see you" : "玩家看到的創作者身分"}</h2><span>{english ? "Your email stays private." : "你的 Email 永遠不會顯示在公開頁面。"}</span></div>{profile.isPublic && <a href={publicUrl}>{english ? "View public profile ↗" : "查看公開頁面 ↗"}</a>}</header>
    <form onSubmit={save}>
      <div className="profile-field-grid">
        <label>{english ? "Display name" : "顯示名稱"}<input required minLength={2} maxLength={60} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /><small>{english ? "Shown beside your games." : "會顯示在你的遊戲與創作者頁面。"}</small></label>
        <label>{english ? "Public handle" : "公開代號"}<div className="handle-input"><span>@</span><input required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]" value={profile.handle} onChange={(event) => setProfile({ ...profile, handle: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} /></div><small>{english ? "Changing it also changes your public profile URL." : "變更後，公開個人檔案網址也會改變。"}</small></label>
        <label className="field-wide">{english ? "Creator identity / title" : "創作者身分／職稱"}<input maxLength={80} value={profile.headline} onChange={(event) => setProfile({ ...profile, headline: event.target.value })} placeholder={english ? "Indie game developer · Pixel artist" : "獨立遊戲開發者・像素美術"} /></label>
        <label className="field-wide">{english ? "Bio" : "個人簡介"}<textarea rows={6} maxLength={500} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder={english ? "Tell players what you make and care about." : "介紹你的創作方向、擅長領域與想做的遊戲。"} /><small>{profile.bio.length}/500</small></label>
        <label>{english ? "Location" : "地區"}<input maxLength={80} value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} placeholder={english ? "Tainan, Taiwan" : "臺灣・臺南"} /></label>
        <label>{english ? "Personal website" : "個人網站"}<input type="url" maxLength={300} value={profile.websiteUrl} onChange={(event) => setProfile({ ...profile, websiteUrl: event.target.value })} placeholder="https://" /></label>
        <label className="field-wide">{english ? "Skills / specialties" : "技能／專長標籤"}<input maxLength={220} value={skills} onChange={(event) => setSkills(event.target.value)} placeholder={english ? "Unity, C#, pixel art, game design" : "Unity, C#, 像素美術, 遊戲設計"} /><small>{english ? "Separate up to eight items with commas." : "以逗號分隔，最多 8 項。"}</small></label>
      </div>
      <section className="profile-privacy-setting"><div><strong>{english ? "Public creator page" : "公開創作者頁面"}</strong><span>{english ? "When off, your bio and profile page are hidden. Your display name remains on published games for attribution." : "關閉後會隱藏簡介與個人頁；已發布遊戲仍會保留顯示名稱，以標示作者。"}</span></div><label className="switch" aria-label={english ? "Show public creator page" : "顯示公開創作者頁面"}><input aria-label={english ? "Show public creator page" : "顯示公開創作者頁面"} type="checkbox" checked={profile.isPublic} onChange={(event) => setProfile({ ...profile, isPublic: event.target.checked })} /><span /></label></section>
      <footer><div><span>{english ? "Account email (private)" : "帳號 Email（不公開）"}</span><strong>{email}</strong></div><button disabled={busy}>{busy ? (english ? "Saving…" : "儲存中…") : (english ? "Save creator profile" : "儲存創作者資料")}</button></footer>
      {message && <p className="profile-message" role="status">{message}</p>}
    </form>
  </section>;
}
