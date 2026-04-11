import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const AFFILIATE_COOKIE = "dramapro_affiliate_ref";

export type AffiliateSettingsRecord = {
  id: string;
  isEnabled: boolean;
  cookieTtlDays: number;
  minimumWithdrawalAmount: number;
  bronzeMinActiveReferrals: number;
  bronzeCommissionRate: number;
  silverMinActiveReferrals: number;
  silverCommissionRate: number;
  goldMinActiveReferrals: number;
  goldCommissionRate: number;
  platinumMinActiveReferrals: number;
  platinumCommissionRate: number;
  commissionNotes: string;
  withdrawalNotes: string;
  otherTerms: string;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettingsRecord = {
  id: "global",
  isEnabled: true,
  cookieTtlDays: 30,
  minimumWithdrawalAmount: 10000,
  bronzeMinActiveReferrals: 0,
  bronzeCommissionRate: 10,
  silverMinActiveReferrals: 5,
  silverCommissionRate: 15,
  goldMinActiveReferrals: 20,
  goldCommissionRate: 20,
  platinumMinActiveReferrals: 50,
  platinumCommissionRate: 25,
  commissionNotes:
    "Komisi dihitung dari transaksi VIP yang sudah sukses dibayar oleh user referral.",
  withdrawalNotes:
    "Penarikan komisi hanya bisa diajukan jika saldo tersedia sudah mencapai minimum penarikan.",
  otherTerms:
    "Referral aktif dihitung dari user referral yang sudah pernah sukses membeli VIP minimal satu kali.",
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

export type AffiliateTierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export async function getAffiliateSettings() {
  const settings = await prisma.affiliateSettings.findUnique({
    where: { id: "global" },
  });

  return settings ?? DEFAULT_AFFILIATE_SETTINGS;
}

export function getAffiliateTier(
  activeReferrals: number,
  settings: AffiliateSettingsRecord,
) {
  const tiers = [
    {
      level: "Platinum" as const,
      minReferrals: settings.platinumMinActiveReferrals,
      rate: settings.platinumCommissionRate,
    },
    {
      level: "Gold" as const,
      minReferrals: settings.goldMinActiveReferrals,
      rate: settings.goldCommissionRate,
    },
    {
      level: "Silver" as const,
      minReferrals: settings.silverMinActiveReferrals,
      rate: settings.silverCommissionRate,
    },
    {
      level: "Bronze" as const,
      minReferrals: settings.bronzeMinActiveReferrals,
      rate: settings.bronzeCommissionRate,
    },
  ];

  return (
    tiers.find((tier) => activeReferrals >= tier.minReferrals) ?? tiers[tiers.length - 1]
  );
}

function sanitizeAffiliateSeed(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return compact.slice(0, 4) || "DRM";
}

function generateAffiliateCodeCandidate(name: string) {
  const prefix = sanitizeAffiliateSeed(name);
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

export async function ensureUserAffiliateCode(userId: string, name?: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      affiliateCode: true,
    },
  });

  if (!current) {
    return null;
  }

  if (current.affiliateCode) {
    return current.affiliateCode;
  }

  const seedName = name ?? current.name;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateAffiliateCodeCandidate(seedName);

    const existing = await prisma.user.findUnique({
      where: { affiliateCode: candidate },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const updated = await prisma.user.update({
      where: { id: current.id },
      data: {
        affiliateCode: candidate,
      },
      select: {
        affiliateCode: true,
      },
    });

    return updated.affiliateCode;
  }

  throw new Error("Gagal membuat kode affiliate unik.");
}

export async function readAffiliateCookieCode() {
  const cookieStore = await cookies();
  return cookieStore.get(AFFILIATE_COOKIE)?.value?.trim().toUpperCase() ?? null;
}

export function buildAffiliateLink(baseUrl: string, affiliateCode: string) {
  return `${baseUrl.replace(/\/+$/, "")}/?ref=${encodeURIComponent(affiliateCode)}`;
}

export function buildTelegramAffiliateLink(
  botUsername: string,
  affiliateCode: string,
) {
  const normalizedUsername = botUsername.trim().replace(/^@/, "");
  return `https://t.me/${normalizedUsername}?start=${encodeURIComponent(`ref_${affiliateCode}`)}`;
}

export function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateAffiliateAvailableBalance(input: {
  totalCommission: number;
  totalWithdrawn: number;
  totalReserved: number;
}) {
  return Math.max(
    0,
    input.totalCommission - input.totalWithdrawn - input.totalReserved,
  );
}
