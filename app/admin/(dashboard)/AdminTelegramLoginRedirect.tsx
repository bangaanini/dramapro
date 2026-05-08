"use client";

import { useEffect } from "react";

import "@/lib/telegram-web-app";

export function AdminTelegramLoginRedirect() {
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData?.trim();

    if (!initData) {
      return;
    }

    window.location.replace("/admin/telegram-login");
  }, []);

  return null;
}
