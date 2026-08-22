"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GameActions({ gameId, initialStatus, initialAllowDownload }: { gameId: string; initialStatus: string; initialAllowDownload: boolean }) {
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

  return <div className="game-manage-actions" aria-label="作品管理">
    <button disabled={Boolean(busy)} onClick={() => update({ status: status === "published" ? "hidden" : "published" }, "visibility")}>{busy === "visibility" ? "更新中…" : status === "published" ? "暫停公開" : "重新公開"}</button>
    <button disabled={Boolean(busy)} onClick={() => update({ allowDownload: !allowDownload }, "download")}>{busy === "download" ? "更新中…" : allowDownload ? "關閉下載" : "允許下載"}</button>
  </div>;
}
