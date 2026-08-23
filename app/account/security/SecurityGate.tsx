"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import SecuritySettings from "./SecuritySettings";

type TotpFactor = { id: string; friendly_name?: string; status?: string };
type Method = "password" | "passkey" | "totp";

function errorText(error: unknown) {
  if (error instanceof Error && error.name === "NotAllowedError") return "你已取消裝置驗證，帳號安全設定尚未開啟。";
  return error instanceof Error ? error.message : "驗證失敗，請稍後再試。";
}

async function verifyWithServer(payload: Record<string, string>) {
  const response = await fetch("/api/auth/reauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "驗證失敗，請稍後再試。");
}

export default function SecurityGate({ userId, challenge, nextPath }: { userId: string; challenge: boolean; nextPath: string }) {
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
      if (!supabase) { setMessage("登入服務尚未設定。"); setChecking(false); return; }
      void supabase.auth.mfa.listFactors().then(({ data, error }) => {
        if (error) setMessage(error.message);
        setTotpFactors((data?.totp ?? []).filter((factor) => factor.status === "verified"));
        setChecking(false);
      });
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

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
      await verifyWithServer({ method: "password", password });
      complete();
    } catch (error) { setMessage(errorText(error)); }
    setBusy(false);
  }

  async function verifyPasskey() {
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("登入服務尚未設定。");
      const { data: before } = await supabase.auth.getUser();
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      if (!before.user || before.user.id !== userId || data.user?.id !== userId || !data.session?.access_token) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("你選擇了另一個帳號，請重新登入原本帳號。");
      }
      await verifyWithServer({ method: "passkey", accessToken: data.session.access_token });
      complete();
    } catch (error) { setMessage(errorText(error)); }
    setBusy(false);
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = totpFactors[0]?.id;
    if (!factorId || !/^\d{6}$/.test(code)) { setMessage("請輸入驗證器顯示的 6 位數代碼。"); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("登入服務尚未設定。");
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      await verifyWithServer({ method: "totp", accessToken: data.access_token });
      complete();
    } catch (error) { setMessage(errorText(error)); }
    setBusy(false);
  }

  if (verified) return <SecuritySettings />;

  const hasTotp = totpFactors.length > 0;
  return <section className="reauth-panel" aria-labelledby="reauth-title">
    <div className="reauth-card">
      <div className="reauth-heading">
        <span className="reauth-lock" aria-hidden="true">◎</span>
        <div><p>SECURITY CHECK</p><h2 id="reauth-title">請再次確認是你本人</h2></div>
      </div>
      <p className="reauth-copy">帳號安全包含密碼金鑰與二步驟驗證等敏感設定，因此每次進入都要重新驗證。</p>
      {challenge && <div className="security-alert"><strong>完成本次登入</strong><span>此帳號已啟用二步驟驗證，請使用驗證器繼續。</span></div>}
      {!challenge && <div className="reauth-methods" aria-label="再次驗證方式">
        <button type="button" className={method === "password" ? "active" : ""} onClick={() => { setMethod("password"); setMessage(""); }}><span>PW</span><strong>目前密碼</strong><small>重新輸入帳號密碼</small></button>
        <button type="button" className={method === "passkey" ? "active" : ""} onClick={() => { setMethod("passkey"); setMessage(""); }}><span>◇</span><strong>密碼金鑰</strong><small>Windows Hello 或安全金鑰</small></button>
        {hasTotp && <button type="button" className={method === "totp" ? "active" : ""} onClick={() => { setMethod("totp"); setMessage(""); }}><span>06</span><strong>驗證器</strong><small>輸入 6 位數代碼</small></button>}
      </div>}
      {checking ? <p className="reauth-wait" role="status">正在檢查可用的登入方式…</p> : <>
        {method === "password" && !challenge && <form className="reauth-form" onSubmit={verifyPassword}><label>目前密碼<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button disabled={busy}>{busy ? "確認中…" : "確認並進入"}</button></form>}
        {method === "passkey" && !challenge && <div className="reauth-action"><p>系統會開啟這台裝置的安全驗證視窗。</p><button type="button" disabled={busy} onClick={verifyPasskey}>{busy ? "等待裝置確認…" : "使用密碼金鑰確認"}</button></div>}
        {method === "totp" && hasTotp && <form className="reauth-form" onSubmit={verifyTotp}><label>6 位數驗證碼<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label><button disabled={busy}>{busy ? "驗證中…" : challenge ? "完成登入" : "驗證並進入"}</button></form>}
        {challenge && !hasTotp && <p className="reauth-error" role="alert">找不到已啟用的驗證器。請登出後重新登入，或聯絡網站管理員。</p>}
      </>}
      {message && <p className="reauth-error" role="alert">{message}</p>}
      <p className="reauth-privacy"><span aria-hidden="true">●</span> 密碼只會送到驗證服務確認，不會儲存於 OpenGames。</p>
    </div>
  </section>;
}
