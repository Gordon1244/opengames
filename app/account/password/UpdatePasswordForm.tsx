"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) { setMessage("兩次輸入的密碼不同。"); setBusy(false); return; }
    const supabase = createClient();
    const result = supabase ? await supabase.auth.updateUser({ password }) : { error: new Error("登入服務尚未設定。") };
    setMessage(result.error ? result.error.message : "密碼已更新，即將返回控制台。");
    setBusy(false);
    if (!result.error) setTimeout(() => { location.href = "/dashboard"; }, 900);
  }
  return <form className="stack-form auth-card" onSubmit={submit}><h2>設定新密碼</h2><label>新密碼<input required minLength={8} type="password" name="password" autoComplete="new-password" /></label><label>再次輸入<input required minLength={8} type="password" name="confirm" autoComplete="new-password" /></label><button className="form-submit" disabled={busy}>{busy ? "更新中…" : "更新密碼"}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
