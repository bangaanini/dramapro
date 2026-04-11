import {
  checkPaymenkuTransactionStatus,
  createPaymenkuTransaction,
  normalizePaymenkuStatus,
  parsePaymenkuAmount,
} from "@/lib/paymenku";
import {
  type CheckPaymentStatusResult,
  type CreatePaymentTransactionInput,
  type CreatePaymentTransactionResult,
  getActivePaymentGateway,
  listPaymentGatewayConfigs,
  type PaymentGatewayProvider,
  type PaymentGatewayRuntimeConfig,
} from "@/lib/payment-gateways";

async function createPaymenkuCheckout(
  gateway: PaymentGatewayRuntimeConfig,
  input: CreatePaymentTransactionInput,
): Promise<CreatePaymentTransactionResult> {
  const payload = await createPaymenkuTransaction(gateway.secret!, {
    reference_id: input.referenceId,
    amount: input.amount,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    channel_code: input.channelCode,
    return_url: input.returnUrl,
  });

  if (!payload.data?.pay_url) {
    throw new Error(payload.message || "Gateway tidak mengembalikan pay_url.");
  }

  return {
    providerTransactionId: payload.data.trx_id,
    referenceId: payload.data.reference_id,
    amount: parsePaymenkuAmount(payload.data.amount),
    status: normalizePaymenkuStatus(
      payload.data.payment_info?.transaction_status ?? payload.data.status,
    ),
    payUrl: payload.data.pay_url,
    qrUrl: payload.data.payment_info?.qr_url ?? null,
    qrString: payload.data.payment_info?.qr_string ?? null,
    expiresAt: payload.data.payment_info?.expiration_date
      ? new Date(payload.data.payment_info.expiration_date)
      : null,
    providerPayload: payload as unknown as object,
    channelCode: input.channelCode,
    channelName: "QRIS",
  };
}

async function checkPaymenkuCheckoutStatus(
  gateway: PaymentGatewayRuntimeConfig,
  orderIdOrReference: string,
): Promise<CheckPaymentStatusResult> {
  const payload = await checkPaymenkuTransactionStatus(
    gateway.secret!,
    orderIdOrReference,
  );

  return {
    providerTransactionId: payload.data?.trx_id ?? null,
    amount: parsePaymenkuAmount(payload.data?.amount),
    status: normalizePaymenkuStatus(
      payload.data?.payment_info?.transaction_status ?? payload.data?.status,
    ),
    payUrl: payload.data?.pay_url ?? null,
    qrUrl: payload.data?.payment_info?.qr_url ?? null,
    qrString: payload.data?.payment_info?.qr_string ?? null,
    expiresAt: payload.data?.payment_info?.expiration_date
      ? new Date(payload.data.payment_info.expiration_date)
      : null,
    providerPayload: payload as unknown as object,
  };
}

export async function createActiveGatewayTransaction(
  input: CreatePaymentTransactionInput,
) {
  const gateway = await getActivePaymentGateway();

  switch (gateway.provider) {
    case "paymenku":
      return {
        gateway,
        result: await createPaymenkuCheckout(gateway, input),
      };
    default:
      throw new Error(`${gateway.displayName} belum tersedia untuk checkout.`);
  }
}

export async function checkGatewayTransactionStatus(
  provider: PaymentGatewayProvider,
  providerTransactionIdOrReferenceId: string,
) {
  const activeGateway = await getActivePaymentGateway();
  const gateway =
    activeGateway.provider === provider
      ? activeGateway
      : await listPaymentGatewayConfigs().then((configs) => {
          const config = configs.find((item) => item.provider === provider);

          if (!config || !config.secret || !config.capability.implemented) {
            throw new Error("Gateway pembayaran tidak siap dipakai.");
          }

          return config;
        });

  switch (provider) {
    case "paymenku":
      return checkPaymenkuCheckoutStatus(gateway, providerTransactionIdOrReferenceId);
    default:
      throw new Error(`${provider} belum tersedia untuk sinkronisasi status.`);
  }
}
