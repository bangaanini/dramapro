#!/usr/bin/env tsx

/**
 * Test Paymenku date parsing
 */

import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const envPath = resolve(process.cwd(), ".env");
const envLocalPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
}

async function main() {
  const { extractPaymenkuPaymentDetails } = await import("@/lib/paymenku");

  console.log("Testing Paymenku date parsing...\n");

  // Test case 1: Format YYYYMMDDHHmmss (dari error report)
  const mockPayload1 = {
    status: "success",
    data: {
      trx_id: "test123",
      reference_id: "ref123",
      amount: "50000",
      status: "pending",
      pay_url: "https://example.com",
      payment_info: {
        qr_url: "https://example.com/qr.png",
        expiration_date: "20260524220046",
      },
    },
  };

  const result1 = extractPaymenkuPaymentDetails(mockPayload1, "qris");
  console.log("Test 1 - Format YYYYMMDDHHmmss:");
  console.log("  Input:", mockPayload1.data.payment_info.expiration_date);
  console.log("  Parsed:", result1.expiresAt);
  console.log("  Valid:", result1.expiresAt instanceof Date && !Number.isNaN(result1.expiresAt.getTime()));
  console.log("  ISO String:", result1.expiresAt?.toISOString());
  console.log();

  // Test case 2: Format ISO (fallback)
  const mockPayload2 = {
    status: "success",
    data: {
      trx_id: "test456",
      reference_id: "ref456",
      amount: "50000",
      status: "pending",
      pay_url: "https://example.com",
      payment_info: {
        qr_url: "https://example.com/qr.png",
        expiration_date: "2026-05-24T22:00:46+07:00",
      },
    },
  };

  const result2 = extractPaymenkuPaymentDetails(mockPayload2, "qris");
  console.log("Test 2 - Format ISO (fallback):");
  console.log("  Input:", mockPayload2.data.payment_info.expiration_date);
  console.log("  Parsed:", result2.expiresAt);
  console.log("  Valid:", result2.expiresAt instanceof Date && !Number.isNaN(result2.expiresAt.getTime()));
  console.log("  ISO String:", result2.expiresAt?.toISOString());
  console.log();

  // Test case 3: Empty/null
  const mockPayload3 = {
    status: "success",
    data: {
      trx_id: "test789",
      reference_id: "ref789",
      amount: "50000",
      status: "pending",
      pay_url: "https://example.com",
      payment_info: {
        qr_url: "https://example.com/qr.png",
      },
    },
  };

  const result3 = extractPaymenkuPaymentDetails(mockPayload3, "qris");
  console.log("Test 3 - No expiration_date:");
  console.log("  Input:", undefined);
  console.log("  Parsed:", result3.expiresAt);
  console.log("  Valid:", result3.expiresAt === null);
  console.log();

  // Verify test 1 matches expected date
  const expectedDate = new Date("2026-05-24T22:00:46+07:00");
  const matches = result1.expiresAt?.getTime() === expectedDate.getTime();
  console.log("Verification:");
  console.log("  Expected:", expectedDate.toISOString());
  console.log("  Got:", result1.expiresAt?.toISOString());
  console.log("  Match:", matches ? "✓" : "✗");

  if (!matches) {
    throw new Error("Date parsing mismatch!");
  }

  console.log("\n✓ All tests passed");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
