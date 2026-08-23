"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import SecuritySettings from "./SecuritySettings";
import type { Locale } from "../../../lib/i18n";

type TotpFactor = { id: string; friendly_name?: string; status?: string };
type Method = "password" | "passkey" | "totp";

function errorText(error: unknown, english: boolean) {
  if (error instanceof Error && error.name === "NotAllowedError") return english ? "Device verification was canceled. Security settings remain locked." : "你已取消裝置驗證，帳號安全設定尚未開啟。";
  return error instanceof Error ? error.message : (english ? "Verification failed. Try again later." : "驗證失敗，請稍後再試。");
}

async function verifyWithServer(payload: Record<string, string>, english: boolean) {
  const response = await fetch("/api/auth/reauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(english ? "Verification failed. Try again later." : (result.error || "驗證失敗，請稍後再試。"));
}

export default function SecurityGate({ locale, userId, challenge, nextPath }: { locale: Locale; userId: string; challenge: boolean; nextPath: string }) {
  const english = locale === "en";
  const [method, setMethod] = useState<Method>(challenge ? "totp" : "password");
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const task = window.setTimeout(() => {
      const supabase = createClient();
      if (!supabase) { setMessage(english ? "The sign-in service is not configured." : "登入服務尚未設定。"); setChecking(false); return; }
      void supabase.auth.mfa.listFactors().then(({ data, error }) => {
        if (error) setMessage(error.message);
        setTotpFactors((data?.totp ?? []).filter((factor) => factor.status === "verified"));
        setChecking(false);
      });
    }, 0);
    return () => window.clearTimeout(task);
  }, [english]);

  function complete() {
    setPassword("");
    setCode("");
    if (challenge) location.href = nextPath;
    else setVerified(true);
  }

  async function verifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await verifyWithServer({ method: "password", password }, english);
      complete();
    } catch (error) { setMessage(errorText(error, english)); }
    setBusy(false);
  }

  async function verifyPasskey() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。");
      const { data: before } = await supabase.auth.getUser();
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      if (!before.user || before.user.id !== userId || data.user?.id !== userId || !data.session?.access_token) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(english ? "You selected a different account. Sign back in to the original account." : "你選擇了另一個帳號，請重新登入原本帳號。");
      }
      await verifyWithServer({ method: "passkey", accessToken: data.session.access_token }, english);
      complete();
    } catch (error) { setMessage(errorText(error, english)); }
    setBusy(false);
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = totpFactors[0]?.id;
    if (!factorId || !/^\d{6}$/.test(code)) { setMessage(english ? "Enter the six-digit code from your authenticator." : "請輸入驗證器顯示的 6 位數代碼。"); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。");
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      await verifyWithServer({ method: "totp", accessToken: data.access_token }, english);
      complete();
    } catch (error) { setMessage(errorText(error, english)); }
    setBusy(false);
  }

  if (verified) return <SecuritySettings locale={locale} />;

  const hasTotp = totpFactors.length > 0;
  return <section className="reauth-panel" aria-labelledby="reauth-title">
    <div className="reauth-card">
      <div className="reauth-heading">
        <span className="reauth-lock" aria-hidden="true">◎</span>
        <div><p>SECURITY CHECK</p><h2 id="reauth-title">{english ? "Confirm that it's really you" : "請再次確認是你本人"}</h2></div>
      </div>
      <p className="reauth-copy">{english ? "Account security includes sensitive passkey and two-step verification settings, so you must verify again each time you enter." : "帳號安全包含密碼金鑰與二步驟驗證等敏感設定，因此每次進入都要重新驗證。"}</p>
      {challenge && <div className="security-alert"><strong>{english ? "Complete this sign-in" : "完成本次登入"}</strong><span>{english ? "Two-step verification is enabled. Continue with your authenticator." : "此帳號已啟用二步驟驗證，請使用驗證器繼續。"}</span></div>}
      {!challenge && <div className="reauth-methods" aria-label={english ? "Verification methods" : "再次驗證方式"}>
        <button type="button" className={method === "password" ? "active" : ""} onClick={() => { setMethod("password"); setMessage(""); }}><span>PW</span><strong>{english ? "Current password" : "目前密碼"}</strong><small>{english ? "Enter your account password again" : "重新輸入帳號密碼"}</small></button>
        <button type="button" className={method === "passkey" ? "active" : ""} onClick={() => { setMethod("passkey"); setMessage(""); }}><span>◇</span><strong>{english ? "Passkey" : "密碼金鑰"}</strong><small>{english ? "Windows Hello or security key" : "Windows Hello 或安全金鑰"}</small></button>
        {hasTotp && <button type="button" className={method === "totp" ? "active" : ""} onClick={() => { setMethod("totp"); setMessage(""); }}><span>06</span><strong>{english ? "Authenticator" : "驗證器"}</strong><small>{english ? "Enter a six-digit code" : "輸入 6 位數代碼"}</small></button>}
      </div>}
      {checking ? <p className="reauth-wait" role="status">{english ? "Checking available sign-in methods…" : "正在檢查可用的登入方式…"}</p> : <>
        {method === "password" && !challenge && <form className="reauth-form" onSubmit={verifyPassword}><label>{english ? "Current password" : "目前密碼"}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button disabled={busy}>{busy ? (english ? "Confirming…" : "確認中…") : (english ? "Confirm and continue" : "確認並進入")}</button></form>}
        {method === "passkey" && !challenge && <div className="reauth-action"><p>{english ? "Your device security prompt will open." : "系統會開啟這台裝置的安全驗證視窗。"}</p><button type="button" disabled={busy} onClick={verifyPasskey}>{busy ? (english ? "Waiting for your device…" : "等待裝置確認…") : (english ? "Confirm with a passkey" : "使用密碼金鑰確認")}</button></div>}
        {method === "totp" && hasTotp && <form className="reauth-form" onSubmit={verifyTotp}><label>{english ? "Six-digit verification code" : "6 位數驗證碼"}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label><button disabled={busy}>{busy ? (english ? "Verifying…" : "驗證中…") : challenge ? (english ? "Complete sign-in" : "完成登入") : (english ? "Verify and continue" : "驗證並進入")}</button></form>}
        {challenge && !hasTotp && <p className="reauth-error" role="alert">{english ? "No enabled authenticator was found. Sign out and try again, or contact the site administrator." : "找不到已啟用的驗證器。請登出後重新登入，或聯絡網站管理員。"}</p>}
      </>}
      {message && <p className="reauth-error" role="alert">{message}</p>}
      <p className="reauth-privacy"><span aria-hidden="true">●</span> {english ? "Your password is sent only to the authentication service for verification and is never stored by OpenGames." : "密碼只會送到驗證服務確認，不會儲存於 OpenGames。"}</p>
    </div>
  </section>;
}
