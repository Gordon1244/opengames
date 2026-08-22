"use client";
import { FormEvent, useState } from "react";

export default function UploadForm() {
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus("正在驗證 ZIP 路徑、檔案類型與大小…");
    const response = await fetch("/api/uploads", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { error?: string; game?: { slug: string }; scan?: { fileCount: number } };
    if (!response.ok) { setStatus(result.error ?? "上傳失敗。"); setBusy(false); return; }
    setStatus(`安全檢查完成，共 ${result.scan?.fileCount ?? 0} 個檔案。正在前往作品頁…`);
    location.href = `/games/${result.game!.slug}`;
  }
  return <form className="upload-form" onSubmit={submit}>
    <section className="form-section"><span className="form-step">01</span><div><h2>作品資料</h2><p>讓玩家第一眼理解這款遊戲。</p><div className="field-grid"><label>繁體中文名稱<input required name="titleZh" maxLength={80} placeholder="例如：月面花園" /></label><label>英文名稱<input required name="titleEn" maxLength={80} placeholder="Moon Garden" /></label><label className="field-wide">繁中介紹<textarea required name="descriptionZh" maxLength={1600} rows={4} /></label><label className="field-wide">英文介紹<textarea required name="descriptionEn" maxLength={1600} rows={4} /></label><label>類別<select name="category"><option>動作</option><option>冒險</option><option>益智</option><option>策略</option><option>休閒</option><option>其他</option></select></label><label>標籤<input name="tags" placeholder="單人, 像素, 短篇" /></label></div></div></section>
    <section className="form-section"><span className="form-step">02</span><div><h2>HTML5 套件</h2><p>ZIP 根目錄必須包含 index.html。最多 50 MiB、2,000 個檔案。</p><label className="drop-zone"><strong>選擇你的 .zip 套件</strong><span>純前端 HTML / JavaScript / WebAssembly</span><input required type="file" name="package" accept=".zip,application/zip" /></label><div className="field-grid compact"><label>版本<input required name="version" defaultValue="1.0.0" /></label><label>創作者顯示名稱<input required name="creatorName" /></label></div></div></section>
    <section className="form-section"><span className="form-step">03</span><div><h2>權利與發布</h2><p>授權、原始碼與下載權限分開設定。</p><div className="field-grid"><label>作品授權<select name="license"><option>All rights reserved</option><option>MIT</option><option>GPL-3.0</option><option>Apache-2.0</option><option>CC BY 4.0</option><option>CC BY-NC 4.0</option></select></label><label>原始碼網址<input name="sourceUrl" type="url" inputMode="url" placeholder="https://github.com/..." /></label><label className="check-label field-wide" aria-label="允許玩家下載原始 ZIP"><input type="checkbox" name="allowDownload" /><span><strong>允許玩家下載原始 ZIP</strong><small>可隨時在控制台關閉。</small></span></label><label className="check-label field-wide" aria-label="確認擁有發布權利且符合全年齡規範"><input required type="checkbox" name="rightsConfirmed" value="yes" /><span><strong>我擁有發布此作品的權利，且內容符合全年齡規範</strong></span></label></div></div></section>
    <div className="publish-bar"><div><strong>通過自動安全檢查後立即發布</strong><span>不會假裝能偵測所有惡意邏輯；遊戲仍會在受限沙箱中執行。</span></div><button disabled={busy} className="form-submit">{busy ? "檢查中…" : "檢查並發布 ↗"}</button></div>
    {status && <p className="upload-status" role="status">{status}</p>}
  </form>;
}
