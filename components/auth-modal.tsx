"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth-card";

type AuthMode = "sign-in" | "sign-up";

function normalizeAuthMode(value: string | null): AuthMode | null {
  if (value === "sign-in" || value === "login" || value === "masuk") {
    return "sign-in";
  }

  if (value === "sign-up" || value === "signup" || value === "daftar") {
    return "sign-up";
  }

  return null;
}

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function cleanAuthParams(params: URLSearchParams) {
  params.delete("auth");
  params.delete("error");
  params.delete("name");
  params.delete("email");
}

export function AuthModal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manualMode, setManualMode] = useState<AuthMode | null>(null);
  const mode = manualMode ?? normalizeAuthMode(searchParams.get("auth"));
  const next = useMemo(() => {
    const explicitNext = searchParams.get("next");

    if (isSafeInternalPath(explicitNext)) {
      return explicitNext as string;
    }

    const params = new URLSearchParams(searchParams.toString());
    cleanAuthParams(params);
    params.delete("next");

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname || "/";
  }, [pathname, searchParams]);

  useEffect(() => {
    function syncManualModeFromUrl() {
      setManualMode(
        normalizeAuthMode(new URLSearchParams(window.location.search).get("auth")),
      );
    }

    window.addEventListener("dramapro-auth-query-change", syncManualModeFromUrl);
    window.addEventListener("popstate", syncManualModeFromUrl);

    return () => {
      window.removeEventListener("dramapro-auth-query-change", syncManualModeFromUrl);
      window.removeEventListener("popstate", syncManualModeFromUrl);
    };
  }, []);

  useEffect(() => {
    if (!mode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

  if (!mode) {
    return null;
  }

  function closeModal() {
    setManualMode(null);
    const params = new URLSearchParams(window.location.search);
    cleanAuthParams(params);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || "/", {
      scroll: false,
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-hidden bg-black/76 px-3 pb-[calc(0.8rem_+_env(safe-area-inset-bottom))] pt-[calc(4.75rem_+_env(safe-area-inset-top))] backdrop-blur-xl sm:items-center sm:px-6 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup login"
        onClick={closeModal}
      />
      <div className="relative z-10 w-full max-w-[560px]">
        <AuthCard
          mode={mode}
          next={next}
          error={searchParams.get("error")}
          initialName={searchParams.get("name") ?? ""}
          initialEmail={searchParams.get("email") ?? ""}
          modal
          onClose={closeModal}
        />
      </div>
    </div>
  );
}
