"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = ButtonProps & {
  idleLabel: string;
  pendingLabel?: string;
};

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  children,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending}>
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
