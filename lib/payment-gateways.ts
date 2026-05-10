import { prisma } from "@/lib/prisma";
import { decryptPaymentSecret } from "@/lib/payment-crypto";

export const PAYMENT_GATEWAY_PROVIDERS = [
  "paymenku",
  "duitku",
  "xendit",
  "midtrans",
  "tripay",
  "doku",
] as const;

export type PaymentGatewayProvider = (typeof PAYMENT_GATEWAY_PROVIDERS)[number];

export function isPaymentGatewayProvider(
  value: string,
): value is PaymentGatewayProvider {
  return PAYMENT_GATEWAY_PROVIDERS.includes(value as PaymentGatewayProvider);
}

export type GatewayCapability = {
  supportsInlineQr: boolean;
  supportsRedirectCheckout: boolean;
  supportsWebhook: boolean;
  supportsStatusPolling: boolean;
  implemented: boolean;
};

export type CreatePaymentTransactionInput = {
  referenceId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  callbackUrl?: string;
  channelCode: string;
};

export type CreatePaymentTransactionResult = {
  providerTransactionId: string;
  referenceId: string;
  amount: number | null;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  payUrl: string;
  qrUrl: string | null;
  qrString: string | null;
  expiresAt: Date | null;
  providerPayload: object;
  channelCode: string;
  channelName: string;
  channelGroup?: "qris" | "va" | "ewallet" | "other";
  bankName?: string | null;
  vaNumber?: string | null;
};

export type CheckPaymentStatusResult = {
  providerTransactionId: string | null;
  amount: number | null;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  payUrl: string | null;
  qrUrl: string | null;
  qrString: string | null;
  expiresAt: Date | null;
  providerPayload: object;
  channelGroup?: "qris" | "va" | "ewallet" | "other";
  bankName?: string | null;
  vaNumber?: string | null;
};

export type PaymentGatewayRuntimeConfig = {
  provider: PaymentGatewayProvider;
  displayName: string;
  isEnabled: boolean;
  defaultChannelCode: string;
  merchantId: string;
  clientKey: string;
  secret: string | null;
  configJson: unknown;
  lastError: string;
  lastValidatedAt: Date | null;
};

export const PAYMENT_GATEWAY_DEFINITIONS: Array<{
  provider: PaymentGatewayProvider;
  displayName: string;
  capability: GatewayCapability;
}> = [
  {
    provider: "paymenku",
    displayName: "Paymenku",
    capability: {
      supportsInlineQr: true,
      supportsRedirectCheckout: true,
      supportsWebhook: false,
      supportsStatusPolling: true,
      implemented: true,
    },
  },
  {
    provider: "duitku",
    displayName: "Duitku",
    capability: {
      supportsInlineQr: true,
      supportsRedirectCheckout: true,
      supportsWebhook: true,
      supportsStatusPolling: true,
      implemented: true,
    },
  },
  {
    provider: "xendit",
    displayName: "Xendit",
    capability: {
      supportsInlineQr: true,
      supportsRedirectCheckout: true,
      supportsWebhook: true,
      supportsStatusPolling: true,
      implemented: false,
    },
  },
  {
    provider: "midtrans",
    displayName: "Midtrans",
    capability: {
      supportsInlineQr: true,
      supportsRedirectCheckout: true,
      supportsWebhook: true,
      supportsStatusPolling: true,
      implemented: false,
    },
  },
  {
    provider: "tripay",
    displayName: "Tripay",
    capability: {
      supportsInlineQr: true,
      supportsRedirectCheckout: true,
      supportsWebhook: true,
      supportsStatusPolling: true,
      implemented: false,
    },
  },
  {
    provider: "doku",
    displayName: "DOKU",
    capability: {
      supportsInlineQr: false,
      supportsRedirectCheckout: true,
      supportsWebhook: true,
      supportsStatusPolling: true,
      implemented: false,
    },
  },
];

export function getPaymentGatewayDefinition(provider: PaymentGatewayProvider) {
  return PAYMENT_GATEWAY_DEFINITIONS.find((item) => item.provider === provider);
}

export function getPaymentGatewayCapability(provider: PaymentGatewayProvider) {
  return getPaymentGatewayDefinition(provider)?.capability;
}

export async function listPaymentGatewayConfigs() {
  const rows = await prisma.paymentGatewayConfig.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  return PAYMENT_GATEWAY_DEFINITIONS.map((definition) => {
    const row = rows.find((item) => item.provider === definition.provider);
    let secret: string | null = null;
    let derivedLastError = row?.lastError ?? "";

    try {
      secret = row?.secretCiphertext
        ? decryptPaymentSecret(row.secretCiphertext)
        : definition.provider === "paymenku"
          ? process.env.PAYMENKU_API_KEY?.trim() ?? null
          : null;
    } catch (error) {
      derivedLastError =
        error instanceof Error ? error.message : "Credential gateway gagal dibaca.";
    }

    return {
      provider: definition.provider,
      displayName: row?.displayName || definition.displayName,
      isEnabled: row?.isEnabled ?? false,
      defaultChannelCode:
        row?.defaultChannelCode ??
        (definition.provider === "duitku" ? "NQ" : "qris"),
      merchantId: row?.merchantId ?? "",
      clientKey: row?.clientKey ?? "",
      secret,
      hasSecret: Boolean(secret),
      configJson: row?.configJson ?? null,
      lastError: derivedLastError,
      lastValidatedAt: row?.lastValidatedAt ?? null,
      capability: definition.capability,
    };
  });
}

export async function getActivePaymentGateway() {
  const [settings, configs] = await Promise.all([
    prisma.paymentGatewaySettings.findUnique({
      where: { id: "global" },
    }),
    listPaymentGatewayConfigs(),
  ]);

  const activeProvider =
    (settings?.activeProvider as PaymentGatewayProvider | null) ??
    (process.env.PAYMENKU_API_KEY ? "paymenku" : null);

  if (!activeProvider) {
    throw new Error("Belum ada payment gateway aktif.");
  }

  const config = configs.find((item) => item.provider === activeProvider);

  if (!config) {
    throw new Error("Konfigurasi payment gateway aktif tidak ditemukan.");
  }

  if (!config.capability.implemented) {
    throw new Error(
      `${config.displayName} sudah dipilih, tetapi adapter checkout-nya belum diimplementasikan.`,
    );
  }

  if (!config.isEnabled && !(activeProvider === "paymenku" && process.env.PAYMENKU_API_KEY)) {
    throw new Error(`${config.displayName} belum diaktifkan di panel admin.`);
  }

  if (!config.secret) {
    throw new Error(`${config.displayName} belum memiliki credential yang valid.`);
  }

  if (config.provider === "duitku" && !config.merchantId.trim()) {
    throw new Error("Duitku belum memiliki Merchant ID.");
  }

  return config;
}
