"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function AffiliateCaptureEffect({ referralCode }: { referralCode: string }) {
  const router = useRouter();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!referralCode || hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    async function captureReferral() {
      try {
        await fetch(
          `/api/affiliate/capture?ref=${encodeURIComponent(referralCode)}&mode=json`,
          {
            credentials: "same-origin",
            cache: "no-store",
          },
        );
      } finally {
        router.replace("/");
      }
    }

    void captureReferral();
  }, [referralCode, router]);

  return null;
}
