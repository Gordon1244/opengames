"use client";
import { useState } from "react";
import type { Locale } from "../../lib/i18n";
export default function ReportActions({ locale, reportId, gameId }: { locale: Locale; reportId: string; gameId: string }) {
  const english = locale === "en";
  const [done, setDone] = useState(false);
  async function act(action: "hide" | "dismiss") {
    if (action === "hide") await fetch(`/api/admin/games/${gameId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "hidden" }) });
    const response = await fetch(`/api/admin/reports/${reportId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action === "hide" ? "resolved" : "dismissed" }) });
    if (response.ok) setDone(true);
  }
  if (done) return <span className="status-pill">{english ? "Handled" : "已處理"}</span>;
  return <div className="report-actions"><button onClick={() => act("hide")}>{english ? "Take down and resolve" : "下架並結案"}</button><button onClick={() => act("dismiss")}>{english ? "Dismiss report" : "駁回檢舉"}</button></div>;
}
