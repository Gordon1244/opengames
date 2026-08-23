"use client";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function finishSignIn(supabase: NonNullable<ReturnType<typeof createClient>>) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    location.href = data?.nextLevel === "aal2" && data.currentLevel !== "aal2"
      ? `/account/security?challenge=1&next=${encodeURIComponent(nextPath)}`
      : nextPath;
  }
  async function signInWithPasskey() {
    setBusy(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage("登入服務尚未設定。"); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPasskey();
    if (error) { setMessage(error.message); setBusy(false); return; }
    await finishSignIn(supabase);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password") ?? ""); const supabase = createClient();
    if (!supabase) { setMessage("登入服務尚未設定。"); setBusy(false); return; }
    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account/password` });
      setMessage(error ? error.message : "重設連結已寄出；若帳號存在，請到信箱繼續。");
      setBusy(false);
      return;
    }
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` } });
    if (result.error) setMessage(result.error.message); else if (mode === "register") setMessage("註冊成功，請到信箱完成 OpenGames 驗證。"); else await finishSignIn(supabase);
    setBusy(false);
  }
  return <div className="auth-card">
    <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登入</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>建立帳號</button></div>
    {mode === "login" && <button className="passkey-login" type="button" disabled={busy} onClick={signInWithPasskey}><span aria-hidden="true">◇</span> 使用密碼金鑰登入</button>}
    <div className="form-divider"><span>使用 Email</span></div>
    <form onSubmit={submit} className="stack-form"><label>Email<input required type="email" name="email" autoComplete="email" /></label>{mode !== "recover" && <label>密碼<input required minLength={8} type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}<button className="form-submit" disabled={busy}>{busy ? "處理中…" : mode === "login" ? "登入 OpenGames" : mode === "register" ? "免費建立帳號" : "寄送重設連結"}</button>{mode === "login" && <button className="text-button" type="button" onClick={() => { setMode("recover"); setMessage(""); }}>忘記密碼？</button>}{mode === "recover" && <button className="text-button" type="button" onClick={() => { setMode("login"); setMessage(""); }}>返回登入</button>}</form>
    {message && <p className="form-message" role="status">{message}</p>}
    <p className="auth-note">繼續即表示你同意服務條款與全年齡社群規範。</p>
  </div>;
}
