"use client";

import type { ButtonHTMLAttributes } from "react";

/** A submit button that asks "are you sure?" first, so a stray tap on a phone can't delete things. */
export function ConfirmButton({
  message,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
