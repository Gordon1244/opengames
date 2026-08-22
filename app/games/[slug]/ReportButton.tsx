"use client";
import { FormEvent, useState } from "react";
export default function ReportButton({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, reason: form.get("reason"), details: form.get("details") }),
    });
    setState(response.ok ? "已送出，謝謝你協助維護社群。" : "暫時無法送出，請稍後再試。");
    setBusy(false);
    if (response.ok) setOpen(false);
  }
  return <div className="report-control">
    {!open && <button type="button" onClick={() => setOpen(true)}>檢舉此作品</button>}
    {open && <form className="report-form" onSubmit={report}>
      <label>問題類型<select name="reason" required defaultValue=""><option value="" disabled>請選擇</option><option>疑似侵權</option><option>不適齡內容</option><option>惡意或可疑行為</option><option>冒用或誤導資訊</option><option>其他</option></select></label>
      <label>補充說明<textarea name="details" rows={3} maxLength={1000} placeholder="請提供足以協助審核的資訊" /></label>
      <div><button disabled={busy}>{busy ? "送出中…" : "送出檢舉"}</button><button className="secondary-action" type="button" onClick={() => setOpen(false)}>取消</button></div>
    </form>}
    {state && <span role="status">{state}</span>}
  </div>;
}
