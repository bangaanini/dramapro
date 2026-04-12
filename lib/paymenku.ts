const PAYMENKU_API_BASE = "https://paymenku.com/api/v1";

export const PAYMENKU_CHANNEL_GROUPS = {
  qris: "qris",
  va: "va",
  ewallet: "ewallet",
  other: "other",
} as const;

export type PaymenkuChannelGroup =
  (typeof PAYMENKU_CHANNEL_GROUPS)[keyof typeof PAYMENKU_CHANNEL_GROUPS];

export type PaymenkuChannelDefinition = {
  code: string;
  name: string;
  group: PaymenkuChannelGroup;
  bankName?: string;
  shortName?: string;
};

export const PAYMENKU_PRIMARY_CHANNELS: PaymenkuChannelDefinition[] = [
  {
    code: "qris",
    name: "QRIS",
    group: PAYMENKU_CHANNEL_GROUPS.qris,
    shortName: "QRIS",
  },
  {
    code: "bni_va",
    name: "BNI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BNI",
    shortName: "BNI",
  },
  {
    code: "bri_va",
    name: "BRI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BRI",
    shortName: "BRI",
  },
  {
    code: "mandiri_va",
    name: "Mandiri Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Mandiri",
    shortName: "Mandiri",
  },
  {
    code: "bsi_va",
    name: "BSI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BSI",
    shortName: "BSI",
  },
  {
    code: "cimb_va",
    name: "CIMB Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "CIMB Niaga",
    shortName: "CIMB",
  },
  {
    code: "permata_va",
    name: "Permata Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Permata",
    shortName: "Permata",
  },
  {
    code: "danamon_va",
    name: "Danamon Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Danamon",
    shortName: "Danamon",
  },
  {
    code: "bjb_va",
    name: "BJB Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BJB",
    shortName: "BJB",
  },
];

export type PaymenkuPaymentChannel = {
  code: string;
  name: string;
  group?: string | null;
  fee?: string | null;
};

export type PaymenkuCreateTransactionInput = {
  reference_id: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  channel_code: string;
  return_url: string;
};

export type PaymenkuCreateTransactionResponse = {
  status: string;
  data?: {
    trx_id: string;
    reference_id: string;
    amount: string;
    status: string;
    pay_url: string;
    payment_info?: {
      transaction_id?: string;
      transaction_status?: string;
      qr_url?: string;
      qr_string?: string;
      bank?: string;
      va_number?: string;
      expiration_date?: string;
    };
  };
  message?: string;
};

export type PaymenkuStatusResponse = {
  status: string;
  data?: {
    trx_id?: string;
    reference_id?: string;
    amount?: string;
    status?: string;
    pay_url?: string;
    payment_info?: {
      transaction_id?: string;
      transaction_status?: string;
      qr_url?: string;
      qr_string?: string;
      bank?: string;
      va_number?: string;
      expiration_date?: string;
    };
  };
  message?: string;
};

async function paymenkuFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${PAYMENKU_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : null;

  if (!response.ok) {
    const detail = extractPaymenkuErrorMessage(
      payload,
      `Paymenku request failed with status ${response.status}.`,
    );
    throw new Error(detail);
  }

  if (!payload) {
    throw new Error("Paymenku returned an empty response.");
  }

  return payload;
}

function extractPaymenkuErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as {
    message?: unknown;
    errors?: Record<string, unknown>;
  };
  const message =
    typeof record.message === "string" && record.message.trim()
      ? record.message.trim()
      : fallback;
  const errorDetails = Object.entries(record.errors ?? {})
    .flatMap(([field, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${field}: ${String(item)}`);
      }

      if (typeof value === "string" && value.trim()) {
        return [`${field}: ${value.trim()}`];
      }

      return [];
    })
    .join(" ");

  return errorDetails ? `${message}. ${errorDetails}` : message;
}

export async function getPaymenkuPaymentChannels() {
  const apiKey = process.env.PAYMENKU_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  const payload = await paymenkuFetch<
    | {
        status?: string;
        data?: Array<{
          code?: string;
          name?: string;
          group?: string | null;
          fee?: string | null;
        }>;
      }
    | Array<{
        code?: string;
        name?: string;
        group?: string | null;
        fee?: string | null;
      }>
  >(apiKey, "/payment-channels", {
    method: "GET",
  });

  const channels = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return channels
    .map((channel) => ({
      code: String(channel.code ?? "").trim(),
      name: String(channel.name ?? "").trim(),
      group: channel.group ?? null,
      fee: channel.fee ?? null,
    }))
    .filter((channel) => channel.code && channel.name);
}

export async function createPaymenkuTransaction(
  apiKey: string,
  input: PaymenkuCreateTransactionInput,
) {
  return paymenkuFetch<PaymenkuCreateTransactionResponse>(
    apiKey,
    "/transaction/create",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function checkPaymenkuTransactionStatus(
  apiKey: string,
  orderIdOrReference: string,
) {
  return paymenkuFetch<PaymenkuStatusResponse>(
    apiKey,
    `/check-status/${encodeURIComponent(orderIdOrReference)}`,
    {
      method: "GET",
    },
  );
}

export function normalizePaymenkuStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (
    normalized === "success" ||
    normalized === "paid" ||
    normalized === "settlement"
  ) {
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

export function parsePaymenkuAmount(value: string | number | null | undefined) {
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

export function getPaymenkuChannelDefinition(channelCode: string | null | undefined) {
  const normalized = String(channelCode ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    PAYMENKU_PRIMARY_CHANNELS.find((channel) => channel.code === normalized) ?? null
  );
}

export function getPaymenkuChannelDisplayName(channelCode: string | null | undefined) {
  const definition = getPaymenkuChannelDefinition(channelCode);
  const fallback = String(channelCode ?? "").trim().toUpperCase();
  return definition?.name ?? (fallback || "Paymenku");
}

export function getPaymenkuChannelGroup(channelCode: string | null | undefined) {
  return getPaymenkuChannelDefinition(channelCode)?.group ?? PAYMENKU_CHANNEL_GROUPS.other;
}

export function extractPaymenkuPaymentDetails(
  payload: PaymenkuCreateTransactionResponse | PaymenkuStatusResponse | null | undefined,
  channelCode?: string | null,
) {
  const info = payload?.data?.payment_info;
  const definition = getPaymenkuChannelDefinition(channelCode);
  const bankName = String(info?.bank ?? definition?.bankName ?? "").trim() || null;
  const vaNumber = String(info?.va_number ?? "").trim() || null;
  const group = vaNumber
    ? PAYMENKU_CHANNEL_GROUPS.va
    : info?.qr_url || info?.qr_string
      ? PAYMENKU_CHANNEL_GROUPS.qris
      : getPaymenkuChannelGroup(channelCode);

  return {
    group,
    channelName:
      bankName && group === PAYMENKU_CHANNEL_GROUPS.va
        ? `${bankName} Virtual Account`
        : getPaymenkuChannelDisplayName(channelCode),
    bankName,
    vaNumber,
    qrUrl: info?.qr_url ?? null,
    qrString: info?.qr_string ?? null,
    expiresAt: info?.expiration_date ? new Date(info.expiration_date) : null,
  };
}
