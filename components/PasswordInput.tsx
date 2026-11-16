"use client";

import { useState } from "react";

export function PasswordInput({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor="password">{label}</label>
      <input
        id="password"
        name="password"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        autoFocus
      />
      <label className="inline-check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
      </label>
    </div>
  );
}
