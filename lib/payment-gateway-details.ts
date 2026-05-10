import {
  extractDuitkuPaymentDetailsFromPayloads,
  type DuitkuCreateTransactionResponse,
  type DuitkuStatusResponse,
} from "@/lib/duitku";
import {
  extractPaymenkuPaymentDetailsFromPayloads,
  type PaymenkuCreateTransactionResponse,
  type PaymenkuStatusResponse,
} from "@/lib/paymenku";
import type { PaymentGatewayProvider } from "@/lib/payment-gateways";

export function extractGatewayPaymentDetailsFromPayloads(
  provider: PaymentGatewayProvider,
  preferredPayload: unknown,
  fallbackPayload: unknown,
  channelCode?: string | null,
) {
  if (provider === "duitku") {
    return extractDuitkuPaymentDetailsFromPayloads(
      preferredPayload as DuitkuCreateTransactionResponse | DuitkuStatusResponse | null | undefined,
      fallbackPayload as DuitkuCreateTransactionResponse | DuitkuStatusResponse | null | undefined,
      channelCode,
    );
  }

  return extractPaymenkuPaymentDetailsFromPayloads(
    preferredPayload as PaymenkuCreateTransactionResponse | PaymenkuStatusResponse | null | undefined,
    fallbackPayload as PaymenkuCreateTransactionResponse | PaymenkuStatusResponse | null | undefined,
    channelCode,
  );
}
