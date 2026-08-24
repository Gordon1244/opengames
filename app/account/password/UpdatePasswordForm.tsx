"use client";

import { FormEvent, useState } from "react";
import PasswordRequirements from "../../../components/PasswordRequirements";
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, passwordMeetsPolicy } from "../../../lib/password-policy";
import { createClient } from "../../../lib/supabase/client";
import type { Locale } from "../../../lib/i18n";

export default function UpdatePasswordForm({ locale }: { locale: Locale }) {
  const english = locale === "en";
  const [message, setMessage] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendReauthenticationCode() {
    const supabase = createClient();
    if (!supabase) { setMessage(english ? "The sign-in service is not configured." : "登入服務尚未設定。"); return false; }
    const { error } = await supabase.auth.reauthenticate();
    if (error) { setMessage(error.message); return false; }
    setNeedsNonce(true);
    setMessage(english ? "A six-digit verification code was sent to your account email." : "六位數驗證碼已寄到帳號 Email。");
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) { setMessage(english ? "The passwords do not match." : "兩次輸入的密碼不同。"); setBusy(false); return; }
    if (!passwordMeetsPolicy(password)) { setMessage(english ? "Use at least 8 characters with lowercase and uppercase letters and a number." : "密碼須至少 8 個字元，並包含大小寫英文字母與數字。"); setBusy(false); return; }
    if (needsNonce && !/^\d{6}$/.test(nonce)) { setMessage(english ? "Enter the six-digit verification code." : "請輸入六位數驗證碼。"); setBusy(false); return; }
    const supabase = createClient();
    const result = supabase ? await supabase.auth.updateUser({ password, ...(nonce ? { nonce } : {}) }) : { error: new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。") };
    if (result.error?.code === "reauthentication_needed" || result.error?.code === "reauth_nonce_missing") {
      await sendReauthenticationCode();
      setBusy(false);
      return;
    }
    if (result.error?.code === "reauthentication_not_valid" || result.error?.code === "otp_expired") {
      setNeedsNonce(true);
      setMessage(english ? "That verification code is invalid or expired. Request a new code and try again." : "驗證碼錯誤或已過期，請重新寄送後再試一次。");
      setBusy(false);
      return;
    }
    setMessage(result.error ? result.error.message : (english ? "Password updated. Returning to the dashboard." : "密碼已更新，即將返回控制台。"));
    setBusy(false);
    if (!result.error) setTimeout(() => { location.href = "/dashboard"; }, 900);
  }
  return <form className="stack-form auth-card" onSubmit={submit}><h2>{english ? "Set a new password" : "設定新密碼"}</h2><label>{english ? "New password" : "新密碼"}<input required minLength={PASSWORD_MIN_LENGTH} pattern={PASSWORD_PATTERN} title={english ? "At least 8 characters with lowercase and uppercase letters and a number." : "至少 8 個字元，並包含大小寫英文字母與數字。"} type="password" name="password" value={passwordValue} onChange={(event) => setPasswordValue(event.target.value)} autoComplete="new-password" aria-describedby="password-requirements" /></label><PasswordRequirements password={passwordValue} locale={locale} /><label>{english ? "Enter it again" : "再次輸入"}<input required minLength={PASSWORD_MIN_LENGTH} pattern={PASSWORD_PATTERN} type="password" name="confirm" autoComplete="new-password" /></label>{needsNonce && <div className="security-code"><label>{english ? "Email verification code" : "Email 驗證碼"}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={nonce} onChange={(event) => setNonce(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><button className="text-button" type="button" disabled={busy} onClick={sendReauthenticationCode}>{english ? "Send a new code" : "重新寄送驗證碼"}</button></div>}<button className="form-submit" disabled={busy}>{busy ? (english ? "Updating…" : "更新中…") : needsNonce ? (english ? "Verify and update password" : "驗證並更新密碼") : (english ? "Update password" : "更新密碼")}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
