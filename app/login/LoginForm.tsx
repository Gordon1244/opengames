"use client";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password")); const supabase = createClient();
    if (!supabase) { setMessage("登入服務尚未設定。"); setBusy(false); return; }
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (result.error) setMessage(result.error.message); else if (mode === "register") setMessage("註冊成功，請到信箱完成驗證。"); else location.href = "/dashboard";
    setBusy(false);
  }
  async function oauth(provider: "google" | "github") {
    const supabase = createClient(); if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback` } });
  }
  return <div className="auth-card">
    <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登入</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>建立帳號</button></div>
    <div className="oauth-row"><button onClick={() => oauth("google")}>使用 Google</button><button onClick={() => oauth("github")}>使用 GitHub</button></div>
    <div className="form-divider"><span>或使用 Email</span></div>
    <form onSubmit={submit} className="stack-form"><label>Email<input required type="email" name="email" autoComplete="email" /></label><label>密碼<input required minLength={8} type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label><button className="form-submit" disabled={busy}>{busy ? "處理中…" : mode === "login" ? "登入 OpenGames" : "免費建立帳號"}</button></form>
    {message && <p className="form-message" role="status">{message}</p>}
    <p className="auth-note">繼續即表示你同意服務條款與全年齡社群規範。</p>
  </div>;
}
