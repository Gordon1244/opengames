"use client";
import { useState } from "react";
export default function ReportButton({ gameId }: { gameId: string }) {
  const [state, setState] = useState("");
  async function report() {
    const reason = window.prompt("請簡短說明問題（侵權、成人、惡意程式或其他）："); if (!reason) return;
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, reason }) });
    setState(response.ok ? "已送出，謝謝你協助維護社群。" : "暫時無法送出，請稍後再試。");
  }
  return <div className="report-control"><button onClick={report}>檢舉此作品</button>{state && <span role="status">{state}</span>}</div>;
}
