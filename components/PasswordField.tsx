"use client";

import { useId, useState } from "react";
import { isEnglishOnly, PASSWORD_MESSAGES } from "@/lib/passwords";
import { IconEye, IconEyeOff } from "./icons";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string | null;
  success?: string | null;
};

/** Password input with a show/hide button and live warnings for Arabic letters and Caps Lock. */
export function PasswordField({ label, name, value, onChange, autoComplete, hint, error, success }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const notEnglish = value !== "" && !isEnglishOnly(value);
  const problem = notEnglish ? PASSWORD_MESSAGES.notEnglish : error;

  const trackCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
          dir="ltr"
          aria-invalid={Boolean(problem)}
          aria-describedby={`${id}-note`}
          className={`input en pl-11 ${problem ? "border-danger" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 left-0 grid w-11 place-items-center text-muted hover:text-text"
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          aria-pressed={show}
          title={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        >
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      <div id={`${id}-note`} className="mt-1.5 space-y-1 text-sm" aria-live="polite">
        {problem && <p className="text-danger">{problem}</p>}
        {capsLock && <p className="text-flame">زر الأحرف الكبيرة (Caps Lock) شغّال.</p>}
        {!problem && success && <p className="text-ok">✓ {success}</p>}
        {!problem && !success && hint && <p className="text-muted">{hint}</p>}
      </div>
    </div>
  );
}
