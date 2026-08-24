"use client";

import type { Locale } from "../lib/i18n";
import { PASSWORD_MIN_LENGTH, passwordRequirementState } from "../lib/password-policy";

export default function PasswordRequirements({ password, locale }: { password: string; locale: Locale }) {
  const english = locale === "en";
  const state = passwordRequirementState(password);
  const requirements = [
    [state.length, english ? `At least ${PASSWORD_MIN_LENGTH} characters` : `至少 ${PASSWORD_MIN_LENGTH} 個字元`],
    [state.lowercase, english ? "One lowercase letter" : "至少一個小寫英文字母"],
    [state.uppercase, english ? "One uppercase letter" : "至少一個大寫英文字母"],
    [state.digit, english ? "One number" : "至少一個數字"],
  ] as const;

  return <div className="password-requirements" id="password-requirements">
    <p>{english ? "Your new password needs:" : "新密碼必須包含："}</p>
    <ul>{requirements.map(([met, label]) => <li className={met ? "met" : ""} key={label}><span aria-hidden="true">{met ? "✓" : "○"}</span>{label}</li>)}</ul>
  </div>;
}
