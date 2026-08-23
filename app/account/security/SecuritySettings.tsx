/* eslint-disable @next/next/no-img-element -- Supabase returns a one-time QR code as a data image. */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import type { Locale } from "../../../lib/i18n";

type TotpFactor = { id: string; friendly_name?: string; status?: string };
type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };
type Enrollment = { id: string; qrCode: string; secret: string };

function errorText(error: unknown, english: boolean) {
  return error instanceof Error ? error.message : (english ? "The operation failed. Try again later." : "操作失敗，請稍後再試。");
}

export default function SecuritySettings({ locale }: { locale: Locale }) {
  const english = locale === "en";
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [aal, setAal] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(english ? "Checking account security…" : "正在檢查帳號安全狀態…");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setMessage(english ? "The sign-in service is not configured." : "登入服務尚未設定。"); return; }
    const [factorResult, aalResult, passkeyResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.passkey.list(),
    ]);
    if (factorResult.error) { setMessage(factorResult.error.message); return; }
    setTotpFactors(factorResult.data.totp ?? []);
    setAal(aalResult.data?.currentLevel ?? null);
    if (!passkeyResult.error) setPasskeys(passkeyResult.data ?? []);
    setMessage("");
  }, [english]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function beginTotp() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。");
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "OpenGames 驗證器", issuer: "OpenGames" });
      if (error) throw error;
      const qrCode = data.totp.qr_code.startsWith("data:") ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`;
      setEnrollment({ id: data.id, qrCode, secret: data.totp.secret });
      setMessage(english ? "Scan the QR code, then enter the six-digit code shown by your authenticator." : "請掃描 QR Code，再輸入驗證器顯示的 6 位數代碼。");
    } catch (error) { setMessage(errorText(error, english)); }
    setBusy(false);
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = enrollment?.id ?? totpFactors[0]?.id;
    if (!factorId || !/^\d{6}$/.test(code)) { setMessage(english ? "Enter the six-digit code from your authenticator." : "請輸入驗證器顯示的 6 位數代碼。"); return; }
    setBusy(true); setMessage("");
    const supabase = createClient();
    const result = supabase ? await supabase.auth.mfa.challengeAndVerify({ factorId, code }) : { error: new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。") };
    if (result.error) setMessage(result.error.message);
    else {
      setEnrollment(null); setCode(""); setMessage(english ? "Two-step verification succeeded. This session is now protected." : "二步驟驗證成功，這個工作階段已受到保護。");
      await refresh();
    }
    setBusy(false);
  }

  async function addPasskey() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。");
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setMessage(english ? "Passkey added. Next time you can sign in by unlocking your device." : "密碼金鑰已加入；下次可直接用裝置解鎖登入。");
      await refresh();
    } catch (error) { setMessage(errorText(error, english)); }
    setBusy(false);
  }

  async function removePasskey(passkeyId: string) {
    if (!confirm(english ? "Remove this passkey?" : "確定要移除這把密碼金鑰嗎？")) return;
    setBusy(true);
    const supabase = createClient();
    const result = supabase ? await supabase.auth.passkey.delete({ passkeyId }) : { error: new Error(english ? "The sign-in service is not configured." : "登入服務尚未設定。") };
    setMessage(result.error ? result.error.message : (english ? "Passkey removed." : "密碼金鑰已移除。"));
    await refresh(); setBusy(false);
  }

  return <section className="security-panel" aria-label={english ? "Account security settings" : "帳號安全設定"}>
    <div className="security-grid">
      <article className="security-card">
        <div className="security-card-head"><span className="security-icon" aria-hidden="true">06</span><div><p>AUTHENTICATOR</p><h2>{english ? "Authenticator two-step verification" : "驗證器二步驟驗證"}</h2></div><span className={`security-status ${totpFactors.length ? "active" : ""}`}>{totpFactors.length ? (english ? "Enabled" : "已啟用") : (english ? "Not set up" : "未設定")}</span></div>
        <p>{english ? "Generate one-time codes with a compatible app such as Google Authenticator, Microsoft Authenticator, or 1Password." : "使用 Google Authenticator、Microsoft Authenticator、1Password 等相容應用程式產生一次性代碼。"}</p>
        {!totpFactors.length && !enrollment && <button className="security-primary" disabled={busy} onClick={beginTotp}>{english ? "Set up authenticator" : "設定驗證器"}</button>}
        {enrollment && <div className="totp-setup"><img src={enrollment.qrCode} alt={english ? "OpenGames authenticator QR code" : "OpenGames 驗證器 QR Code"} /><div><span>{english ? "Can't scan it? Enter the key manually" : "無法掃描？手動輸入密鑰"}</span><code>{enrollment.secret}</code></div></div>}
        {enrollment && <form className="verify-form" onSubmit={verifyTotp}><label>{english ? "Six-digit verification code" : "6 位數驗證碼"}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label><button disabled={busy}>{busy ? (english ? "Verifying…" : "驗證中…") : (english ? "Enable two-step verification" : "啟用二步驟驗證")}</button></form>}
        {totpFactors.length > 0 && <div className="security-confirmed"><span>✓</span><div><strong>{english ? "Authenticator connected" : "驗證器已連結"}</strong><small>{aal === "aal2" ? (english ? "This session has completed two-step verification" : "目前工作階段已完成二步驟驗證") : (english ? "An authenticator code will be required next time you sign in" : "下次登入時會要求驗證器代碼")}</small></div></div>}
      </article>
      <article className="security-card">
        <div className="security-card-head"><span className="security-icon" aria-hidden="true">◇</span><div><p>PASSKEY</p><h2>{english ? "Passkeys" : "密碼金鑰"}</h2></div><span className={`security-status ${passkeys.length ? "active" : ""}`}>{passkeys.length ? (english ? `${passkeys.length} saved` : `${passkeys.length} 把`) : (english ? "Available" : "可使用")}</span></div>
        <p>{english ? "Sign in with Windows Hello, Touch ID, Face ID, or a hardware security key—without a password and with stronger phishing resistance." : "使用 Windows Hello、Touch ID、Face ID 或硬體安全金鑰登入；不需輸入密碼，也更能抵抗釣魚網站。"}</p>
        <div className="passkey-add"><button className="security-primary" disabled={busy} onClick={addPasskey}>{busy ? (english ? "Waiting for your device…" : "等待裝置確認…") : (english ? "Add a passkey" : "新增密碼金鑰")}</button></div>
        {passkeys.length > 0 && <div className="passkey-list">{passkeys.map((passkey) => <div key={passkey.id}><span><strong>{passkey.friendly_name || (english ? "Passkey" : "密碼金鑰")}</strong><small>{english ? "Created " : "建立於 "}{new Date(passkey.created_at).toLocaleDateString(english ? "en-US" : "zh-TW")}</small></span><button disabled={busy} onClick={() => removePasskey(passkey.id)}>{english ? "Remove" : "移除"}</button></div>)}</div>}
        <small className="beta-note">{english ? "Passkeys are currently a Supabase Beta feature. Keep email sign-in as a fallback." : "密碼金鑰目前為 Supabase Beta 功能；請至少保留 Email 登入作為備援。"}</small>
      </article>
    </div>
    {message && <p className="security-message" role="status">{message}</p>}
  </section>;
}
