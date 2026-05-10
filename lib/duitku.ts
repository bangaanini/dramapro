import { createHash, timingSafeEqual } from "node:crypto";

import { PAYMENKU_CHANNEL_GROUPS, type PaymenkuChannelGroup } from "@/lib/paymenku";

const DUITKU_BASE_URLS = {
  sandbox: "https://sandbox.duitku.com/webapi/api/merchant",
  production: "https://passport.duitku.com/webapi/api/merchant",
} as const;

export type DuitkuMode = keyof typeof DUITKU_BASE_URLS;

export type DuitkuGatewayConfig = {
  mode?: DuitkuMode;
  enabledChannels?: string[];
  expiryPeriod?: number;
};

export type DuitkuPaymentChannelDefinition = {
  code: string;
  name: string;
  group: PaymenkuChannelGroup;
  bankName?: string;
  shortName?: string;
};

export const DUITKU_PRIMARY_CHANNELS: DuitkuPaymentChannelDefinition[] = [
  {
    code: "NQ",
    name: "QRIS Nobu",
    group: PAYMENKU_CHANNEL_GROUPS.qris,
    shortName: "QRIS",
  },
  {
    code: "SP",
    name: "QRIS ShopeePay",
    group: PAYMENKU_CHANNEL_GROUPS.qris,
    shortName: "QRIS ShopeePay",
  },
  {
    code: "GQ",
    name: "QRIS Gudang Voucher",
    group: PAYMENKU_CHANNEL_GROUPS.qris,
    shortName: "QRIS GV",
  },
  {
    code: "SQ",
    name: "QRIS Nusapay",
    group: PAYMENKU_CHANNEL_GROUPS.qris,
    shortName: "QRIS Nusapay",
  },
  {
    code: "BC",
    name: "BCA Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BCA",
    shortName: "BCA",
  },
  {
    code: "M2",
    name: "Mandiri Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Mandiri",
    shortName: "Mandiri",
  },
  {
    code: "I1",
    name: "BNI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BNI",
    shortName: "BNI",
  },
  {
    code: "BR",
    name: "BRI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BRI",
    shortName: "BRI",
  },
  {
    code: "BV",
    name: "BSI Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "BSI",
    shortName: "BSI",
  },
  {
    code: "B1",
    name: "CIMB Niaga Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "CIMB Niaga",
    shortName: "CIMB",
  },
  {
    code: "BT",
    name: "Permata Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Permata",
    shortName: "Permata",
  },
  {
    code: "DM",
    name: "Danamon Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Danamon",
    shortName: "Danamon",
  },
  {
    code: "VA",
    name: "Maybank Virtual Account",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Maybank",
    shortName: "Maybank",
  },
  {
    code: "A1",
    name: "ATM Bersama",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "ATM Bersama",
    shortName: "ATM Bersama",
  },
  {
    code: "AG",
    name: "Bank Artha Graha",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Artha Graha",
    shortName: "Artha Graha",
  },
  {
    code: "NC",
    name: "Bank Neo Commerce VA",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Bank Neo Commerce",
    shortName: "BNC",
  },
  {
    code: "S1",
    name: "Bank Sahabat Sampoerna VA",
    group: PAYMENKU_CHANNEL_GROUPS.va,
    bankName: "Sahabat Sampoerna",
    shortName: "Sampoerna",
  },
];

export type DuitkuPaymentMethodResponse = {
  paymentFee?: Array<{
    paymentMethod?: string;
    paymentName?: string;
    paymentImage?: string;
    totalFee?: string;
  }>;
  responseCode?: string;
  responseMessage?: string;
  Message?: string;
};

export type DuitkuCreateTransactionInput = {
  merchantCode: string;
  apiKey: string;
  paymentAmount: number;
  paymentMethod: string;
  merchantOrderId: string;
  productDetails: string;
  customerName: string;
  email: string;
  phoneNumber?: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod?: number;
  configJson?: unknown;
};

export type DuitkuCreateTransactionResponse = {
  merchantCode?: string;
  reference?: string;
  paymentUrl?: string;
  vaNumber?: string;
  qrString?: string;
  AppUrl?: string;
  appUrl?: string;
  amount?: string | number;
  statusCode?: string;
  statusMessage?: string;
  Message?: string;
};

export type DuitkuStatusResponse = {
  merchantOrderId?: string;
  reference?: string;
  amount?: string | number;
  fee?: string | number;
  statusCode?: string;
  statusMessage?: string;
  Message?: string;
};

export type DuitkuCallbackPayload = {
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  productDetail: string;
  additionalParam: string;
  paymentCode: string;
  resultCode: string;
  merchantUserId: string;
  reference: string;
  signature: string;
  publisherOrderId: string;
  spUserHash: string;
  settlementDate: string;
  issuerCode: string;
};

function hashMd5(value: string) {
  return createHash("md5").update(value).digest("hex");
}

function hashSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeJsonParse<T>(text: string): T | null {
  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

async function duitkuFetch<T>(
  configJson: unknown,
  path: string,
  init: RequestInit,
) {
  const mode = resolveDuitkuMode(configJson);
  const response = await fetch(`${DUITKU_BASE_URLS[mode]}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = safeJsonParse<T & { Message?: string }>(text);

  if (!response.ok) {
    const message =
      payload?.Message ||
      `Duitku request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Duitku returned an empty response.");
  }

  return payload;
}

function formatDuitkuDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((accumulator, part) => {
      accumulator[part.type] = part.value;
      return accumulator;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function normalizeAmount(amount: number) {
  return Math.max(0, Math.round(amount));
}

function normalizeCustomerVaName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return (normalized || "Pelanggan VIP").slice(0, 20);
}

export function createDuitkuInquirySignature(input: {
  merchantCode: string;
  merchantOrderId: string;
  paymentAmount: number;
  apiKey: string;
}) {
  return hashMd5(
    `${input.merchantCode}${input.merchantOrderId}${input.paymentAmount}${input.apiKey}`,
  );
}

export function createDuitkuStatusSignature(input: {
  merchantCode: string;
  merchantOrderId: string;
  apiKey: string;
}) {
  return hashMd5(`${input.merchantCode}${input.merchantOrderId}${input.apiKey}`);
}

export function createDuitkuCallbackSignature(input: {
  merchantCode: string;
  amount: string | number;
  merchantOrderId: string;
  apiKey: string;
}) {
  return hashMd5(
    `${input.merchantCode}${input.amount}${input.merchantOrderId}${input.apiKey}`,
  );
}

export function verifyDuitkuCallbackSignature(
  payload: Pick<
    DuitkuCallbackPayload,
    "merchantCode" | "amount" | "merchantOrderId" | "signature"
  >,
  apiKey: string,
) {
  const expected = createDuitkuCallbackSignature({
    merchantCode: payload.merchantCode,
    amount: payload.amount,
    merchantOrderId: payload.merchantOrderId,
    apiKey,
  });
  const actual = payload.signature.trim().toLowerCase();

  if (!actual || actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function createDuitkuPaymentMethodSignature(input: {
  merchantCode: string;
  paymentAmount: number;
  datetime: string;
  apiKey: string;
}) {
  return hashSha256(
    `${input.merchantCode}${input.paymentAmount}${input.datetime}${input.apiKey}`,
  );
}

export function resolveDuitkuMode(configJson: unknown): DuitkuMode {
  const mode =
    configJson &&
    typeof configJson === "object" &&
    "mode" in configJson &&
    (configJson as DuitkuGatewayConfig).mode === "production"
      ? "production"
      : "sandbox";

  return mode;
}

export function normalizeDuitkuChannelCode(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export function getDuitkuChannelDefinition(
  channelCode: string | null | undefined,
) {
  const normalized = normalizeDuitkuChannelCode(channelCode);

  if (!normalized) {
    return null;
  }

  return DUITKU_PRIMARY_CHANNELS.find((channel) => channel.code === normalized) ?? null;
}

export function getDuitkuChannelGroup(channelCode: string | null | undefined) {
  return getDuitkuChannelDefinition(channelCode)?.group ?? PAYMENKU_CHANNEL_GROUPS.other;
}

export function resolveDuitkuEnabledChannelCodes(configJson: unknown) {
  const rawEnabledChannels =
    configJson &&
    typeof configJson === "object" &&
    "enabledChannels" in configJson &&
    Array.isArray((configJson as DuitkuGatewayConfig).enabledChannels)
      ? (configJson as DuitkuGatewayConfig).enabledChannels
      : null;

  const normalized = (rawEnabledChannels ?? DUITKU_PRIMARY_CHANNELS.map((channel) => channel.code))
    .map((value) => normalizeDuitkuChannelCode(value))
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .filter((value) =>
      DUITKU_PRIMARY_CHANNELS.some((channel) => channel.code === value),
    );

  if (normalized.length === 0) {
    return DUITKU_PRIMARY_CHANNELS.map((channel) => channel.code);
  }

  return normalized;
}

export function getDuitkuCheckoutChannels(configJson: unknown) {
  const enabledChannelCodes = resolveDuitkuEnabledChannelCodes(configJson);

  return DUITKU_PRIMARY_CHANNELS.filter((channel) =>
    enabledChannelCodes.includes(channel.code),
  );
}

function getDuitkuDefaultExpiryPeriod(channelCode: string) {
  const normalized = normalizeDuitkuChannelCode(channelCode);

  if (normalized === "NQ") {
    return 24;
  }

  if (getDuitkuChannelGroup(normalized) === PAYMENKU_CHANNEL_GROUPS.qris) {
    return 10;
  }

  return 1440;
}

export function resolveDuitkuExpiryPeriod(
  configJson: unknown,
  channelCode: string,
) {
  const configured =
    configJson &&
    typeof configJson === "object" &&
    typeof (configJson as DuitkuGatewayConfig).expiryPeriod === "number"
      ? Math.floor((configJson as DuitkuGatewayConfig).expiryPeriod!)
      : null;

  if (configured && configured > 0) {
    return configured;
  }

  return getDuitkuDefaultExpiryPeriod(channelCode);
}

export async function getDuitkuPaymentMethods(input: {
  merchantCode: string;
  apiKey: string;
  amount: number;
  configJson?: unknown;
}) {
  const paymentAmount = normalizeAmount(input.amount);
  const datetime = formatDuitkuDateTime(new Date());
  const signature = createDuitkuPaymentMethodSignature({
    merchantCode: input.merchantCode,
    paymentAmount,
    datetime,
    apiKey: input.apiKey,
  });

  return duitkuFetch<DuitkuPaymentMethodResponse>(
    input.configJson,
    "/paymentmethod/getpaymentmethod",
    {
      method: "POST",
      body: JSON.stringify({
        merchantcode: input.merchantCode,
        amount: paymentAmount,
        datetime,
        signature,
      }),
    },
  );
}

export async function createDuitkuTransaction(
  input: DuitkuCreateTransactionInput,
) {
  const paymentAmount = normalizeAmount(input.paymentAmount);
  const paymentMethod = normalizeDuitkuChannelCode(input.paymentMethod);
  const expiryPeriod = input.expiryPeriod ?? resolveDuitkuExpiryPeriod(
    input.configJson,
    paymentMethod,
  );
  const signature = createDuitkuInquirySignature({
    merchantCode: input.merchantCode,
    merchantOrderId: input.merchantOrderId,
    paymentAmount,
    apiKey: input.apiKey,
  });
  const customerVaName = normalizeCustomerVaName(input.customerName);

  return duitkuFetch<DuitkuCreateTransactionResponse>(
    input.configJson,
    "/v2/inquiry",
    {
      method: "POST",
      body: JSON.stringify({
        merchantCode: input.merchantCode,
        paymentAmount,
        paymentMethod,
        merchantOrderId: input.merchantOrderId,
        productDetails: input.productDetails,
        additionalParam: "",
        merchantUserInfo: input.email,
        customerVaName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        itemDetails: [
          {
            name: input.productDetails.slice(0, 255),
            price: paymentAmount,
            quantity: 1,
          },
        ],
        customerDetail: {
          firstName: customerVaName,
          email: input.email,
          phoneNumber: input.phoneNumber,
        },
        callbackUrl: input.callbackUrl,
        returnUrl: input.returnUrl,
        signature,
        expiryPeriod,
      }),
    },
  );
}

export async function checkDuitkuTransactionStatus(input: {
  merchantCode: string;
  apiKey: string;
  merchantOrderId: string;
  configJson?: unknown;
}) {
  const signature = createDuitkuStatusSignature({
    merchantCode: input.merchantCode,
    merchantOrderId: input.merchantOrderId,
    apiKey: input.apiKey,
  });

  return duitkuFetch<DuitkuStatusResponse>(
    input.configJson,
    "/transactionStatus",
    {
      method: "POST",
      body: JSON.stringify({
        merchantCode: input.merchantCode,
        merchantOrderId: input.merchantOrderId,
        signature,
      }),
    },
  );
}

export function normalizeDuitkuStatus(
  statusCode: string | null | undefined,
  pendingFallback = false,
) {
  const normalized = String(statusCode ?? "").trim();

  if (normalized === "00") {
    return pendingFallback ? ("pending" as const) : ("paid" as const);
  }

  if (normalized === "01") {
    return "pending" as const;
  }

  if (normalized === "02") {
    return "cancelled" as const;
  }

  return "pending" as const;
}

export function normalizeDuitkuCallbackStatus(
  resultCode: string | null | undefined,
) {
  const normalized = String(resultCode ?? "").trim();

  if (normalized === "00") {
    return "paid" as const;
  }

  if (normalized === "01") {
    return "failed" as const;
  }

  if (normalized === "02") {
    return "cancelled" as const;
  }

  return "pending" as const;
}

export function parseDuitkuAmount(value: string | number | null | undefined) {
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

export function extractDuitkuPaymentDetails(
  payload: DuitkuCreateTransactionResponse | DuitkuStatusResponse | null | undefined,
  channelCode?: string | null,
) {
  const definition = getDuitkuChannelDefinition(channelCode);
  const vaNumber =
    "vaNumber" in (payload ?? {})
      ? String((payload as DuitkuCreateTransactionResponse)?.vaNumber ?? "").trim() || null
      : null;
  const qrString =
    "qrString" in (payload ?? {})
      ? String((payload as DuitkuCreateTransactionResponse)?.qrString ?? "").trim() || null
      : null;
  const group = vaNumber
    ? PAYMENKU_CHANNEL_GROUPS.va
    : qrString
      ? PAYMENKU_CHANNEL_GROUPS.qris
      : definition?.group ?? PAYMENKU_CHANNEL_GROUPS.other;

  return {
    group,
    channelName:
      definition?.name ?? (normalizeDuitkuChannelCode(channelCode) || "Duitku"),
    bankName:
      group === PAYMENKU_CHANNEL_GROUPS.va
        ? definition?.bankName ?? definition?.shortName ?? null
        : null,
    vaNumber,
    qrUrl: null,
    qrString,
    expiresAt: null,
    appUrl:
      "AppUrl" in (payload ?? {}) || "appUrl" in (payload ?? {})
        ? (payload as DuitkuCreateTransactionResponse).AppUrl ??
          (payload as DuitkuCreateTransactionResponse).appUrl ??
          null
        : null,
  };
}

export function extractDuitkuPaymentDetailsFromPayloads(
  preferredPayload: DuitkuCreateTransactionResponse | DuitkuStatusResponse | null | undefined,
  fallbackPayload: DuitkuCreateTransactionResponse | DuitkuStatusResponse | null | undefined,
  channelCode?: string | null,
) {
  const preferred = extractDuitkuPaymentDetails(preferredPayload, channelCode);
  const fallback = extractDuitkuPaymentDetails(fallbackPayload, channelCode);

  return {
    group: preferred.group ?? fallback.group,
    channelName: preferred.channelName || fallback.channelName,
    bankName: preferred.bankName ?? fallback.bankName,
    vaNumber: preferred.vaNumber ?? fallback.vaNumber,
    qrUrl: preferred.qrUrl ?? fallback.qrUrl,
    qrString: preferred.qrString ?? fallback.qrString,
    expiresAt: preferred.expiresAt ?? fallback.expiresAt,
  };
}

export function parseDuitkuCallbackPayload(formData: FormData) {
  const read = (key: string) => String(formData.get(key) ?? "").trim();

  return {
    merchantCode: read("merchantCode"),
    amount: read("amount"),
    merchantOrderId: read("merchantOrderId"),
    productDetail: read("productDetail"),
    additionalParam: read("additionalParam"),
    paymentCode: read("paymentCode"),
    resultCode: read("resultCode"),
    merchantUserId: read("merchantUserId"),
    reference: read("reference"),
    signature: read("signature"),
    publisherOrderId: read("publisherOrderId"),
    spUserHash: read("spUserHash"),
    settlementDate: read("settlementDate"),
    issuerCode: read("issuerCode"),
  } satisfies DuitkuCallbackPayload;
}
