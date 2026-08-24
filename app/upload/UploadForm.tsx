"use client";

import { FormEvent, useState } from "react";
import type { Locale } from "../../lib/i18n";

type Runtime = "unity-web" | "dotnet-webassembly" | "webassembly" | "web";

function runtimeName(runtime: Runtime | undefined, english: boolean) {
  if (runtime === "unity-web") return "Unity Web / C#";
  if (runtime === "dotnet-webassembly") return ".NET WebAssembly / C#";
  if (runtime === "webassembly") return english ? "WebAssembly build" : "WebAssembly 網頁建置";
  return english ? "standard web build" : "標準網頁建置";
}

export default function UploadForm({ locale }: { locale: Locale }) {
  const english = locale === "en";
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(english ? "Checking the web build, runtime, file types, and size…" : "正在檢查網頁建置、執行環境、檔案類型與大小…");
    const response = await fetch("/api/uploads", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { error?: string; game?: { slug: string }; scan?: { fileCount: number; runtime: Runtime; warnings: string[] } };
    if (!response.ok) {
      setStatus(english ? (result.error ?? "Upload failed. Check the package and try again.") : (result.error ?? "上傳失敗。"));
      setBusy(false);
      return;
    }
    const detected = runtimeName(result.scan?.runtime, english);
    setStatus(english
      ? `${detected} verified with ${result.scan?.fileCount ?? 0} files. Opening the game page…`
      : `已辨識為 ${detected}，共檢查 ${result.scan?.fileCount ?? 0} 個檔案。正在前往作品頁…`);
    window.setTimeout(() => { location.href = `/games/${result.game!.slug}`; }, 450);
  }

  return <form className="upload-form" onSubmit={submit}>
    <section className="form-section"><span className="form-step">01</span><div><h2>{english ? "Game details" : "作品資料"}</h2><p>{english ? "Help players understand your game at a glance." : "讓玩家第一眼理解這款遊戲。"}</p><div className="field-grid"><label>{english ? "Traditional Chinese title" : "繁體中文名稱"}<input required name="titleZh" maxLength={80} placeholder="例如：月面花園" /></label><label>{english ? "English title" : "英文名稱"}<input required name="titleEn" maxLength={80} placeholder="Moon Garden" /></label><label className="field-wide">{english ? "Traditional Chinese description" : "繁中介紹"}<textarea required name="descriptionZh" maxLength={1600} rows={4} /></label><label className="field-wide">{english ? "English description" : "英文介紹"}<textarea required name="descriptionEn" maxLength={1600} rows={4} /></label><label>{english ? "Category" : "類別"}<select name="category"><option value="動作">{english ? "Action" : "動作"}</option><option value="冒險">{english ? "Adventure" : "冒險"}</option><option value="益智">{english ? "Puzzle" : "益智"}</option><option value="策略">{english ? "Strategy" : "策略"}</option><option value="休閒">{english ? "Casual" : "休閒"}</option><option value="其他">{english ? "Other" : "其他"}</option></select></label><label>{english ? "Tags" : "標籤"}<input name="tags" placeholder={english ? "single-player, pixel, short" : "單人, 像素, 短篇"} /></label></div></div></section>

    <section className="form-section"><span className="form-step">02</span><div>
      <h2>{english ? "Web build package" : "網頁建置套件"}</h2>
      <p>{english ? "Upload the exported web build, not source code or a desktop/mobile installer. The ZIP root must contain index.html." : "請上傳已匯出的網頁版本，不是原始碼或桌面／手機安裝檔；ZIP 根目錄必須包含 index.html。"}</p>
      <div className="compatibility-guide" aria-label={english ? "Supported web build formats" : "支援的網頁建置格式"}>
        <article><span>WASM</span><strong>C / C++ / Rust</strong><p>{english ? "Export with Emscripten or another WebAssembly toolchain." : "使用 Emscripten 或其他 WebAssembly 工具鏈匯出。"}</p></article>
        <article><span>C#</span><strong>Unity Web</strong><p>{english ? "Upload the complete Web build. A single-threaded build is recommended." : "上傳完整 Web 建置；建議使用單執行緒版本。"}</p></article>
        <article><span>.NET</span><strong>C# WebAssembly</strong><p>{english ? "Publish a browser build with index.html and the _framework folder." : "發布包含 index.html 與 _framework 目錄的瀏覽器版本。"}</p></article>
        <article><span>WEB</span><strong>JavaScript / Godot</strong><p>{english ? "Use a standard web export. Godot 4 C# does not currently export to Web." : "使用標準 Web 匯出；Godot 4 的 C# 專案目前不能匯出 Web。"}</p></article>
      </div>
      <div className="format-warning"><strong>{english ? "EXE and APK are not web builds" : "EXE 與 APK 不是網頁建置"}</strong><span>{english ? "They cannot run directly in a browser. Export the same project to Web/WebGL/WebAssembly first." : "瀏覽器不能直接執行；請先從同一份專案匯出 Web／WebGL／WebAssembly 版本。"}</span><div><a href="/convert">{english ? "Check a project or binary locally →" : "先在本機檢查專案或成品 →"}</a><a href="/guides">{english ? "Read the complete export guide →" : "查看完整匯出與封裝教學 →"}</a></div></div>
      <label className="drop-zone"><strong>{english ? "Choose your web build .zip" : "選擇網頁建置 .zip"}</strong><span>{english ? "HTML / JavaScript / WebAssembly / Unity Web / .NET WebAssembly" : "HTML / JavaScript / WebAssembly / Unity Web / .NET WebAssembly"}</span><small>{english ? "Maximum 50 MiB compressed, 250 MiB extracted, and 2,000 files" : "ZIP 最多 50 MiB、解壓後 250 MiB、2,000 個檔案"}</small><input required type="file" name="package" accept=".zip,application/zip" /></label>
      <div className="field-grid compact"><label>{english ? "Version" : "版本"}<input required name="version" defaultValue="1.0.0" /></label><div className="profile-source-note"><strong>{english ? "Creator identity comes from your profile" : "創作者身分會使用你的個人檔案"}</strong><span>{english ? "Update your name, title, and bio once instead of re-entering them for every game." : "名稱、身分與簡介只需設定一次，不必每款遊戲重填。"}</span><a href="/account/profile">{english ? "Edit creator profile →" : "編輯創作者資料 →"}</a></div></div>
    </div></section>

    <section className="form-section"><span className="form-step">03</span><div><h2>{english ? "Rights and publishing" : "權利與發布"}</h2><p>{english ? "Set the license, source code, and download permissions separately." : "授權、原始碼與下載權限分開設定。"}</p><div className="field-grid"><label>{english ? "Game license" : "作品授權"}<select name="license"><option>All rights reserved</option><option>MIT</option><option>GPL-3.0</option><option>Apache-2.0</option><option>CC BY 4.0</option><option>CC BY-NC 4.0</option></select></label><label>{english ? "Source code URL" : "原始碼網址"}<input name="sourceUrl" type="url" inputMode="url" placeholder="https://github.com/..." /></label><label className="check-label field-wide" aria-label={english ? "Allow players to download the original ZIP" : "允許玩家下載原始 ZIP"}><input type="checkbox" name="allowDownload" /><span><strong>{english ? "Allow players to download the original ZIP" : "允許玩家下載原始 ZIP"}</strong><small>{english ? "You can turn this off anytime in the dashboard." : "可隨時在控制台關閉。"}</small></span></label><label className="check-label field-wide" aria-label={english ? "Confirm publishing rights and all-ages compliance" : "確認擁有發布權利且符合全年齡規範"}><input required type="checkbox" name="rightsConfirmed" value="yes" /><span><strong>{english ? "I have the right to publish this game, and its content follows the all-ages guidelines" : "我擁有發布此作品的權利，且內容符合全年齡規範"}</strong></span></label></div></div></section>
    <div className="publish-bar"><div><strong>{english ? "Publish immediately after compatibility and safety checks" : "通過相容性與安全檢查後立即發布"}</strong><span>{english ? "The platform identifies the web runtime and keeps every game inside a restricted browser sandbox." : "平台會辨識網頁執行環境，並讓每款遊戲在受限瀏覽器沙箱中執行。"}</span></div><button disabled={busy} className="form-submit">{busy ? (english ? "Checking…" : "檢查中…") : (english ? "Check and publish ↗" : "檢查並發布 ↗")}</button></div>
    {status && <p className="upload-status" role="status">{status}</p>}
  </form>;
}
