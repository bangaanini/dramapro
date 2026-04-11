const PAYMENKU_API_BASE = "https://paymenku.com/api/v1";

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
      expiration_date?: string;
    };
  };
  message?: string;
};

function getPaymenkuApiKey() {
  const apiKey = process.env.PAYMENKU_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("PAYMENKU_API_KEY is not configured.");
  }

  return apiKey;
}

async function paymenkuFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${PAYMENKU_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaymenkuApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : null;

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Paymenku request failed with status ${response.status}.`;
    throw new Error(detail);
  }

  if (!payload) {
    throw new Error("Paymenku returned an empty response.");
  }

  return payload;
}

export async function getPaymenkuPaymentChannels() {
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
  >("/payment-channels", {
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
  input: PaymenkuCreateTransactionInput,
) {
  return paymenkuFetch<PaymenkuCreateTransactionResponse>(
    "/transaction/create",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function checkPaymenkuTransactionStatus(orderIdOrReference: string) {
  return paymenkuFetch<PaymenkuStatusResponse>(
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
