import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PAYMENT_SECRET_ENV = "PAYMENT_CREDENTIALS_KEY";

function getEncryptionKey() {
  const secret = process.env[PAYMENT_SECRET_ENV]?.trim();

  if (!secret) {
    throw new Error(`${PAYMENT_SECRET_ENV} is not configured.`);
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptPaymentSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export function decryptPaymentSecret(payload: string | null | undefined) {
  if (!payload) {
    return null;
  }

  const parsed = JSON.parse(payload) as {
    iv?: string;
    tag?: string;
    data?: string;
  };

  if (!parsed.iv || !parsed.tag || !parsed.data) {
    throw new Error("Encrypted payment secret payload is invalid.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
