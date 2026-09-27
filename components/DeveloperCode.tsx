"use client";

import { useState } from "react";

export function DeveloperCode({ code, label, copyLabel, copiedLabel }: { code: string; label: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  function copyWithSelectionFallback() {
    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    textarea.remove();
    if (!succeeded) throw new Error("COPY_FAILED");
  }

  async function copyCode() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          copyWithSelectionFallback();
        }
      } else {
        copyWithSelectionFallback();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <div className="developer-code">
    <div className="developer-code-bar"><span>{label}</span><button type="button" onClick={copyCode}>{copied ? copiedLabel : copyLabel}</button></div>
    {/* A focusable scroll region lets keyboard users move through long code lines. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <pre tabIndex={0}><code>{code}</code></pre>
    <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ""}</span>
  </div>;
}
