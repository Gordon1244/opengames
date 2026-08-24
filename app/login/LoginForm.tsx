"use client";
import { FormEvent, useState } from "react";
import PasswordRequirements from "../../components/PasswordRequirements";
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, passwordMeetsPolicy } from "../../lib/password-policy";
import { createClient } from "../../lib/supabase/client";
import type { Locale } from "../../lib/i18n";

export default function LoginForm({ nextPath, locale }: { nextPath: string; locale: Locale }) {
  const english = locale === "en";
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [message, setMessage] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  function chooseMode(nextMode: "login" | "register" | "recover") {
    setMode(nextMode);
    setMessage("");
    setPasswordValue("");
  }
  async function sendLoginNotification() {
    await fetch("/api/auth/login-notification", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
  }
  async function finishSignIn(supabase: NonNullable<ReturnType<typeof createClient>>) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      location.href = `/account/security?challenge=1&notify=1&next=${encodeURIComponent(nextPath)}`;
      return;
    }
    await sendLoginNotification();
    location.href = nextPath;
  }
  async function signInWithPasskey() {
    setBusy(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage(english ? "The sign-in service is not configured." : "登入服務尚未設定。"); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPasskey();
    if (error) { setMessage(error.message); setBusy(false); return; }
    await finishSignIn(supabase);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password") ?? ""); const supabase = createClient();
    if (!supabase) { setMessage(english ? "The sign-in service is not configured." : "登入服務尚未設定。"); setBusy(false); return; }
    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account/password` });
      setMessage(error ? error.message : (english ? "A reset link has been sent. If the account exists, check your inbox to continue." : "重設連結已寄出；若帳號存在，請到信箱繼續。"));
      setBusy(false);
      return;
    }
    if (mode === "register" && !passwordMeetsPolicy(password)) {
      setMessage(english ? "Use at least 8 characters with lowercase and uppercase letters and a number." : "密碼須至少 8 個字元，並包含大小寫英文字母與數字。");
      setBusy(false);
      return;
    }
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` } });
    if (result.error) setMessage(result.error.message); else if (mode === "register") setMessage(english ? "Account created. Check your inbox to verify your OpenGames account." : "註冊成功，請到信箱完成 OpenGames 驗證。"); else await finishSignIn(supabase);
    setBusy(false);
  }
  return <div className="auth-card">
    <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => chooseMode("login")}>{english ? "Sign in" : "登入"}</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => chooseMode("register")}>{english ? "Create account" : "建立帳號"}</button></div>
    {mode === "login" && <button className="passkey-login" type="button" disabled={busy} onClick={signInWithPasskey}><span aria-hidden="true">◇</span> {english ? "Sign in with a passkey" : "使用密碼金鑰登入"}</button>}
    <div className="form-divider"><span>{english ? "Use email" : "使用 Email"}</span></div>
    <form onSubmit={submit} className="stack-form"><label>Email<input required type="email" name="email" autoComplete="email" /></label>{mode !== "recover" && <label>{english ? "Password" : "密碼"}<input required minLength={mode === "register" ? PASSWORD_MIN_LENGTH : undefined} pattern={mode === "register" ? PASSWORD_PATTERN : undefined} title={mode === "register" ? (english ? "At least 8 characters with lowercase and uppercase letters and a number." : "至少 8 個字元，並包含大小寫英文字母與數字。") : undefined} type="password" name="password" value={passwordValue} onChange={(event) => setPasswordValue(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-describedby={mode === "register" ? "password-requirements" : undefined} /></label>}{mode === "register" && <PasswordRequirements password={passwordValue} locale={locale} />}<button className="form-submit" disabled={busy}>{busy ? (english ? "Working…" : "處理中…") : mode === "login" ? (english ? "Sign in to OpenGames" : "登入 OpenGames") : mode === "register" ? (english ? "Create a free account" : "免費建立帳號") : (english ? "Send reset link" : "寄送重設連結")}</button>{mode === "login" && <button className="text-button" type="button" onClick={() => chooseMode("recover")}>{english ? "Forgot password?" : "忘記密碼？"}</button>}{mode === "recover" && <button className="text-button" type="button" onClick={() => chooseMode("login")}>{english ? "Back to sign in" : "返回登入"}</button>}</form>
    {message && <p className="form-message" role="status">{message}</p>}
    <p className="auth-note">{english ? "By continuing, you agree to the Terms and our all-ages Community Guidelines." : "繼續即表示你同意服務條款與全年齡社群規範。"}</p>
  </div>;
}
