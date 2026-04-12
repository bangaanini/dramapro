"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type PlayDramaButtonProps = {
  href: string;
  label: string;
  className?: string;
};

export function PlayDramaButton({
  href,
  label,
  className,
}: PlayDramaButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 12000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading]);

  return (
    <button
      type="button"
      disabled={isLoading}
      aria-busy={isLoading}
      onPointerDown={() => {
        if (isLoading) {
          return;
        }

        triggerSelectionHaptic();
      }}
      onClick={() => {
        if (isLoading) {
          return;
        }

        setIsLoading(true);
        router.push(href);
      }}
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-12 rounded-full px-6",
        className,
      )}
    >
      {isLoading ? (
        <LoaderCircle className="mr-2 size-4.5 animate-spin" />
      ) : (
        <PlayCircle className="mr-2 size-4.5" />
      )}
      {isLoading ? "Menyiapkan player..." : label}
    </button>
  );
}
