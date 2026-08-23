"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "../../lib/i18n";

export default function GameActions({ locale, gameId, initialStatus, initialAllowDownload }: { locale: Locale; gameId: string; initialStatus: string; initialAllowDownload: boolean }) {
  const english = locale === "en";
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [allowDownload, setAllowDownload] = useState(initialAllowDownload);
  const [busy, setBusy] = useState("");

  async function update(payload: { status?: "published" | "hidden"; allowDownload?: boolean }, action: string) {
    setBusy(action);
    const response = await fetch(`/api/creator/games/${gameId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) {
      const result = await response.json() as { game: { status: string; allowDownload: boolean } };
      setStatus(result.game.status);
      setAllowDownload(result.game.allowDownload);
      router.refresh();
    }
    setBusy("");
  }

  return <div className="game-manage-actions" aria-label={english ? "Game management" : "作品管理"}>
    <button disabled={Boolean(busy)} onClick={() => update({ status: status === "published" ? "hidden" : "published" }, "visibility")}>{busy === "visibility" ? (english ? "Updating…" : "更新中…") : status === "published" ? (english ? "Unpublish" : "暫停公開") : (english ? "Publish again" : "重新公開")}</button>
    <button disabled={Boolean(busy)} onClick={() => update({ allowDownload: !allowDownload }, "download")}>{busy === "download" ? (english ? "Updating…" : "更新中…") : allowDownload ? (english ? "Disable downloads" : "關閉下載") : (english ? "Allow downloads" : "允許下載")}</button>
  </div>;
}
