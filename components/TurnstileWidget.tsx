"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/i18n";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScript: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScript) return turnstileScript;

  turnstileScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileScript = null;
    throw error;
  });

  return turnstileScript;
}

export default function TurnstileWidget({
  siteKey,
  action,
  locale,
  resetSignal,
  onToken,
}: {
  siteKey: string;
  action: "login" | "signup" | "password_reset";
  locale: Locale;
  resetSignal: number;
  onToken: (token: string) => void;
}) {
  const english = locale === "en";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error">(siteKey ? "loading" : "error");

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    onTokenRef.current("");
    if (!siteKey) return;

    loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        appearance: "always",
        "refresh-expired": "auto",
        callback: (token: string) => { setStatus("verified"); onTokenRef.current(token); },
        "expired-callback": () => { setStatus("ready"); onTokenRef.current(""); },
        "error-callback": () => { setStatus("error"); onTokenRef.current(""); },
      });
      setStatus("ready");
    }).catch(() => {
      if (!cancelled) { setStatus("error"); onTokenRef.current(""); }
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action, siteKey]);

  useEffect(() => {
    if (!resetSignal || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenRef.current("");
  }, [resetSignal]);

  const statusText = status === "verified"
    ? (english ? "Human verification complete." : "真人驗證完成。")
    : status === "error"
      ? (english ? "Verification could not load. Refresh the page and try again." : "驗證無法載入，請重新整理頁面後再試。")
      : (english ? "Complete the security check to continue." : "完成安全檢查後即可繼續。")

  return <div className="turnstile-panel" aria-live="polite">
    <div className="turnstile-widget" ref={containerRef} />
    <p className={status === "error" ? "error" : status === "verified" ? "verified" : ""}>{statusText}</p>
  </div>;
}
