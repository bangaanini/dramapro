import type { Metadata } from "next";

import { TelegramAdminLoginClient } from "@/app/admin/telegram-login/TelegramAdminLoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Telegram",
};

export default function TelegramAdminLoginPage() {
  return <TelegramAdminLoginClient />;
}
