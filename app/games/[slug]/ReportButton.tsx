"use client";
import { FormEvent, useState } from "react";
import type { Locale } from "../../../lib/i18n";
export default function ReportButton({ gameId, locale }: { gameId: string; locale: Locale }) {
  const english = locale === "en";
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
    setState(response.ok ? (english ? "Report sent. Thank you for helping protect the community." : "已送出，謝謝你協助維護社群。") : (english ? "We cannot send the report right now. Try again later." : "暫時無法送出，請稍後再試。"));
    setBusy(false);
    if (response.ok) setOpen(false);
  }
  return <div className="report-control">
    {!open && <button type="button" onClick={() => setOpen(true)}>{english ? "Report this game" : "檢舉此作品"}</button>}
    {open && <form className="report-form" onSubmit={report}>
      <label>{english ? "Issue type" : "問題類型"}<select name="reason" required defaultValue=""><option value="" disabled>{english ? "Select one" : "請選擇"}</option><option value="疑似侵權">{english ? "Possible copyright infringement" : "疑似侵權"}</option><option value="不適齡內容">{english ? "Age-inappropriate content" : "不適齡內容"}</option><option value="惡意或可疑行為">{english ? "Malicious or suspicious behavior" : "惡意或可疑行為"}</option><option value="冒用或誤導資訊">{english ? "Impersonation or misleading information" : "冒用或誤導資訊"}</option><option value="其他">{english ? "Other" : "其他"}</option></select></label>
      <label>{english ? "Additional details" : "補充說明"}<textarea name="details" rows={3} maxLength={1000} placeholder={english ? "Share enough information to help us review it" : "請提供足以協助審核的資訊"} /></label>
      <div><button disabled={busy}>{busy ? (english ? "Sending…" : "送出中…") : (english ? "Send report" : "送出檢舉")}</button><button className="secondary-action" type="button" onClick={() => setOpen(false)}>{english ? "Cancel" : "取消"}</button></div>
    </form>}
    {state && <span role="status">{state}</span>}
  </div>;
}
