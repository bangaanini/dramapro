const PAKASIR_API_BASE = "https://app.pakasir.com/api";

export const PAKASIR_CHANNEL_GROUPS = {
  qris: "qris",
  va: "va",
  other: "other",
} as const;

export type PakasirChannelGroup =
  (typeof PAKASIR_CHANNEL_GROUPS)[keyof typeof PAKASIR_CHANNEL_GROUPS];

export type PakasirChannelDefinition = {
  code: string;
  name: string;
  group: PakasirChannelGroup;
  bankName?: string;
  shortName?: string;
};

export const PAKASIR_PRIMARY_CHANNELS: PakasirChannelDefinition[] = [
  {
    code: "qris",
    name: "QRIS",
    group: PAKASIR_CHANNEL_GROUPS.qris,
    shortName: "QRIS",
  },
  {
    code: "cimb_niaga_va",
    name: "CIMB Niaga Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "CIMB Niaga",
    shortName: "CIMB",
  },
  {
    code: "bni_va",
    name: "BNI Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "BNI",
    shortName: "BNI",
  },
  {
    code: "sampoerna_va",
    name: "Sampoerna Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "Sampoerna",
    shortName: "Sampoerna",
  },
  {
    code: "bnc_va",
    name: "BNC Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "BNC",
    shortName: "BNC",
  },
  {
    code: "maybank_va",
    name: "Maybank Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "Maybank",
    shortName: "Maybank",
  },
  {
    code: "permata_va",
    name: "Permata Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "Permata",
    shortName: "Permata",
  },
  {
    code: "atm_bersama_va",
    name: "ATM Bersama Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "ATM Bersama",
    shortName: "ATM Bersama",
  },
  {
    code: "artha_graha_va",
    name: "Artha Graha Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "Artha Graha",
    shortName: "Artha Graha",
  },
  {
    code: "bri_va",
    name: "BRI Virtual Account",
    group: PAKASIR_CHANNEL_GROUPS.va,
    bankName: "BRI",
    shortName: "BRI",
  },
];

export type PakasirGatewayConfig = {
  enabledChannels?: string[];
};

export type PakasirCreateTransactionInput = {
  project: string;
  order_id: string;
  amount: number;
  api_key: string;
};

export type PakasirCreateTransactionResponse = {
  payment?: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: string;
    payment_number: string;
    expired_at: string;
  };
  error?: string;
  message?: string;
};

export type PakasirTransactionDetailResponse = {
  transaction?: {
    amount: number;
    order_id: string;
    project: string;
    status: string;
    payment_method: string;
    completed_at?: string;
  };
  error?: string;
  message?: string;
};

async function pakasirFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${PAKASIR_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : null;

  if (!response.ok) {
    const detail = extractPakasirErrorMessage(
      payload,
      `Pakasir request failed with status ${response.status}.`,
    );
    throw new Error(detail);
  }

  if (!payload) {
    throw new Error("Pakasir returned an empty response.");
  }

  return payload;
}

function extractPakasirErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as {
    message?: unknown;
    error?: unknown;
  };

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  return fallback;
}

export async function createPakasirTransaction(
  apiKey: string,
  projectSlug: string,
  input: {
    order_id: string;
    amount: number;
    method: string;
  },
) {
  return pakasirFetch<PakasirCreateTransactionResponse>(
    `/transactioncreate/${encodeURIComponent(input.method)}`,
    {
      method: "POST",
      body: JSON.stringify({
        project: projectSlug,
        order_id: input.order_id,
        amount: input.amount,
        api_key: apiKey,
      }),
    },
  );
}

export async function checkPakasirTransactionStatus(
  apiKey: string,
  projectSlug: string,
  orderId: string,
  amount: number,
) {
  const params = new URLSearchParams({
    project: projectSlug,
    amount: String(amount),
    order_id: orderId,
    api_key: apiKey,
  });

  return pakasirFetch<PakasirTransactionDetailResponse>(
    `/transactiondetail?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function cancelPakasirTransaction(
  apiKey: string,
  projectSlug: string,
  input: {
    order_id: string;
    amount: number;
  },
) {
  return pakasirFetch<{ message?: string; error?: string }>(
    "/transactioncancel",
    {
      method: "POST",
      body: JSON.stringify({
        project: projectSlug,
        order_id: input.order_id,
        amount: input.amount,
        api_key: apiKey,
      }),
    },
  );
}

export function normalizePakasirStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "completed" || normalized === "paid" || normalized === "success") {
    return "paid" as const;
  }

  if (normalized === "expired") {
    return "expired" as const;
  }

  if (normalized === "failed") {
    return "failed" as const;
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled" as const;
  }

  return "pending" as const;
}

export function parsePakasirAmount(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function getPakasirChannelDefinition(channelCode: string | null | undefined) {
  const normalized = String(channelCode ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    PAKASIR_PRIMARY_CHANNELS.find((channel) => channel.code === normalized) ?? null
  );
}

export function getPakasirChannelDisplayName(channelCode: string | null | undefined) {
  const definition = getPakasirChannelDefinition(channelCode);
  const fallback = String(channelCode ?? "").trim().toUpperCase();
  return definition?.name ?? (fallback || "Pakasir");
}

export function getPakasirChannelGroup(channelCode: string | null | undefined) {
  return getPakasirChannelDefinition(channelCode)?.group ?? PAKASIR_CHANNEL_GROUPS.other;
}

function parsePakasirExpirationDate(dateStr: string | null | undefined): Date | null {
  const normalized = String(dateStr ?? "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function extractPakasirPaymentDetails(
  payload: PakasirCreateTransactionResponse | PakasirTransactionDetailResponse | null | undefined,
  channelCode?: string | null,
) {
  const payment = payload && "payment" in payload ? payload.payment : null;
  const transaction = payload && "transaction" in payload ? payload.transaction : null;
  const definition = getPakasirChannelDefinition(channelCode);
  const paymentMethod = payment?.payment_method ?? transaction?.payment_method ?? channelCode;
  const paymentNumber = payment?.payment_number ?? null;
  const isQris = paymentMethod === "qris" || Boolean(paymentNumber && paymentNumber.startsWith("00020101"));
  const group = isQris
    ? PAKASIR_CHANNEL_GROUPS.qris
    : getPakasirChannelGroup(paymentMethod);

  return {
    group,
    channelName: getPakasirChannelDisplayName(paymentMethod),
    bankName: definition?.bankName ?? null,
    vaNumber: !isQris && paymentNumber ? paymentNumber : null,
    qrString: isQris && paymentNumber ? paymentNumber : null,
    expiresAt: parsePakasirExpirationDate(payment?.expired_at),
  };
}

export function resolvePakasirEnabledChannelCodes(configJson: unknown) {
  const rawEnabledChannels =
    configJson &&
    typeof configJson === "object" &&
    "enabledChannels" in configJson &&
    Array.isArray((configJson as PakasirGatewayConfig).enabledChannels)
      ? (configJson as PakasirGatewayConfig).enabledChannels
      : null;

  const normalized = (rawEnabledChannels ?? PAKASIR_PRIMARY_CHANNELS.map((channel) => channel.code))
    .map((value) => String(value).trim().toLowerCase())
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .filter((value) =>
      PAKASIR_PRIMARY_CHANNELS.some((channel) => channel.code === value),
    );

  if (normalized.length === 0) {
    return PAKASIR_PRIMARY_CHANNELS.map((channel) => channel.code);
  }

  return normalized;
}

export function getPakasirCheckoutChannels(configJson: unknown) {
  const enabledChannelCodes = resolvePakasirEnabledChannelCodes(configJson);

  return PAKASIR_PRIMARY_CHANNELS.filter((channel) =>
    enabledChannelCodes.includes(channel.code),
  );
}
