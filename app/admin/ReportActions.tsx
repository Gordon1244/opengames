"use client";
import { useState } from "react";
export default function ReportActions({ reportId, gameId }: { reportId: string; gameId: string }) {
  const [done, setDone] = useState(false);
  async function act(action: "hide" | "dismiss") {
    if (action === "hide") await fetch(`/api/admin/games/${gameId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "hidden" }) });
    const response = await fetch(`/api/admin/reports/${reportId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action === "hide" ? "resolved" : "dismissed" }) });
    if (response.ok) setDone(true);
  }
  if (done) return <span className="status-pill">已處理</span>;
  return <div className="report-actions"><button onClick={() => act("hide")}>下架並結案</button><button onClick={() => act("dismiss")}>駁回檢舉</button></div>;
}
