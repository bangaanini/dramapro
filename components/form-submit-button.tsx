"use client";

import type { PointerEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import { triggerSelectionHaptic } from "@/lib/haptics";

type FormSubmitButtonProps = ButtonProps & {
  idleLabel: string;
  pendingLabel?: string;
};

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  children,
  disabled,
  onPointerDown,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    triggerSelectionHaptic();
    onPointerDown?.(event);
  }

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onPointerDown={handlePointerDown}
    >
      {pending ? (
        <>
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          {pendingLabel ?? idleLabel}
        </>
      ) : children ? (
        children
      ) : (
        idleLabel
      )}
    </Button>
  );
}
