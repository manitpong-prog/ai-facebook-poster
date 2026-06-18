"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingText = "กำลังบันทึก...",
  className,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      aria-disabled={pending || disabled}
    >
      {pending ? pendingText : children}
    </button>
  );
}
