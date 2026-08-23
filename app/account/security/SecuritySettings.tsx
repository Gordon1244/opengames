/* eslint-disable @next/next/no-img-element -- Supabase returns a one-time QR code as a data image. */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type TotpFactor = { id: string; friendly_name?: string; status?: string };
type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };
type Enrollment = { id: string; qrCode: string; secret: string };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "操作失敗，請稍後再試。";
}

export default function SecuritySettings({ challenge, nextPath }: { challenge: boolean; nextPath: string }) {
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [aal, setAal] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [passkeyName, setPasskeyName] = useState("這台裝置");
  const [message, setMessage] = useState("正在檢查帳號安全狀態…");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setMessage("登入服務尚未設定。"); return; }
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
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function beginTotp() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("登入服務尚未設定。");
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "OpenGames 驗證器", issuer: "OpenGames" });
      if (error) throw error;
      const qrCode = data.totp.qr_code.startsWith("data:") ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`;
      setEnrollment({ id: data.id, qrCode, secret: data.totp.secret });
      setMessage("請掃描 QR Code，再輸入驗證器顯示的 6 位數代碼。");
    } catch (error) { setMessage(errorText(error)); }
    setBusy(false);
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = enrollment?.id ?? totpFactors[0]?.id;
    if (!factorId || !/^\d{6}$/.test(code)) { setMessage("請輸入驗證器顯示的 6 位數代碼。"); return; }
    setBusy(true); setMessage("");
    const supabase = createClient();
    const result = supabase ? await supabase.auth.mfa.challengeAndVerify({ factorId, code }) : { error: new Error("登入服務尚未設定。") };
    if (result.error) setMessage(result.error.message);
    else {
      setEnrollment(null); setCode(""); setMessage("二步驟驗證成功，這個工作階段已受到保護。");
      await refresh();
      if (challenge) location.href = nextPath;
    }
    setBusy(false);
  }

  async function addPasskey() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("登入服務尚未設定。");
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (data?.id && passkeyName.trim()) await supabase.auth.passkey.update({ passkeyId: data.id, friendlyName: passkeyName.trim() });
      setMessage("密碼金鑰已加入；下次可直接用裝置解鎖登入。");
      await refresh();
    } catch (error) { setMessage(errorText(error)); }
    setBusy(false);
  }

  async function removePasskey(passkeyId: string) {
    if (!confirm("確定要移除這把密碼金鑰嗎？")) return;
    setBusy(true);
    const supabase = createClient();
    const result = supabase ? await supabase.auth.passkey.delete({ passkeyId }) : { error: new Error("登入服務尚未設定。") };
    setMessage(result.error ? result.error.message : "密碼金鑰已移除。");
    await refresh(); setBusy(false);
  }

  const needsChallenge = challenge && totpFactors.length > 0 && aal !== "aal2";
  return <section className="security-panel" aria-label="帳號安全設定">
    {needsChallenge && <div className="security-alert"><strong>還差一步</strong><span>請輸入驗證器代碼，完成本次登入。</span></div>}
    <div className="security-grid">
      <article className="security-card">
        <div className="security-card-head"><span className="security-icon" aria-hidden="true">06</span><div><p>AUTHENTICATOR</p><h2>驗證器二步驟驗證</h2></div><span className={`security-status ${totpFactors.length ? "active" : ""}`}>{totpFactors.length ? "已啟用" : "未設定"}</span></div>
        <p>使用 Google Authenticator、Microsoft Authenticator、1Password 等相容應用程式產生一次性代碼。</p>
        {!totpFactors.length && !enrollment && <button className="security-primary" disabled={busy} onClick={beginTotp}>設定驗證器</button>}
        {enrollment && <div className="totp-setup"><img src={enrollment.qrCode} alt="OpenGames 驗證器 QR Code" /><div><span>無法掃描？手動輸入密鑰</span><code>{enrollment.secret}</code></div></div>}
        {(enrollment || needsChallenge) && <form className="verify-form" onSubmit={verifyTotp}><label>6 位數驗證碼<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label><button disabled={busy}>{busy ? "驗證中…" : needsChallenge ? "完成登入" : "啟用二步驟驗證"}</button></form>}
        {totpFactors.length > 0 && !needsChallenge && <div className="security-confirmed"><span>✓</span><div><strong>驗證器已連結</strong><small>{aal === "aal2" ? "目前工作階段已完成二步驟驗證" : "下次登入時會要求驗證器代碼"}</small></div></div>}
      </article>
      <article className="security-card">
        <div className="security-card-head"><span className="security-icon" aria-hidden="true">◇</span><div><p>PASSKEY</p><h2>密碼金鑰</h2></div><span className={`security-status ${passkeys.length ? "active" : ""}`}>{passkeys.length ? `${passkeys.length} 把` : "可使用"}</span></div>
        <p>使用 Windows Hello、Touch ID、Face ID 或硬體安全金鑰登入；不需輸入密碼，也更能抵抗釣魚網站。</p>
        <div className="passkey-add"><label>金鑰名稱<input value={passkeyName} maxLength={120} onChange={(event) => setPasskeyName(event.target.value)} /></label><button className="security-primary" disabled={busy} onClick={addPasskey}>加入這台裝置</button></div>
        {passkeys.length > 0 && <div className="passkey-list">{passkeys.map((passkey) => <div key={passkey.id}><span><strong>{passkey.friendly_name || "密碼金鑰"}</strong><small>建立於 {new Date(passkey.created_at).toLocaleDateString("zh-TW")}</small></span><button disabled={busy} onClick={() => removePasskey(passkey.id)}>移除</button></div>)}</div>}
        <small className="beta-note">密碼金鑰目前為 Supabase Beta 功能；請至少保留 Email 登入作為備援。</small>
      </article>
    </div>
    {message && <p className="security-message" role="status">{message}</p>}
  </section>;
}
